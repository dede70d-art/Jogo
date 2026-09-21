import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Vote,
  Skull,
  ShieldCheck,
  Trophy,
  RotateCcw,
  Sparkles,
  CheckCircle,
  HelpCircle,
  Home,
} from 'lucide-react';
import { RoomState } from '../types';
import { playClick, playVote, playVictory, playDefeat } from '../utils/audio';

interface VotingScreenProps {
  room: RoomState;
  myPlayerId: string | null;
  onCastVote: (targetId: string) => void;
  onNextRound: () => void;
  onResetToLobby: () => void;
}

export const VotingScreen: React.FC<VotingScreenProps> = ({
  room,
  myPlayerId,
  onCastVote,
  onNextRound,
  onResetToLobby,
}) => {
  const isReveal = room.phase === 'REVEAL';
  const isHost = room.hostId === myPlayerId;
  const me = room.players.find((p) => p.id === myPlayerId);
  const myVote = me?.votedFor;

  const results = room.votingResults;
  const votesCount = room.players.filter((p) => Boolean(p.votedFor)).length;
  const totalPlayers = room.players.length;

  const impostors = room.players.filter((p) => p.role === 'IMPOSTOR');
  const impostorCaught = (results?.impostorsCaught || []).length > 0;
  const mostVotedPlayer = room.players.find((p) => p.id === results?.mostVotedId);

  // Sound and confetti effect when revealing
  useEffect(() => {
    if (isReveal) {
      if (impostorCaught) {
        playVictory();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {
          console.debug(e);
        }
      } else {
        playDefeat();
      }
    }
  }, [isReveal, impostorCaught]);

  const handleVote = (targetId: string) => {
    if (isReveal || myVote) return;
    playVote();
    onCastVote(targetId);
  };

  // Phase: Active Voting
  if (!isReveal) {
    return (
      <div id="voting-screen-active" className="max-w-2xl mx-auto p-4 sm:p-6 w-full space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
            Etapa 3: Votação Final
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display">
            Quem é o Impostor? 🗳️
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Vote no participante que deu a dica mais suspeita ou incoerente.
          </p>
        </div>

        {/* Status of votes cast */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Vote className="w-4 h-4 text-indigo-400" />
            <span>Progresso da votação:</span>
          </div>
          <span className="font-mono text-xs font-bold bg-slate-800 px-3 py-1 rounded-lg text-white border border-slate-700">
            {votesCount} / {totalPlayers} votos registrados
          </span>
        </div>

        {/* Voting Candidates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {room.players.map((player) => {
            const isSelf = player.id === myPlayerId;
            const isSelected = myVote === player.id;
            const hasVoted = Boolean(player.votedFor);

            return (
              <button
                key={player.id}
                type="button"
                disabled={Boolean(myVote) || isSelf}
                onClick={() => handleVote(player.id)}
                className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/50 shadow-lg shadow-rose-950/40'
                    : isSelf
                    ? 'bg-slate-900/50 border-slate-800/80 opacity-60 cursor-not-allowed'
                    : myVote
                    ? 'bg-slate-900/80 border-slate-800/80 opacity-80 cursor-default'
                    : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 active:scale-[0.99] cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow text-base shrink-0"
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <span className="font-bold text-white text-sm block truncate max-w-[130px]">
                      {player.name}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {isSelf ? '(Você - Não pode votar em si)' : hasVoted ? 'Já votou' : 'Pensando...'}
                    </span>
                  </div>
                </div>

                <div>
                  {isSelected ? (
                    <span className="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Seu Voto
                    </span>
                  ) : !isSelf && !myVote ? (
                    <span className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700">
                      Votar
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {myVote && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-center text-xs text-indigo-300 space-y-1">
            <p className="font-semibold">Voto registrado com sucesso!</p>
            <p className="text-slate-400">Aguardando todos os participantes votarem para revelar o impostor...</p>
          </div>
        )}
      </div>
    );
  }

  // Phase: REVEAL (Resultados da Votação e Palavras)
  return (
    <div id="voting-screen-reveal" className="max-w-2xl mx-auto p-4 sm:p-6 w-full space-y-6 animate-in zoom-in-95">
      {/* Victory / Defeat Big Announcement Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-8 text-center border shadow-2xl relative overflow-hidden ${
          impostorCaught
            ? 'bg-gradient-to-b from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/50 shadow-emerald-950/40'
            : 'bg-gradient-to-b from-rose-950/80 via-slate-900 to-slate-950 border-rose-500/50 shadow-rose-950/40'
        }`}
      >
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border">
          {impostorCaught ? (
            <span className="text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              🎉 Vitória dos Civis!
            </span>
          ) : (
            <span className="text-rose-400 border-rose-500/30 bg-rose-500/10 px-2 py-0.5 rounded-full">
              😈 Vitória do Impostor!
            </span>
          )}
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight my-2">
          {impostorCaught ? 'O Impostor foi Desmascarado!' : 'O Impostor Escapou!'}
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          {impostorCaught
            ? 'O grupo conseguiu identificar o impostor pela votação!'
            : 'O impostor conseguiu enganar os civis e sobreviveu à rodada!'}
        </p>

        {/* True Impostors Display */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {impostors.map((imp) => (
            <div
              key={imp.id}
              className="flex items-center gap-2.5 px-4 py-2 bg-slate-900/90 border border-rose-500/40 rounded-2xl shadow-lg"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: imp.avatarColor }}
              >
                {imp.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <span className="font-bold text-white text-sm block">{imp.name}</span>
                <span className="text-[10px] uppercase font-extrabold text-rose-400 tracking-wider flex items-center gap-1">
                  <Skull className="w-3 h-3" /> Verdadeiro Impostor
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Words Confrontation Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Comparação das Palavras da Rodada
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Civil Word */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
            <span className="text-xs font-semibold text-emerald-400 block mb-1">
              Palavra dos Civis:
            </span>
            <span className="text-2xl font-black text-white font-display">
              {results?.civilWord || room.currentWordPair?.civil || '—'}
            </span>
          </div>

          {/* Impostor Word */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
            <span className="text-xs font-semibold text-rose-400 block mb-1">
              Palavra do Impostor:
            </span>
            <span className="text-2xl font-black text-white font-display">
              {results?.impostorWord || room.currentWordPair?.impostor || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Voting Breakdown */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Vote className="w-3.5 h-3.5 text-indigo-400" /> Resultado dos Votos
        </h3>

        <div className="space-y-2">
          {room.players.map((p) => {
            const count = results?.tallies[p.id] || 0;
            const percent = totalPlayers > 0 ? (count / totalPlayers) * 100 : 0;
            const isMostVoted = results?.mostVotedId === p.id;
            const isImp = p.role === 'IMPOSTOR';

            return (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{p.name}</span>
                    {isImp && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                        Impostor
                      </span>
                    )}
                    {isMostVoted && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        Mais votado
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-slate-300">
                    {count} {count === 1 ? 'voto' : 'votos'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isImp ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scoreboard / Placar da Partida */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400" /> Placar Geral da Partida
        </h3>

        <div className="divide-y divide-slate-800">
          {[...room.players]
            .sort((a, b) => b.score - a.score)
            .map((player, rank) => (
              <div key={player.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-slate-500 w-4 text-center">
                    #{rank + 1}
                  </span>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                    style={{ backgroundColor: player.avatarColor }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-white">
                    {player.name}
                    {player.id === myPlayerId && ' (Você)'}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-amber-400 text-sm">{player.score} pts</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Next Round & Return to Lobby Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {isHost ? (
          <button
            id="btn-next-round"
            onClick={() => {
              playClick();
              onNextRound();
            }}
            className="flex-1 py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-base transition-all active:scale-[0.99]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Próxima Rodada</span>
          </button>
        ) : (
          <div className="flex-1 py-3 text-center bg-slate-800/80 rounded-2xl border border-slate-700 text-slate-400 text-xs">
            Aguardando o Criador iniciar a próxima rodada...
          </div>
        )}

        <button
          id="btn-return-lobby"
          onClick={() => {
            playClick();
            onResetToLobby();
          }}
          className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-2xl border border-slate-700 flex items-center justify-center gap-2 text-xs transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>Voltar ao Lobby</span>
        </button>
      </div>
    </div>
  );
};
