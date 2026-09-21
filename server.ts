import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  Category,
  ClientMessage,
  GamePhase,
  Player,
  RoomState,
  ServerMessage,
  SpinEvent,
} from './src/types';
import { getRandomWordPair } from './src/data/wordBank';

interface ServerPlayer extends Player {
  ws?: WebSocket;
  lastActive: number;
}

interface ServerRoom {
  code: string;
  hostId: string;
  phase: GamePhase;
  players: ServerPlayer[];
  category: Category;
  impostorCount: number;
  roundNumber: number;
  currentWordPair?: {
    civil: string;
    impostor: string;
    category: string;
  };
  activeSpeakerId?: string;
  lastSpin?: SpinEvent;
  turnHistory: string[];
  votingResults?: RoomState['votingResults'];
}

const AVATAR_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#84CC16', // Lime
];

const BOT_NAMES = [
  'Bot Astronauta',
  'Bot Detetive',
  'Bot Ninja',
  'Bot Fantasma',
  'Bot Pirata',
  'Bot Alien',
];

const rooms = new Map<string, ServerRoom>();

function generateRoomCode(): string {
  let code = '';
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

function sanitizeRoomForPlayer(room: ServerRoom, playerId: string): RoomState {
  const isReveal = room.phase === 'REVEAL';

  const sanitizedPlayers: Player[] = room.players.map((p) => {
    const isSelf = p.id === playerId;
    return {
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      isBot: p.isBot,
      avatarColor: p.avatarColor,
      score: p.score,
      isReady: p.isReady,
      role: isReveal || isSelf ? p.role : undefined,
      word: isReveal || isSelf ? p.word : undefined,
      votedFor: isReveal || isSelf ? p.votedFor : p.votedFor ? 'HIDDEN' : undefined,
      hasGivenHint: p.hasGivenHint,
    };
  });

  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    players: sanitizedPlayers,
    category: room.category,
    impostorCount: room.impostorCount,
    roundNumber: room.roundNumber,
    currentWordPair: isReveal ? room.currentWordPair : undefined,
    activeSpeakerId: room.activeSpeakerId,
    lastSpin: room.lastSpin,
    turnHistory: room.turnHistory,
    votingResults: room.votingResults,
  };
}

function broadcastRoom(room: ServerRoom) {
  for (const player of room.players) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      const sanitized = sanitizeRoomForPlayer(room, player.id);
      const msg: ServerMessage = {
        type: 'ROOM_STATE',
        room: sanitized,
        yourId: player.id,
      };
      player.ws.send(JSON.stringify(msg));
    }
  }
}

function broadcastSpin(room: ServerRoom, spin: SpinEvent) {
  for (const player of room.players) {
    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      const msg: ServerMessage = {
        type: 'SPIN_START',
        spin,
      };
      player.ws.send(JSON.stringify(msg));
    }
  }
}

function handleStartGame(room: ServerRoom) {
  if (room.players.length < 3) return;

  const wordPair = getRandomWordPair(room.category);
  room.currentWordPair = wordPair;
  room.phase = 'SECRET_CARD';
  room.turnHistory = [];
  room.activeSpeakerId = undefined;
  room.lastSpin = undefined;
  room.votingResults = undefined;

  // Assign impostor(s)
  const actualImpostorCount = Math.min(room.impostorCount, Math.floor((room.players.length - 1) / 2) || 1);
  const shuffledIndices = room.players.map((_, i) => i).sort(() => Math.random() - 0.5);
  const impostorIndices = new Set(shuffledIndices.slice(0, actualImpostorCount));

  room.players.forEach((player, idx) => {
    player.isReady = player.isBot ? true : false;
    player.votedFor = undefined;
    player.hasGivenHint = false;
    if (impostorIndices.has(idx)) {
      player.role = 'IMPOSTOR';
      player.word = wordPair.impostor;
    } else {
      player.role = 'CIVIL';
      player.word = wordPair.civil;
    }
  });

  broadcastRoom(room);
}

function handleSpinRoulette(room: ServerRoom) {
  const eligiblePlayers = room.players.filter((p) => !room.turnHistory.includes(p.id));
  const pool = eligiblePlayers.length > 0 ? eligiblePlayers : room.players;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  // Calculate target slice angle
  const totalPlayers = room.players.length;
  const sliceAngle = 360 / totalPlayers;
  const chosenIndex = room.players.findIndex((p) => p.id === chosen.id);

  // Wheel pointer is at top (270 deg or 90 deg depending on canvas orientation)
  // Let's align pointer at TOP (270 deg / -90 deg):
  // When slice center reaches top pointer:
  // Rotation % 360 = (360 - (chosenIndex * sliceAngle + sliceAngle / 2)) % 360
  const sliceCenter = chosenIndex * sliceAngle + sliceAngle / 2;
  const targetOffset = (360 - sliceCenter + 270) % 360;

  // Add 4-7 full 360 rotations for excitement + target offset
  const fullSpins = (4 + Math.floor(Math.random() * 3)) * 360;
  const currentAngle = room.lastSpin ? room.lastSpin.finalAngle % 360 : 0;
  const finalAngle = currentAngle + fullSpins + ((targetOffset - currentAngle + 360) % 360);

  const durationMs = 4200;
  const spin: SpinEvent = {
    targetPlayerId: chosen.id,
    targetPlayerName: chosen.name,
    startAngle: currentAngle,
    finalAngle,
    durationMs,
    timestamp: Date.now(),
  };

  room.lastSpin = spin;
  room.activeSpeakerId = chosen.id;

  broadcastSpin(room, spin);

  // After spin finishes, update room state
  setTimeout(() => {
    if (room.phase === 'ROULETTE') {
      broadcastRoom(room);
    }
  }, durationMs + 200);
}

function checkAllVotes(room: ServerRoom) {
  const allVoted = room.players.every((p) => Boolean(p.votedFor));
  if (!allVoted) return;

  // Calculate results
  const tallies: Record<string, number> = {};
  room.players.forEach((p) => {
    tallies[p.id] = 0;
  });

  room.players.forEach((p) => {
    if (p.votedFor && tallies[p.votedFor] !== undefined) {
      tallies[p.votedFor] = (tallies[p.votedFor] || 0) + 1;
    }
  });

  let maxVotes = -1;
  let mostVotedId: string | null = null;
  let isTie = false;

  for (const [id, count] of Object.entries(tallies)) {
    if (count > maxVotes) {
      maxVotes = count;
      mostVotedId = id;
      isTie = false;
    } else if (count === maxVotes && maxVotes > 0) {
      isTie = true;
    }
  }

  const impostorPlayers = room.players.filter((p) => p.role === 'IMPOSTOR');
  const impostorIds = new Set(impostorPlayers.map((p) => p.id));
  const caught: string[] = [];
  const survived: string[] = [];

  if (!isTie && mostVotedId && impostorIds.has(mostVotedId)) {
    caught.push(mostVotedId);
  }

  impostorPlayers.forEach((imp) => {
    if (!caught.includes(imp.id)) {
      survived.push(imp.id);
    }
  });

  // Calculate scores:
  // If impostor was caught:
  // Each civil who voted for the caught impostor gets 150 points.
  // All other civils get 50 points.
  // If impostor survived:
  // Surviving impostor gets 200 points.
  room.players.forEach((p) => {
    if (p.role === 'CIVIL') {
      if (caught.length > 0) {
        if (p.votedFor && impostorIds.has(p.votedFor)) {
          p.score += 150;
        } else {
          p.score += 50;
        }
      }
    } else if (p.role === 'IMPOSTOR') {
      if (survived.includes(p.id)) {
        p.score += 200;
      }
    }
  });

  room.votingResults = {
    tallies,
    mostVotedId: isTie ? null : mostVotedId,
    isTie,
    impostorsCaught: caught,
    impostorsSurvived: survived,
    civilWord: room.currentWordPair?.civil || '',
    impostorWord: room.currentWordPair?.impostor || '',
  };

  room.phase = 'REVEAL';
  broadcastRoom(room);
}

function simulateBotVotes(room: ServerRoom) {
  room.players
    .filter((p) => p.isBot && !p.votedFor)
    .forEach((bot) => {
      // Pick random other player
      const candidates = room.players.filter((p) => p.id !== bot.id);
      if (candidates.length > 0) {
        const choice = candidates[Math.floor(Math.random() * candidates.length)];
        bot.votedFor = choice.id;
      }
    });
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', roomsCount: rooms.size });
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (rawData) => {
      try {
        const data: ClientMessage = JSON.parse(rawData.toString());

        switch (data.type) {
          case 'CREATE_ROOM': {
            const code = generateRoomCode();
            const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
            const player: ServerPlayer = {
              id: playerId,
              name: data.playerName.trim().slice(0, 16) || 'Jogador 1',
              isHost: true,
              avatarColor: data.avatarColor || AVATAR_COLORS[0],
              score: 0,
              lastActive: Date.now(),
              ws,
            };

            const newRoom: ServerRoom = {
              code,
              hostId: playerId,
              phase: 'LOBBY',
              players: [player],
              category: 'Aleatório',
              impostorCount: 1,
              roundNumber: 1,
              turnHistory: [],
            };

            rooms.set(code, newRoom);
            currentRoomCode = code;
            currentPlayerId = playerId;

            const sanitized = sanitizeRoomForPlayer(newRoom, playerId);
            ws.send(JSON.stringify({ type: 'ROOM_STATE', room: sanitized, yourId: playerId }));
            break;
          }

          case 'JOIN_ROOM': {
            const code = data.roomCode.trim().toUpperCase();
            const room = rooms.get(code);

            if (!room) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Sala não encontrada. Verifique o código!' }));
              return;
            }

            if (room.phase !== 'LOBBY') {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'A partida já está em andamento nesta sala!' }));
              return;
            }

            if (room.players.length >= 10) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'A sala atingiu o limite máximo de 10 jogadores!' }));
              return;
            }

            const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
            const colorIndex = room.players.length % AVATAR_COLORS.length;
            const player: ServerPlayer = {
              id: playerId,
              name: data.playerName.trim().slice(0, 16) || `Jogador ${room.players.length + 1}`,
              isHost: false,
              avatarColor: data.avatarColor || AVATAR_COLORS[colorIndex],
              score: 0,
              lastActive: Date.now(),
              ws,
            };

            room.players.push(player);
            currentRoomCode = code;
            currentPlayerId = playerId;

            broadcastRoom(room);
            break;
          }

          case 'RECONNECT': {
            const code = data.roomCode.trim().toUpperCase();
            const room = rooms.get(code);
            if (!room) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Sessão expirada ou sala encerrada.' }));
              return;
            }

            const player = room.players.find((p) => p.id === data.playerId);
            if (!player) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Jogador não encontrado na sala.' }));
              return;
            }

            player.ws = ws;
            player.lastActive = Date.now();
            currentRoomCode = code;
            currentPlayerId = player.id;

            const sanitized = sanitizeRoomForPlayer(room, player.id);
            ws.send(JSON.stringify({ type: 'ROOM_STATE', room: sanitized, yourId: player.id }));
            break;
          }

          case 'ADD_BOT': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room || room.hostId !== currentPlayerId || room.players.length >= 10) return;

            const botCount = room.players.filter((p) => p.isBot).length;
            const botName = BOT_NAMES[botCount % BOT_NAMES.length] || `Bot ${botCount + 1}`;
            const colorIndex = room.players.length % AVATAR_COLORS.length;

            const botPlayer: ServerPlayer = {
              id: 'bot_' + Math.random().toString(36).substring(2, 9),
              name: botName,
              isHost: false,
              isBot: true,
              avatarColor: AVATAR_COLORS[colorIndex],
              score: 0,
              lastActive: Date.now(),
            };

            room.players.push(botPlayer);
            broadcastRoom(room);
            break;
          }

          case 'REMOVE_PLAYER': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room || room.hostId !== currentPlayerId) return;

            room.players = room.players.filter((p) => p.id !== data.targetPlayerId);
            broadcastRoom(room);
            break;
          }

          case 'UPDATE_SETTINGS': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room || room.hostId !== currentPlayerId) return;

            room.category = data.category;
            room.impostorCount = Math.max(1, Math.min(data.impostorCount, 3));
            broadcastRoom(room);
            break;
          }

          case 'START_GAME': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room || room.hostId !== currentPlayerId) return;

            handleStartGame(room);
            break;
          }

          case 'PLAYER_READY': {
            if (!currentRoomCode || !currentPlayerId) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            const player = room.players.find((p) => p.id === currentPlayerId);
            if (player) {
              player.isReady = true;
            }

            // If all players (human + bot) are ready, move to ROULETTE phase
            const allReady = room.players.every((p) => p.isReady);
            if (allReady) {
              room.phase = 'ROULETTE';
            }

            broadcastRoom(room);
            break;
          }

          case 'SPIN_ROULETTE': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room || room.phase !== 'ROULETTE') return;

            handleSpinRoulette(room);
            break;
          }

          case 'NEXT_TURN': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            const speakerId = data.speakerId || room.activeSpeakerId;
            if (speakerId) {
              if (!room.turnHistory.includes(speakerId)) {
                room.turnHistory.push(speakerId);
              }
              const speaker = room.players.find((p) => p.id === speakerId);
              if (speaker) {
                speaker.hasGivenHint = true;
              }
            }

            room.activeSpeakerId = undefined;
            broadcastRoom(room);
            break;
          }

          case 'PROCEED_TO_VOTING': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            room.phase = 'VOTING';
            room.players.forEach((p) => {
              p.votedFor = undefined;
            });

            // Simulate bot votes after short delay
            setTimeout(() => {
              if (room.phase === 'VOTING') {
                simulateBotVotes(room);
                checkAllVotes(room);
                broadcastRoom(room);
              }
            }, 1200);

            broadcastRoom(room);
            break;
          }

          case 'CAST_VOTE': {
            if (!currentRoomCode || !currentPlayerId) return;
            const room = rooms.get(currentRoomCode);
            if (!room || room.phase !== 'VOTING') return;

            const voter = room.players.find((p) => p.id === currentPlayerId);
            if (voter && data.targetPlayerId !== voter.id) {
              voter.votedFor = data.targetPlayerId;
            }

            checkAllVotes(room);
            broadcastRoom(room);
            break;
          }

          case 'NEXT_ROUND': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            room.roundNumber += 1;
            handleStartGame(room);
            break;
          }

          case 'RESET_TO_LOBBY': {
            if (!currentRoomCode) return;
            const room = rooms.get(currentRoomCode);
            if (!room) return;

            room.phase = 'LOBBY';
            room.turnHistory = [];
            room.activeSpeakerId = undefined;
            room.lastSpin = undefined;
            room.votingResults = undefined;
            room.players.forEach((p) => {
              p.isReady = false;
              p.votedFor = undefined;
              p.hasGivenHint = false;
              p.role = undefined;
              p.word = undefined;
            });

            broadcastRoom(room);
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode && currentPlayerId) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          const player = room.players.find((p) => p.id === currentPlayerId);
          if (player) {
            player.ws = undefined;
            player.lastActive = Date.now();
          }

          // If in lobby and player disconnects permanently or after grace, can remove
          // But keep for reconnection if game in progress
          if (room.phase === 'LOBBY' && player && !player.isHost) {
            room.players = room.players.filter((p) => p.id !== currentPlayerId);
            broadcastRoom(room);
          } else if (player?.isHost) {
            // Reassign host if host left in lobby
            const nextHost = room.players.find((p) => !p.isBot && p.id !== currentPlayerId);
            if (nextHost) {
              nextHost.isHost = true;
              room.hostId = nextHost.id;
              broadcastRoom(room);
            }
          }
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
