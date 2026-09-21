import React, { useState } from 'react';
import {
  Crown,
  Bot,
  UserPlus,
  Play,
  Copy,
  Check,
  Sparkles,
  Layers,
  ShieldAlert,
  Trash2,
  Share2,
} from 'lucide-react';
import { Category, RoomState } from '../types';
import { playClick } from '../utils/audio';

const AVATAR_COLORS = [
  '#EF4444',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

const CATEGORIES: Category[] = ['Aleatório', 'Frutas', 'Objetos', 'Animais', 'Comidas', 'Lugares'];

interface LobbyScreenProps {
  room: RoomState | null;
  myPlayerId: string | null;
  onCreateRoom: (name: string, color: string) => void;
  onJoinRoom: (code: string, name: string, color: string) => void;
  onUpdateSettings: (category: Category, impostorCount: number) => void;
  onAddBot: () => void;
  onRemovePlayer: (targetId: string) => void;
  onStartGame: () => void;
  initialRoomCode?: string;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  room,
  myPlayerId,
  onCreateRoom,
  onJoinRoom,
  onUpdateSettings,
  onAddBot,
  onRemovePlayer,
  onStartGame,
  initialRoomCode = '',
}) => {
  const [tab, setTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [playerName, setPlayerName] = useState(
    () => localStorage.getItem('impostor_name') || ''
  );
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = room?.hostId === myPlayerId;
  const playerCount = room?.players.length || 0;
  const canStart = playerCount >= 3;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = playerName.trim() || 'Jogador';
    localStorage.setItem('impostor_name', name);
    playClick();
    onCreateRoom(name, selectedColor);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = playerName.trim() || 'Jogador';
    const code = roomCodeInput.trim().toUpperCase();
    if (!code) return;
    localStorage.setItem('impostor_name', name);
    playClick();
    onJoinRoom(code, name, selectedColor);
  };

  const copyInviteLink = () => {
    if (!room) return;
    playClick();
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Screen 1A: Not in a room yet (Create or Join)
  if (!room) {
    return (
      <div id="lobby-entry" className="max-w-md mx-auto p-4 sm:p-6 w-full space-y-6">
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Jogo Multiplayer
          </div>
          <h2 className="text-3xl font-extrabold text-white font-display tracking-tight">
            Impostor de Palavras
          </h2>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Descubra quem é o impostor através de dicas e da roleta sincronizada!
          </p>
        </div>

        {/* Tab switcher */}
        <div className="bg-slate-800/80 p-1.5 rounded-xl flex border border-slate-700/60">
          <button
            id="tab-create-room"
            type="button"
            onClick={() => {
              playClick();
              setTab('create');
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === 'create'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Sala
          </button>
          <button
            id="tab-join-room"
            type="button"
            onClick={() => {
              playClick();
              setTab('join');
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === 'join'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar na Sala
          </button>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          {tab === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Seu Nome
                </label>
                <input
                  id="input-player-name"
                  type="text"
                  maxLength={15}
                  required
                  placeholder="Ex: Lucas, Carol..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Cor do seu Avatar
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedColor(c);
                      }}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        selectedColor === c
                          ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                id="btn-create-room-submit"
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform active:scale-[0.99] text-base"
              >
                Criar Nova Sala
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Código da Sala (4 dígitos)
                </label>
                <input
                  id="input-room-code"
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Ex: 4821"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center font-mono text-xl font-bold tracking-widest uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Seu Nome
                </label>
                <input
                  id="input-join-name"
                  type="text"
                  maxLength={15}
                  required
                  placeholder="Ex: Lucas, Carol..."
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                  Cor do seu Avatar
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedColor(c);
                      }}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        selectedColor === c
                          ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                id="btn-join-room-submit"
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all transform active:scale-[0.99] text-base"
              >
                Entrar na Sala
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Screen 1B: Connected in Room Lobby
  return (
    <div id="room-lobby" className="max-w-4xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Top Banner with Room Code & Invite Link */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5" /> Código de Entrada
          </div>
          <div className="flex items-center justify-center md:justify-start gap-3">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-amber-400 drop-shadow">
              {room.code}
            </span>
            <button
              id="btn-copy-room-code"
              onClick={copyInviteLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copiado!' : 'Copiar Link'}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Compartilhe o código ou envie o link para seus amigos entrarem.
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-center min-w-[140px]">
          <span className="text-xs text-slate-400 font-medium block">Jogadores Conectados</span>
          <span className="text-2xl font-black text-white font-mono">
            {playerCount} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected Players List (Left 2 columns on lg) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <span>👥</span> Jogadores na Sala ({playerCount})
            </h3>
            {isHost && playerCount < 10 && (
              <button
                id="btn-add-bot"
                type="button"
                onClick={() => {
                  playClick();
                  onAddBot();
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
                title="Adiciona um jogador robô para testar a partida"
              >
                <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ Adicionar Bot</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {room.players.map((p) => {
              const isMe = p.id === myPlayerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isMe
                      ? 'bg-indigo-950/30 border-indigo-500/40 ring-1 ring-indigo-500/20'
                      : 'bg-slate-800/60 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-md text-sm shrink-0"
                      style={{ backgroundColor: p.avatarColor }}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white text-sm truncate max-w-[120px]">
                          {p.name}
                        </span>
                        {isMe && (
                          <span className="px-1.5 py-0.2 text-[10px] bg-indigo-500/20 text-indigo-300 rounded font-semibold border border-indigo-500/30">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        {p.isHost && (
                          <span className="text-amber-400 font-medium flex items-center gap-0.5">
                            <Crown className="w-3 h-3 inline" /> Criador
                          </span>
                        )}
                        {p.isBot && (
                          <span className="text-cyan-400 font-medium flex items-center gap-0.5">
                            <Bot className="w-3 h-3 inline" /> Robô
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isHost && !p.isHost && (
                    <button
                      onClick={() => {
                        playClick();
                        onRemovePlayer(p.id);
                      }}
                      title="Remover jogador"
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {playerCount < 3 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <div>
                <p className="font-semibold">Mínimo de 3 jogadores para jogar</p>
                <p className="text-amber-200/80">
                  Convide amigos enviando o link ou clique em <strong>"+ Adicionar Bot"</strong> para testar a mecânica imediatamente!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Host Game Settings & Start (Right column) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" /> Configurações da Rodada
              </h3>
            </div>

            {/* Category Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-400 block">
                Categoria das Palavras
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = room.category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={!isHost}
                      onClick={() => {
                        playClick();
                        onUpdateSettings(cat, room.impostorCount);
                      }}
                      className={`py-2 px-2.5 rounded-xl text-xs font-semibold text-center transition-all border ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700/60'
                      } ${!isHost ? 'cursor-default opacity-85' : ''}`}
                    >
                      {cat === 'Aleatório' && '🎲 '}
                      {cat === 'Frutas' && '🍎 '}
                      {cat === 'Objetos' && '📦 '}
                      {cat === 'Animais' && '🦁 '}
                      {cat === 'Comidas' && '🍕 '}
                      {cat === 'Lugares' && '🏖️ '}
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Impostor Count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-slate-400">
                  Quantidade de Impostores
                </label>
                <span className="text-xs font-bold text-rose-400 font-mono">
                  {room.impostorCount} {room.impostorCount === 1 ? 'Impostor' : 'Impostores'}
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2].map((count) => {
                  const isSelected = room.impostorCount === count;
                  const isDisabled = !isHost || (count === 2 && playerCount < 5);
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        playClick();
                        onUpdateSettings(room.category, count);
                      }}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-700'
                      } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {count} {count === 1 ? 'Impostor' : 'Impostores'}
                    </button>
                  );
                })}
              </div>
              {room.impostorCount === 2 && playerCount < 5 && (
                <span className="text-[11px] text-slate-500 block">
                  * Recomendado 5+ jogadores para 2 impostores.
                </span>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            {isHost ? (
              <button
                id="btn-start-game"
                type="button"
                disabled={!canStart}
                onClick={() => {
                  playClick();
                  onStartGame();
                }}
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white text-base shadow-lg transition-all ${
                  canStart
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-600/30 active:scale-[0.99]'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Iniciar Jogo</span>
              </button>
            ) : (
              <div className="text-center py-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-slate-400 text-xs">
                Aguardando o Criador da sala iniciar o jogo...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
