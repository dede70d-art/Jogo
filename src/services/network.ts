/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Peer, DataConnection } from 'peerjs';
import { ClientMessage, ServerMessage, SpinEvent } from '../types';
import {
  addBot,
  castVote,
  checkAllVotes,
  createRoom,
  generateRoomCode,
  InternalRoom,
  joinRoom,
  nextRound,
  nextTurn,
  proceedToVoting,
  removePlayer,
  resetToLobby,
  sanitizeRoomForPlayer,
  setPlayerReady,
  simulateBotVotes,
  spinRoulette,
  startGame,
  updateSettings,
} from '../game/roomEngine';

export type NetworkMode = 'websocket' | 'p2p';

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (connected: boolean, mode: NetworkMode) => void;

class NetworkManager {
  private mode: NetworkMode = 'websocket';
  private ws: WebSocket | null = null;
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private hostConnection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  private onMessage: MessageHandler = () => {};
  private onStatusChange: StatusHandler = () => {};

  // Host state if this client is hosting in P2P mode
  private hostRoom: InternalRoom | null = null;
  private myPlayerId: string | null = null;
  private currentRoomCode: string | null = null;

  private isConnected = false;
  private hasFallbackToP2P = false;

  public init(onMessage: MessageHandler, onStatusChange: StatusHandler) {
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;

    // Detect if we are on Vercel or static host without backend
    const isVercel =
      typeof window !== 'undefined' &&
      (window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('netlify.app') ||
        window.location.hostname.includes('github.io'));

    if (isVercel) {
      // Jump directly to P2P mode on Vercel to avoid WebSocket connection timeout/errors
      this.switchToP2P();
    } else {
      this.tryWebSocket();
    }
  }

  private tryWebSocket() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('[Network] WebSocket timeout, switching to P2P mode');
          ws.close();
          this.switchToP2P();
        }
      }, 1500);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.mode = 'websocket';
        this.isConnected = true;
        this.onStatusChange(true, 'websocket');

        // Check for stored reconnection
        const storedCode = localStorage.getItem('impostor_room_code');
        const storedPlayerId = localStorage.getItem('impostor_player_id');
        if (storedCode && storedPlayerId) {
          this.send({
            type: 'RECONNECT',
            roomCode: storedCode,
            playerId: storedPlayerId,
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.onMessage(msg);
        } catch (e) {
          console.error('[Network] Parse error', e);
        }
      };

      ws.onerror = () => {
        if (!this.isConnected && !this.hasFallbackToP2P) {
          clearTimeout(timeout);
          this.switchToP2P();
        }
      };

      ws.onclose = () => {
        if (this.mode === 'websocket') {
          this.isConnected = false;
          this.onStatusChange(false, 'websocket');
          // If WS closed immediately, try P2P fallback
          if (!this.hasFallbackToP2P) {
            setTimeout(() => this.switchToP2P(), 1000);
          }
        }
      };
    } catch {
      this.switchToP2P();
    }
  }

  private switchToP2P() {
    this.hasFallbackToP2P = true;
    this.mode = 'p2p';
    this.isConnected = true;
    this.onStatusChange(true, 'p2p');
    console.log('[Network] Running in P2P browser engine mode (Vercel-ready)');
  }

  public send(msg: ClientMessage) {
    if (this.mode === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return;
    }

    // P2P Mode handling
    this.handleClientMessageP2P(msg);
  }

  // ==========================================
  // P2P / Browser-Engine Multiplayer Logic
  // ==========================================

  private setupBroadcastChannel(code: string) {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel(`impostor_room_${code}`);
      this.broadcastChannel.onmessage = (evt) => {
        const data = evt.data;
        if (data && data._p2pMsg) {
          if (data.isServerBroadcast) {
            // Client received broadcast
            this.handleP2PServerMessage(data.msg);
          } else if (this.hostRoom && this.hostRoom.code === code) {
            // Host received client message from another tab
            this.handleHostProcessMessage(data.msg, data.senderId, (resp) => {
              this.broadcastChannel?.postMessage({
                _p2pMsg: true,
                isServerBroadcast: true,
                msg: resp,
              });
            });
          }
        }
      };
    }
  }

  private handleClientMessageP2P(msg: ClientMessage) {
    switch (msg.type) {
      case 'CREATE_ROOM': {
        const code = generateRoomCode();
        const { room, hostPlayer } = createRoom(code, msg.playerName, msg.avatarColor);
        this.hostRoom = room;
        this.myPlayerId = hostPlayer.id;
        this.currentRoomCode = code;

        this.setupBroadcastChannel(code);
        this.initHostPeer(code);

        // Send local room state to host
        const sanitized = sanitizeRoomForPlayer(room, hostPlayer.id);
        this.onMessage({
          type: 'ROOM_STATE',
          room: sanitized,
          yourId: hostPlayer.id,
        });
        break;
      }

      case 'JOIN_ROOM': {
        const code = msg.roomCode.trim().toUpperCase();
        this.currentRoomCode = code;
        this.setupBroadcastChannel(code);

        // First check if host is in another tab via BroadcastChannel
        let joinedViaTab = false;
        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({
            _p2pMsg: true,
            isServerBroadcast: false,
            msg,
            senderId: 'client_tab',
          });
          joinedViaTab = true;
        }

        // Also connect via PeerJS for remote peers (different devices/IPs)
        this.connectToHostPeer(code, msg);
        break;
      }

      default: {
        // Actions during game: if I am the host, process locally
        if (this.hostRoom && this.currentRoomCode) {
          this.handleHostProcessMessage(msg, this.myPlayerId || '', (resp) => {
            this.onMessage(resp);
          });
        } else {
          // If I am a client player, send to host via Peer or BroadcastChannel
          if (this.hostConnection && this.hostConnection.open) {
            this.hostConnection.send({
              _p2pMsg: true,
              isServerBroadcast: false,
              msg,
              senderId: this.myPlayerId,
            });
          }
          if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({
              _p2pMsg: true,
              isServerBroadcast: false,
              msg,
              senderId: this.myPlayerId,
            });
          }
        }
        break;
      }
    }
  }

  private initHostPeer(code: string) {
    try {
      // Peer ID namespaced for this game room
      const peerId = `impostor-game-room-${code}`;
      const peer = new Peer(peerId, {
        debug: 0,
      });
      this.peer = peer;

      peer.on('open', () => {
        console.log('[P2P] Host Peer registered on room:', peerId);
      });

      peer.on('connection', (conn) => {
        this.connections.set(conn.peer, conn);

        conn.on('data', (raw: any) => {
          if (raw && raw._p2pMsg && raw.msg) {
            this.handleHostProcessMessage(raw.msg, raw.senderId, (response) => {
              conn.send({
                _p2pMsg: true,
                isServerBroadcast: true,
                msg: response,
              });
            });
          }
        });

        conn.on('close', () => {
          this.connections.delete(conn.peer);
        });
      });

      peer.on('error', (err) => {
        console.log('[P2P] Peer Notice:', err.type);
      });
    } catch (e) {
      console.warn('[P2P] PeerJS init error:', e);
    }
  }

  private connectToHostPeer(code: string, joinMsg: ClientMessage) {
    try {
      const clientPeer = new Peer({
        debug: 0,
      });
      this.peer = clientPeer;

      clientPeer.on('open', () => {
        const hostPeerId = `impostor-game-room-${code}`;
        const conn = clientPeer.connect(hostPeerId, { reliable: true });
        this.hostConnection = conn;

        conn.on('open', () => {
          console.log('[P2P] Connected to Host Peer:', hostPeerId);
          conn.send({
            _p2pMsg: true,
            isServerBroadcast: false,
            msg: joinMsg,
          });
        });

        conn.on('data', (raw: any) => {
          if (raw && raw._p2pMsg && raw.msg) {
            this.handleP2PServerMessage(raw.msg);
          }
        });

        conn.on('error', (err) => {
          console.log('[P2P] Client Conn error:', err);
        });
      });

      clientPeer.on('error', (err) => {
        console.log('[P2P] Client Peer notice:', err.type);
      });
    } catch (e) {
      console.warn('[P2P] Client peer connect failed:', e);
    }
  }

  private handleP2PServerMessage(msg: ServerMessage) {
    if (msg.type === 'ROOM_STATE') {
      // If this message belongs to my current player or is general
      if (!this.myPlayerId || msg.yourId === this.myPlayerId) {
        this.myPlayerId = msg.yourId;
      }
    }
    this.onMessage(msg);
  }

  private broadcastToAllP2P(callback: (playerId: string) => ServerMessage) {
    if (!this.hostRoom) return;

    for (const player of this.hostRoom.players) {
      const msg = callback(player.id);
      if (player.id === this.myPlayerId) {
        this.onMessage(msg);
      }
    }

    // Broadcast across PeerJS connections and BroadcastChannel
    for (const [, conn] of this.connections) {
      if (conn.open) {
        // Send state
        const sampleMsg = callback('remote_peer');
        conn.send({
          _p2pMsg: true,
          isServerBroadcast: true,
          msg: sampleMsg,
        });
      }
    }

    if (this.broadcastChannel) {
      const sampleMsg = callback('channel_peer');
      this.broadcastChannel.postMessage({
        _p2pMsg: true,
        isServerBroadcast: true,
        msg: sampleMsg,
      });
    }
  }

  private broadcastSpinP2P(spin: SpinEvent) {
    const spinMsg: ServerMessage = { type: 'SPIN_START', spin };
    this.onMessage(spinMsg);

    for (const [, conn] of this.connections) {
      if (conn.open) {
        conn.send({ _p2pMsg: true, isServerBroadcast: true, msg: spinMsg });
      }
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        _p2pMsg: true,
        isServerBroadcast: true,
        msg: spinMsg,
      });
    }
  }

  private broadcastRoomStateP2P() {
    if (!this.hostRoom) return;
    this.broadcastToAllP2P((playerId) => {
      const sanitized = sanitizeRoomForPlayer(this.hostRoom!, playerId);
      return {
        type: 'ROOM_STATE',
        room: sanitized,
        yourId: playerId,
      };
    });
  }

  private handleHostProcessMessage(
    msg: ClientMessage,
    senderId: string,
    respondDirectly: (msg: ServerMessage) => void
  ) {
    const room = this.hostRoom;
    if (!room) return;

    switch (msg.type) {
      case 'JOIN_ROOM': {
        const result = joinRoom(room, msg.playerName, msg.avatarColor);
        if (!result.success || !result.player) {
          respondDirectly({
            type: 'ERROR',
            message: result.error || 'Erro ao entrar na sala.',
          });
          return;
        }

        const newPlayerId = result.player.id;
        // Broadcast new state to all
        this.broadcastRoomStateP2P();
        break;
      }

      case 'ADD_BOT': {
        addBot(room);
        this.broadcastRoomStateP2P();
        break;
      }

      case 'REMOVE_PLAYER': {
        removePlayer(room, msg.targetPlayerId);
        this.broadcastRoomStateP2P();
        break;
      }

      case 'UPDATE_SETTINGS': {
        updateSettings(room, msg.category, msg.impostorCount);
        this.broadcastRoomStateP2P();
        break;
      }

      case 'START_GAME': {
        startGame(room);
        this.broadcastRoomStateP2P();
        break;
      }

      case 'PLAYER_READY': {
        const pId = senderId || this.myPlayerId;
        if (pId) {
          setPlayerReady(room, pId);
          this.broadcastRoomStateP2P();
        }
        break;
      }

      case 'SPIN_ROULETTE': {
        const spin = spinRoulette(room);
        this.broadcastSpinP2P(spin);
        setTimeout(() => {
          if (room.phase === 'ROULETTE') {
            this.broadcastRoomStateP2P();
          }
        }, spin.durationMs + 200);
        break;
      }

      case 'NEXT_TURN': {
        nextTurn(room, msg.speakerId);
        this.broadcastRoomStateP2P();
        break;
      }

      case 'PROCEED_TO_VOTING': {
        proceedToVoting(room);
        this.broadcastRoomStateP2P();

        // Simulate bot votes
        setTimeout(() => {
          if (room.phase === 'VOTING') {
            simulateBotVotes(room);
            checkAllVotes(room);
            this.broadcastRoomStateP2P();
          }
        }, 1200);
        break;
      }

      case 'CAST_VOTE': {
        const voterId = senderId || this.myPlayerId;
        if (voterId) {
          castVote(room, voterId, msg.targetPlayerId);
          checkAllVotes(room);
          this.broadcastRoomStateP2P();
        }
        break;
      }

      case 'NEXT_ROUND': {
        nextRound(room);
        this.broadcastRoomStateP2P();
        break;
      }

      case 'RESET_TO_LOBBY': {
        resetToLobby(room);
        this.broadcastRoomStateP2P();
        break;
      }
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.connections.clear();
    this.hostConnection = null;
    this.hostRoom = null;
  }
}

export const network = new NetworkManager();
