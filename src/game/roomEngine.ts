/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Category,
  GamePhase,
  Player,
  RoomState,
  SpinEvent,
} from '../types';
import { getRandomWordPair } from '../data/wordBank';

export interface InternalPlayer extends Player {
  lastActive: number;
}

export interface InternalRoom {
  code: string;
  hostId: string;
  phase: GamePhase;
  players: InternalPlayer[];
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

export const AVATAR_COLORS = [
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

export const BOT_NAMES = [
  'Bot Astronauta',
  'Bot Detetive',
  'Bot Ninja',
  'Bot Fantasma',
  'Bot Pirata',
  'Bot Alien',
];

export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function sanitizeRoomForPlayer(room: InternalRoom, playerId: string): RoomState {
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

export function createRoom(
  code: string,
  playerName: string,
  avatarColor?: string
): { room: InternalRoom; hostPlayer: InternalPlayer } {
  const hostId = 'p_' + Math.random().toString(36).substring(2, 9);
  const hostPlayer: InternalPlayer = {
    id: hostId,
    name: playerName.trim().slice(0, 16) || 'Jogador 1',
    isHost: true,
    avatarColor: avatarColor || AVATAR_COLORS[0],
    score: 0,
    lastActive: Date.now(),
  };

  const room: InternalRoom = {
    code,
    hostId,
    phase: 'LOBBY',
    players: [hostPlayer],
    category: 'Aleatório',
    impostorCount: 1,
    roundNumber: 1,
    turnHistory: [],
  };

  return { room, hostPlayer };
}

export function joinRoom(
  room: InternalRoom,
  playerName: string,
  avatarColor?: string
): { success: boolean; player?: InternalPlayer; error?: string } {
  if (room.phase !== 'LOBBY') {
    return { success: false, error: 'A partida já está em andamento nesta sala!' };
  }
  if (room.players.length >= 10) {
    return { success: false, error: 'A sala atingiu o limite máximo de 10 jogadores!' };
  }

  const playerId = 'p_' + Math.random().toString(36).substring(2, 9);
  const colorIndex = room.players.length % AVATAR_COLORS.length;
  const player: InternalPlayer = {
    id: playerId,
    name: playerName.trim().slice(0, 16) || `Jogador ${room.players.length + 1}`,
    isHost: false,
    avatarColor: avatarColor || AVATAR_COLORS[colorIndex],
    score: 0,
    lastActive: Date.now(),
  };

  room.players.push(player);
  return { success: true, player };
}

export function addBot(room: InternalRoom): InternalPlayer | null {
  if (room.players.length >= 10) return null;

  const botCount = room.players.filter((p) => p.isBot).length;
  const botName = BOT_NAMES[botCount % BOT_NAMES.length] || `Bot ${botCount + 1}`;
  const colorIndex = room.players.length % AVATAR_COLORS.length;

  const botPlayer: InternalPlayer = {
    id: 'bot_' + Math.random().toString(36).substring(2, 9),
    name: botName,
    isHost: false,
    isBot: true,
    avatarColor: AVATAR_COLORS[colorIndex],
    score: 0,
    lastActive: Date.now(),
  };

  room.players.push(botPlayer);
  return botPlayer;
}

export function removePlayer(room: InternalRoom, targetPlayerId: string): void {
  room.players = room.players.filter((p) => p.id !== targetPlayerId);
}

export function updateSettings(
  room: InternalRoom,
  category: Category,
  impostorCount: number
): void {
  room.category = category;
  room.impostorCount = Math.max(1, Math.min(impostorCount, 3));
}

export function startGame(room: InternalRoom): void {
  if (room.players.length < 3) return;

  const wordPair = getRandomWordPair(room.category);
  room.currentWordPair = wordPair;
  room.phase = 'SECRET_CARD';
  room.turnHistory = [];
  room.activeSpeakerId = undefined;
  room.lastSpin = undefined;
  room.votingResults = undefined;

  // Assign impostor(s)
  const actualImpostorCount = Math.min(
    room.impostorCount,
    Math.floor((room.players.length - 1) / 2) || 1
  );
  const shuffledIndices = room.players.map((_, i) => i).sort(() => Math.random() - 0.5);
  const impostorIndices = new Set(shuffledIndices.slice(0, actualImpostorCount));

  room.players.forEach((player, idx) => {
    player.isReady = Boolean(player.isBot);
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
}

export function setPlayerReady(room: InternalRoom, playerId: string): boolean {
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.isReady = true;
  }
  const allReady = room.players.every((p) => p.isReady);
  if (allReady) {
    room.phase = 'ROULETTE';
    return true; // phase changed
  }
  return false;
}

export function spinRoulette(room: InternalRoom): SpinEvent {
  const eligiblePlayers = room.players.filter((p) => !room.turnHistory.includes(p.id));
  const pool = eligiblePlayers.length > 0 ? eligiblePlayers : room.players;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  const totalPlayers = room.players.length;
  const sliceAngle = 360 / totalPlayers;
  const chosenIndex = room.players.findIndex((p) => p.id === chosen.id);

  const sliceCenter = chosenIndex * sliceAngle + sliceAngle / 2;
  const targetOffset = (360 - sliceCenter + 270) % 360;

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

  return spin;
}

export function nextTurn(room: InternalRoom, speakerId?: string): void {
  const id = speakerId || room.activeSpeakerId;
  if (id) {
    if (!room.turnHistory.includes(id)) {
      room.turnHistory.push(id);
    }
    const speaker = room.players.find((p) => p.id === id);
    if (speaker) {
      speaker.hasGivenHint = true;
    }
  }
  room.activeSpeakerId = undefined;
}

export function proceedToVoting(room: InternalRoom): void {
  room.phase = 'VOTING';
  room.players.forEach((p) => {
    p.votedFor = undefined;
  });
}

export function simulateBotVotes(room: InternalRoom): void {
  room.players
    .filter((p) => p.isBot && !p.votedFor)
    .forEach((bot) => {
      const candidates = room.players.filter((p) => p.id !== bot.id);
      if (candidates.length > 0) {
        const choice = candidates[Math.floor(Math.random() * candidates.length)];
        bot.votedFor = choice.id;
      }
    });
}

export function castVote(room: InternalRoom, voterId: string, targetPlayerId: string): void {
  const voter = room.players.find((p) => p.id === voterId);
  if (voter && targetPlayerId !== voter.id) {
    voter.votedFor = targetPlayerId;
  }
}

export function checkAllVotes(room: InternalRoom): boolean {
  const allVoted = room.players.every((p) => Boolean(p.votedFor));
  if (!allVoted) return false;

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
  return true;
}

export function nextRound(room: InternalRoom): void {
  room.roundNumber += 1;
  startGame(room);
}

export function resetToLobby(room: InternalRoom): void {
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
}
