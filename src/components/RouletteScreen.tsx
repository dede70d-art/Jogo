import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Check, ArrowRight, Eye, Volume2, Sparkles, Mic } from 'lucide-react';
import { Player, RoomState, SpinEvent } from '../types';
import { playClick, playDing, startWheelSoundSequence } from '../utils/audio';

const SLICE_COLORS = [
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

interface RouletteScreenProps {
  room: RoomState;
  myPlayerId: string | null;
  onSpin: () => void;
  onNextTurn: (speakerId?: string) => void;
  onProceedToVoting: () => void;
  activeSpin: SpinEvent | null;
}

export const RouletteScreen: React.FC<RouletteScreenProps> = ({
  room,
  myPlayerId,
  onSpin,
  onNextTurn,
  onProceedToVoting,
  activeSpin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [currentAngle, setCurrentAngle] = useState(room.lastSpin ? room.lastSpin.finalAngle : 0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showSecretWordPeek, setShowSecretWordPeek] = useState(false);

  const me = room.players.find((p) => p.id === myPlayerId);
  const isHost = room.hostId === myPlayerId;
  const activeSpeaker = room.players.find((p) => p.id === room.activeSpeakerId);
  const isMyTurn = activeSpeaker?.id === myPlayerId;

  const totalPlayers = room.players.length;
  const turnHistory = room.turnHistory || [];
  const allSpoken = room.players.every((p) => turnHistory.includes(p.id));

  // Sound sequence trigger on new spin
  useEffect(() => {
    if (activeSpin) {
      startWheelSoundSequence(activeSpin.durationMs);
    }
  }, [activeSpin?.timestamp]);

  // Synchronized animation loop
  useEffect(() => {
    let cancel = false;

    const animate = () => {
      if (cancel) return;

      if (activeSpin) {
        const elapsed = Date.now() - activeSpin.timestamp;
        if (elapsed < activeSpin.durationMs) {
          setIsSpinning(true);
          const progress = Math.min(1, Math.max(0, elapsed / activeSpin.durationMs));
          // Quintic ease-out for ultra smooth realistic roulette spin
          const easeOut = 1 - Math.pow(1 - progress, 4);
          const angle = activeSpin.startAngle + (activeSpin.finalAngle - activeSpin.startAngle) * easeOut;
          setCurrentAngle(angle);
          animationFrameRef.current = requestAnimationFrame(animate);
          return;
        } else {
          setIsSpinning(false);
          setCurrentAngle(activeSpin.finalAngle);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancel = true;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeSpin]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 340;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    ctx.save();
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 16;
    const sliceAngle = (2 * Math.PI) / totalPlayers;

    // Outer ring shadow and border
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#334155';
    ctx.stroke();
    ctx.restore();

    // Rotate context by currentAngle
    ctx.save();
    ctx.translate(centerX, centerY);
    const rad = (currentAngle * Math.PI) / 180;
    ctx.rotate(rad);

    // Draw slices
    room.players.forEach((player, index) => {
      const startA = index * sliceAngle;
      const endA = startA + sliceAngle;
      const color = SLICE_COLORS[index % SLICE_COLORS.length];

      // Slice
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startA, endA);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();

      // Text inside slice
      ctx.save();
      const midA = startA + sliceAngle / 2;
      ctx.rotate(midA);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Outfit, sans-serif';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;

      // Truncate player name if long
      const displayName = player.name.length > 10 ? player.name.slice(0, 9) + '…' : player.name;
      ctx.fillText(displayName, radius - 20, 5);
      ctx.restore();
    });

    ctx.restore(); // Restore unrotated context

    // Draw center hub
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#6366f1';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 16, 0, 2 * Math.PI);
    ctx.fillStyle = '#6366f1';
    ctx.fill();
    ctx.restore();

    // Draw golden top pointer (pointing straight down into the wheel at top: 270 deg)
    ctx.save();
    ctx.translate(centerX, centerY - radius - 2);

    ctx.beginPath();
    ctx.moveTo(0, 16); // tip pointing down
    ctx.lineTo(-12, -8);
    ctx.lineTo(12, -8);
    ctx.closePath();

    ctx.fillStyle = '#fbbf24'; // Amber-400
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#b45309';
    ctx.stroke();

    // Needle jewel dot
    ctx.beginPath();
    ctx.arc(0, -2, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }, [currentAngle, totalPlayers, room.players]);

  const handleSpinClick = () => {
    if (isSpinning) return;
    playClick();
    onSpin();
  };

  const handleMarkSpoken = () => {
    playClick();
    onNextTurn();
  };

  return (
    <div id="roulette-screen" className="max-w-4xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Top Banner */}
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          Etapa 2: A Roleta da Dica
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-white font-display">
          Quem dará a próxima dica? 🎡
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Girem a roleta! O sorteado deve falar uma dica em voz alta para todos da sala.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Wheel & Action Area (Center/Left) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
          {/* Subtle wheel glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Wheel Canvas */}
          <div className="relative pt-2 pb-1">
            <canvas ref={canvasRef} className="rounded-full shadow-2xl drop-shadow-lg" />
          </div>

          {/* Active Speaker Banner */}
          {activeSpeaker && !isSpinning && (
            <div
              className={`w-full p-4 rounded-2xl border text-center transition-all animate-in zoom-in-95 ${
                isMyTurn
                  ? 'bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-amber-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                  : 'bg-slate-800/80 border-slate-700/80'
              }`}
            >
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                <Mic className="w-3.5 h-3.5 animate-pulse" /> É a vez de falar!
              </div>

              <div className="flex items-center justify-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow"
                  style={{ backgroundColor: activeSpeaker.avatarColor }}
                >
                  {activeSpeaker.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-xl font-black text-white font-display">
                  {activeSpeaker.name} {isMyTurn && '(Você!)'}
                </h3>
              </div>

              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                {isMyTurn
                  ? 'Fale sua dica em voz alta agora para o grupo! Seja esperto.'
                  : `Ouça com atenção a dica de ${activeSpeaker.name}. Parece suspeita?`}
              </p>

              {/* Action to confirm hint given */}
              <div className="mt-3 flex justify-center">
                <button
                  id="btn-confirm-hint"
                  onClick={handleMarkSpoken}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Dica Dada! Concluir vez</span>
                </button>
              </div>
            </div>
          )}

          {/* Wheel Control Buttons */}
          <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
            <button
              id="btn-spin-wheel"
              disabled={isSpinning}
              onClick={handleSpinClick}
              className={`flex-1 py-3.5 px-5 rounded-2xl font-bold flex items-center justify-center gap-2 text-white text-base shadow-xl transition-all ${
                isSpinning
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-amber-500/25 active:scale-[0.99]'
              }`}
            >
              <RotateCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{isSpinning ? 'Girando a Roleta...' : 'Girar Roleta!'}</span>
            </button>

            {isHost && (
              <button
                id="btn-proceed-voting"
                disabled={isSpinning}
                onClick={() => {
                  playClick();
                  onProceedToVoting();
                }}
                className={`py-3.5 px-5 rounded-2xl font-bold flex items-center justify-center gap-2 text-white text-sm shadow-lg transition-all ${
                  allSpoken
                    ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 ring-2 ring-indigo-400/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <span>Iniciar Votação</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status, History & Word Peek (Right Column) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Secret Word Peek card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Sua Palavra Secreta:</span>
                <span className="text-sm font-bold text-white">
                  {showSecretWordPeek ? (
                    <strong className="text-indigo-400 font-display text-base">
                      {me?.word}
                    </strong>
                  ) : (
                    '••••••••'
                  )}
                </span>
              </div>
              <button
                id="btn-peek-word"
                type="button"
                onClick={() => {
                  playClick();
                  setShowSecretWordPeek(!showSecretWordPeek);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showSecretWordPeek ? 'Ocultar' : 'Rever'}</span>
              </button>
            </div>
          </div>

          {/* Turn History / Hints Given */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <span>📋</span> Rodada de Dicas
              </h4>
              <span className="text-xs font-mono font-semibold bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                {turnHistory.length} / {totalPlayers} deram dica
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {room.players.map((player) => {
                const hasSpoken = turnHistory.includes(player.id);
                const isActive = player.id === room.activeSpeakerId;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 ring-1 ring-amber-500/30'
                        : hasSpoken
                        ? 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                        : 'bg-slate-800/80 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0"
                        style={{ backgroundColor: player.avatarColor }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold truncate max-w-[120px]">
                        {player.name}
                        {player.id === myPlayerId && ' (Você)'}
                      </span>
                    </div>

                    <div>
                      {isActive ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 text-[10px] animate-pulse">
                          Falando agora
                        </span>
                      ) : hasSpoken ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                          <Check className="w-3.5 h-3.5" /> Dica dada
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Aguardando</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {allSpoken && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                <span>Todos os jogadores deram suas dicas!</span>
                {isHost && (
                  <button
                    onClick={() => {
                      playClick();
                      onProceedToVoting();
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                  >
                    Votar Agora
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
