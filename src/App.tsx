/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { LobbyScreen } from './components/LobbyScreen';
import { SecretCardScreen } from './components/SecretCardScreen';
import { RouletteScreen } from './components/RouletteScreen';
import { VotingScreen } from './components/VotingScreen';
import { Category, ClientMessage, RoomState, ServerMessage, SpinEvent } from './types';
import { network, NetworkMode } from './services/network';

export default function App() {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => {
    return localStorage.getItem('impostor_player_id') || null;
  });
  const [activeSpin, setActiveSpin] = useState<SpinEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('websocket');

  // Extract ?room=XXXX from URL if present
  const [initialRoomCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || '';
    }
    return '';
  });

  // Setup unified network connection
  useEffect(() => {
    network.init(
      (msg: ServerMessage) => {
        if (msg.type === 'ROOM_STATE') {
          setRoom(msg.room);
          setMyPlayerId(msg.yourId);
          localStorage.setItem('impostor_room_code', msg.room.code);
          localStorage.setItem('impostor_player_id', msg.yourId);

          if (msg.room.lastSpin) {
            setActiveSpin(msg.room.lastSpin);
          }
        } else if (msg.type === 'SPIN_START') {
          setActiveSpin(msg.spin);
        } else if (msg.type === 'ERROR') {
          setErrorMessage(msg.message);
          setTimeout(() => setErrorMessage(null), 4000);
        }
      },
      (connected, mode) => {
        setIsConnected(connected);
        setNetworkMode(mode);
      }
    );

    return () => {
      network.disconnect();
    };
  }, []);

  const sendMessage = (msg: ClientMessage) => {
    network.send(msg);
  };

  const handleCreateRoom = (name: string, color: string) => {
    sendMessage({ type: 'CREATE_ROOM', playerName: name, avatarColor: color });
  };

  const handleJoinRoom = (code: string, name: string, color: string) => {
    sendMessage({ type: 'JOIN_ROOM', roomCode: code, playerName: name, avatarColor: color });
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('impostor_room_code');
    localStorage.removeItem('impostor_player_id');
    setRoom(null);
    setMyPlayerId(null);
    setActiveSpin(null);
    window.location.href = window.location.pathname;
  };

  const handleUpdateSettings = (category: Category, impostorCount: number) => {
    sendMessage({ type: 'UPDATE_SETTINGS', category, impostorCount });
  };

  const handleAddBot = () => {
    sendMessage({ type: 'ADD_BOT' });
  };

  const handleRemovePlayer = (targetPlayerId: string) => {
    sendMessage({ type: 'REMOVE_PLAYER', targetPlayerId });
  };

  const handleStartGame = () => {
    sendMessage({ type: 'START_GAME' });
  };

  const handlePlayerReady = () => {
    sendMessage({ type: 'PLAYER_READY' });
  };

  const handleSpinRoulette = () => {
    sendMessage({ type: 'SPIN_ROULETTE' });
  };

  const handleNextTurn = (speakerId?: string) => {
    sendMessage({ type: 'NEXT_TURN', speakerId });
  };

  const handleProceedToVoting = () => {
    sendMessage({ type: 'PROCEED_TO_VOTING' });
  };

  const handleCastVote = (targetPlayerId: string) => {
    sendMessage({ type: 'CAST_VOTE', targetPlayerId });
  };

  const handleNextRound = () => {
    sendMessage({ type: 'NEXT_ROUND' });
  };

  const handleResetToLobby = () => {
    sendMessage({ type: 'RESET_TO_LOBBY' });
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header room={room} onLeaveRoom={handleLeaveRoom} />

      {/* Disconnection Banner */}
      {!isConnected && (
        <div className="w-full bg-amber-600/90 text-white text-xs font-semibold py-1.5 px-4 text-center animate-pulse">
          Reconectando ao servidor em tempo real...
        </div>
      )}

      {/* Error Toast Notification */}
      {errorMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-top-4 border border-rose-400">
          {errorMessage}
        </div>
      )}

      {/* Main Content Area based on Game Phase */}
      <main className="flex-1 flex items-center justify-center p-3 sm:p-6">
        {!room || room.phase === 'LOBBY' ? (
          <LobbyScreen
            room={room}
            myPlayerId={myPlayerId}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onUpdateSettings={handleUpdateSettings}
            onAddBot={handleAddBot}
            onRemovePlayer={handleRemovePlayer}
            onStartGame={handleStartGame}
            initialRoomCode={initialRoomCode}
          />
        ) : room.phase === 'SECRET_CARD' ? (
          <SecretCardScreen
            room={room}
            myPlayerId={myPlayerId}
            onReady={handlePlayerReady}
          />
        ) : room.phase === 'ROULETTE' ? (
          <RouletteScreen
            room={room}
            myPlayerId={myPlayerId}
            onSpin={handleSpinRoulette}
            onNextTurn={handleNextTurn}
            onProceedToVoting={handleProceedToVoting}
            activeSpin={activeSpin}
          />
        ) : (
          <VotingScreen
            room={room}
            myPlayerId={myPlayerId}
            onCastVote={handleCastVote}
            onNextRound={handleNextRound}
            onResetToLobby={handleResetToLobby}
          />
        )}
      </main>
    </div>
  );
}
