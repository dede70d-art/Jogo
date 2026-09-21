import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Skull, CheckCircle2, ArrowRight } from 'lucide-react';
import { Player, RoomState } from '../types';
import { playClick } from '../utils/audio';

interface SecretCardScreenProps {
  room: RoomState;
  myPlayerId: string | null;
  onReady: () => void;
}

export const SecretCardScreen: React.FC<SecretCardScreenProps> = ({
  room,
  myPlayerId,
  onReady,
}) => {
  const [revealed, setRevealed] = useState(false);

  const me = room.players.find((p) => p.id === myPlayerId);
  const isImpostor = me?.role === 'IMPOSTOR';
  const readyCount = room.players.filter((p) => p.isReady).length;
  const totalCount = room.players.length;

  const toggleReveal = () => {
    playClick();
    setRevealed((prev) => !prev);
  };

  return (
    <div id="secret-card-screen" className="max-w-md mx-auto p-4 sm:p-6 w-full space-y-6 animate-in fade-in">
      <div className="text-center space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          Etapa 1: Seu Cartão Secreto
        </span>
        <h2 className="text-2xl font-black text-white font-display">
          Guarde segredo absoluto! 🤫
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Certifique-se de que ninguém ao seu redor veja a sua tela.
        </p>
      </div>

      {/* Secret Card Container */}
      <div
        className={`relative overflow-hidden rounded-3xl border transition-all duration-300 shadow-2xl p-6 sm:p-8 text-center ${
          revealed
            ? isImpostor
              ? 'bg-gradient-to-b from-rose-950/80 via-slate-900 to-slate-950 border-rose-500/50 shadow-rose-950/50'
              : 'bg-gradient-to-b from-indigo-950/80 via-slate-900 to-slate-950 border-indigo-500/50 shadow-indigo-950/50'
            : 'bg-slate-900/90 border-slate-800 shadow-black/50'
        }`}
      >
        {/* Decorative corner glows */}
        <div
          className={`absolute -top-12 -left-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isImpostor ? 'bg-rose-500' : 'bg-indigo-500'
          }`}
        />
        <div
          className={`absolute -bottom-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isImpostor ? 'bg-amber-500' : 'bg-teal-500'
          }`}
        />

        {/* Role Icon & Title */}
        <div className="space-y-3 mb-6">
          <div
            className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl shadow-xl transition-all ${
              revealed
                ? isImpostor
                  ? 'bg-rose-600/20 border border-rose-500/40 text-rose-400 scale-105'
                  : 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 scale-105'
                : 'bg-slate-800 border border-slate-700 text-slate-400'
            }`}
          >
            {revealed ? (isImpostor ? <Skull className="w-8 h-8 text-rose-400" /> : <ShieldCheck className="w-8 h-8 text-emerald-400" />) : '🔒'}
          </div>

          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-slate-400 block mb-1">
              Seu Papel Secreto
            </span>
            <h3
              className={`text-2xl font-black font-display tracking-tight transition-colors ${
                revealed
                  ? isImpostor
                    ? 'text-rose-400'
                    : 'text-emerald-400'
                  : 'text-slate-200'
              }`}
            >
              {revealed ? (isImpostor ? 'VOCÊ É O IMPOSTOR!' : 'VOCÊ É UM CIVIL!') : 'Papel Oculto'}
            </h3>
          </div>
        </div>

        {/* Word Box */}
        <div className="my-6">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Sua Palavra da Rodada
          </span>

          <div
            onClick={toggleReveal}
            className={`cursor-pointer select-none rounded-2xl py-5 px-4 border transition-all duration-200 flex flex-col items-center justify-center min-h-[90px] ${
              revealed
                ? isImpostor
                  ? 'bg-rose-950/40 border-rose-500/40 ring-1 ring-rose-500/30'
                  : 'bg-indigo-950/40 border-indigo-500/40 ring-1 ring-indigo-500/30'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800'
            }`}
          >
            {revealed ? (
              <div className="animate-in zoom-in-95 duration-150 text-center">
                <span className="text-2xl sm:text-3xl font-black tracking-wide text-white drop-shadow font-display">
                  {me?.word || 'Palavra'}
                </span>
                <span className="text-[11px] block mt-1 font-medium text-slate-400">
                  Categoria: <strong className="text-slate-200">{room.category}</strong>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>Toque para ver sua palavra</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <button
          id="btn-toggle-secret-word"
          type="button"
          onClick={toggleReveal}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border ${
            revealed
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border-indigo-500/30'
          }`}
        >
          {revealed ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Ocultar Palavra</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Mostrar Palavra</span>
            </>
          )}
        </button>

        {/* Role Briefing */}
        {revealed && (
          <div className="mt-5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-left text-xs leading-relaxed text-slate-300 animate-in fade-in duration-200">
            {isImpostor ? (
              <p>
                <strong className="text-rose-400 font-bold block mb-1">Disfarce-se bem!</strong>
                Sua palavra é parecida com a dos civis. Ouça as dicas deles, dê uma dica sutil e convença o grupo de que você é um civil!
              </p>
            ) : (
              <p>
                <strong className="text-emerald-400 font-bold block mb-1">Descubra o Impostor!</strong>
                Todos os civis compartilham a mesma palavra que você. Quem falar uma dica estranha ou suspeita é o impostor!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Readiness and proceed to roulette */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Jogadores prontos:</span>
          <span className="font-bold text-white font-mono bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            {readyCount} / {totalCount}
          </span>
        </div>

        {/* Players readiness pills */}
        <div className="flex flex-wrap gap-2">
          {room.players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                p.isReady
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-800/60 border-slate-700/40 text-slate-400'
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: p.avatarColor }}
              />
              <span className="font-medium truncate max-w-[90px]">{p.name}</span>
              {p.isReady && <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />}
            </div>
          ))}
        </div>

        <button
          id="btn-ready-for-roulette"
          type="button"
          disabled={me?.isReady}
          onClick={() => {
            playClick();
            onReady();
          }}
          className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg transition-all text-sm ${
            me?.isReady
              ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
              : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-indigo-600/30 active:scale-[0.99]'
          }`}
        >
          {me?.isReady ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Você está pronto! Aguardando os demais...</span>
            </>
          ) : (
            <>
              <span>Entendido! Ir para a Roleta</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
