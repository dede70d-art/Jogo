import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Users, HelpCircle, LogOut } from 'lucide-react';
import { getSoundMuted, setSoundMuted, playClick } from '../utils/audio';
import { RoomState } from '../types';

interface HeaderProps {
  room: RoomState | null;
  onLeaveRoom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ room, onLeaveRoom }) => {
  const [copied, setCopied] = useState(false);
  const [muted, setMutedState] = useState(getSoundMuted());
  const [showRules, setShowRules] = useState(false);

  const toggleSound = () => {
    const next = !muted;
    setSoundMuted(next);
    setMutedState(next);
    if (!next) {
      playClick();
    }
  };

  const copyRoomCode = () => {
    if (!room) return;
    playClick();
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header id="game-header" className="w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-rose-500/20">
              🎲
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-1.5 leading-none font-display">
                Impostor de Palavras
              </h1>
              <span className="text-[11px] text-slate-400 font-medium">
                {room ? `Rodada #${room.roundNumber}` : 'Multiplayer em Tempo Real'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {room && (
              <div className="flex items-center bg-slate-800/90 rounded-lg px-2.5 py-1.5 border border-slate-700/60 text-xs">
                <span className="text-slate-400 mr-1.5 font-medium hidden sm:inline">Sala:</span>
                <span className="font-mono font-bold text-amber-400 tracking-wider text-sm mr-2">{room.code}</span>
                <button
                  id="btn-copy-code-header"
                  onClick={copyRoomCode}
                  title="Copiar código da sala"
                  className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {room && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-800/60 rounded-lg px-2.5 py-1.5 border border-slate-700/50 text-xs text-slate-300 font-medium">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>{room.players.length}</span>
              </div>
            )}

            <button
              id="btn-help"
              onClick={() => {
                playClick();
                setShowRules(true);
              }}
              title="Como Jogar"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              id="btn-toggle-sound"
              onClick={toggleSound}
              title={muted ? 'Ativar som' : 'Desativar som'}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {room && onLeaveRoom && (
              <button
                id="btn-leave-room"
                onClick={() => {
                  playClick();
                  if (window.confirm('Tem certeza que deseja sair da sala?')) {
                    onLeaveRoom();
                  }
                }}
                title="Sair da sala"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                📖 Como Jogar
              </h2>
              <button
                onClick={() => setShowRules(false)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-emerald-400 block mb-1">1. Cartão Secreto:</span>
                Civis recebem a palavra principal (ex: <em>Maçã</em>). O Impostor recebe uma palavra parecida (ex: <em>Pêra</em>)!
              </div>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-amber-400 block mb-1">2. Roleta da Dica:</span>
                A roleta sorteia quem fala a dica da vez. O sorteado fala uma palavra ou pista em voz alta para o grupo. A roleta gira até todos falarem!
              </div>

              <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/50">
                <span className="font-semibold text-rose-400 block mb-1">3. Votação & Revelação:</span>
                Todos votam em quem acham ser o Impostor. Se os Civis acertarem, ganham pontos! Se o Impostor escapar, ele leva a pontuação máxima!
              </div>
            </div>

            <button
              id="btn-close-rules"
              onClick={() => {
                playClick();
                setShowRules(false);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-xl text-white transition-colors"
            >
              Entendi, vamos jogar!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
