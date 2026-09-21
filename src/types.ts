export type GamePhase = 'LOBBY' | 'SECRET_CARD' | 'ROULETTE' | 'VOTING' | 'REVEAL';

export type Category = 'Frutas' | 'Objetos' | 'Animais' | 'Comidas' | 'Lugares' | 'Aleatório';

export interface WordPair {
  civil: string;
  impostor: string;
  category: Category;
  hint?: string;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isBot?: boolean;
  avatarColor: string;
  score: number;
  isReady?: boolean;
  role?: 'CIVIL' | 'IMPOSTOR';
  word?: string;
  votedFor?: string; // player id
  hasGivenHint?: boolean;
}

export interface SpinEvent {
  targetPlayerId: string;
  targetPlayerName: string;
  startAngle: number;
  finalAngle: number;
  durationMs: number;
  timestamp: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: GamePhase;
  players: Player[];
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
  turnHistory: string[]; // player IDs who gave hints
  votingResults?: {
    tallies: Record<string, number>; // playerId -> votes count
    mostVotedId: string | null;
    isTie: boolean;
    impostorsCaught: string[];
    impostorsSurvived: string[];
    civilWord: string;
    impostorWord: string;
  };
}

// WebSocket Message Types
export type ClientMessage =
  | { type: 'CREATE_ROOM'; playerName: string; avatarColor?: string }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string; avatarColor?: string }
  | { type: 'RECONNECT'; roomCode: string; playerId: string }
  | { type: 'UPDATE_SETTINGS'; category: Category; impostorCount: number }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_PLAYER'; targetPlayerId: string }
  | { type: 'START_GAME' }
  | { type: 'PLAYER_READY' }
  | { type: 'SPIN_ROULETTE' }
  | { type: 'NEXT_TURN'; speakerId?: string }
  | { type: 'PROCEED_TO_VOTING' }
  | { type: 'CAST_VOTE'; targetPlayerId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET_TO_LOBBY' };

export type ServerMessage =
  | { type: 'ROOM_STATE'; room: RoomState; yourId: string }
  | { type: 'SPIN_START'; spin: SpinEvent }
  | { type: 'ERROR'; message: string };
