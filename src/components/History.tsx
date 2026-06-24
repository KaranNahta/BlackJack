import React from 'react';
import { RoundResult } from '../game/types';

interface HistoryProps {
  history: RoundResult[];
  onClearHistory: () => void;
}

export const History: React.FC<HistoryProps> = ({ history, onClearHistory }) => {
  const totalRounds = history.length;
  const wins = history.filter((r) => r.outcome === 'WIN' || r.outcome === 'BLACKJACK').length;
  const losses = history.filter((r) => r.outcome === 'LOSS').length;
  const pushes = history.filter((r) => r.outcome === 'PUSH').length;
  const blackjacks = history.filter((r) => r.outcome === 'BLACKJACK').length;
  
  const netProfit = history.reduce((sum, r) => sum + r.amount, 0);

  // Calculate streaks
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  // Process history from oldest to newest to calculate max streak
  // and check the current active streak from newest to oldest
  for (let i = history.length - 1; i >= 0; i--) {
    const outcome = history[i].outcome;
    if (outcome === 'WIN' || outcome === 'BLACKJACK') {
      tempStreak++;
      if (tempStreak > maxStreak) maxStreak = tempStreak;
    } else if (outcome === 'LOSS') {
      tempStreak = 0;
    }
    // push doesn't break a streak in some rules, but let's count only absolute wins as expanding streak,
    // and loss resetting it. Push keeps it neutral (does not reset, does not increment)
  }

  // Active current streak (most recent consecutive wins)
  for (let i = 0; i < history.length; i++) {
    const outcome = history[i].outcome;
    if (outcome === 'WIN' || outcome === 'BLACKJACK') {
      currentStreak++;
    } else if (outcome === 'LOSS') {
      break;
    }
  }

  const winRate = totalRounds > 0 ? Math.round((wins / totalRounds) * 100) : 0;

  return (
    <div className="glass-panel p-4 sm:p-5 flex flex-col h-full overflow-hidden text-sm w-full">
      <div className="flex justify-between items-center pb-4 border-b border-white/10">
        <h2 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
          <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Stats & History
        </h2>
        {totalRounds > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs text-white/40 hover:text-red-400 transition-colors font-semibold"
          >
            Reset
          </button>
        )}
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 gap-3 my-4">
        <div className="bg-black/25 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
          <span className="text-white/40 text-[11px] font-bold tracking-wider uppercase">Net Return</span>
          <span className={`text-base sm:text-lg font-extrabold mt-1 ${netProfit > 0 ? 'text-green-400' : netProfit < 0 ? 'text-red-400' : 'text-white'}`}>
            {netProfit >= 0 ? `+$${netProfit}` : `-$${Math.abs(netProfit)}`}
          </span>
        </div>
        
        <div className="bg-black/25 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
          <span className="text-white/40 text-[11px] font-bold tracking-wider uppercase">Win Rate</span>
          <span className="text-base sm:text-lg font-extrabold text-white mt-1">
            {winRate}% <span className="text-xs font-normal text-white/50">({wins}/{totalRounds})</span>
          </span>
        </div>

        <div className="bg-black/25 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
          <span className="text-white/40 text-[11px] font-bold tracking-wider uppercase">Current Streak</span>
          <span className="text-sm sm:text-base font-extrabold text-white mt-1 flex items-center gap-1.5">
            🔥 {currentStreak} wins
          </span>
        </div>

        <div className="bg-black/25 rounded-xl p-3 border border-white/5 flex flex-col justify-between">
          <span className="text-white/40 text-[11px] font-bold tracking-wider uppercase">Blackjacks</span>
          <span className="text-sm sm:text-base font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
            👑 {blackjacks}
          </span>
        </div>
      </div>

      {/* Record distribution */}
      <div className="bg-black/15 rounded-xl p-3 border border-white/5 mb-4 text-xs">
        <div className="flex justify-between mb-1.5 font-semibold text-white/60">
          <span>Wins: {wins}</span>
          <span>Losses: {losses}</span>
          <span>Pushes: {pushes}</span>
        </div>
        {/* Visual progress bar representing record ratio */}
        <div className="w-full h-2 rounded-full bg-white/5 flex overflow-hidden">
          {totalRounds > 0 ? (
            <>
              <div style={{ width: `${(wins/totalRounds)*100}%` }} className="bg-green-500 h-full" />
              <div style={{ width: `${(pushes/totalRounds)*100}%` }} className="bg-yellow-500 h-full" />
              <div style={{ width: `${(losses/totalRounds)*100}%` }} className="bg-red-500 h-full" />
            </>
          ) : (
            <div className="w-full bg-white/10 h-full" />
          )}
        </div>
      </div>

      {/* History Log list */}
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Round History</h3>
      <div className="flex-1 overflow-y-auto pr-1">
        {history.length === 0 ? (
          <div className="text-center text-white/30 py-8 font-semibold italic text-xs">
            No rounds played yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((round) => {
              const profitText = round.amount >= 0 ? `+$${round.amount}` : `-$${Math.abs(round.amount)}`;
              const outcomeColor = 
                round.outcome === 'BLACKJACK' ? 'text-amber-400 font-bold' :
                round.outcome === 'WIN' ? 'text-green-400 font-semibold' :
                round.outcome === 'PUSH' ? 'text-yellow-400 font-semibold' :
                'text-red-400';
              
              return (
                <div 
                  key={round.id}
                  className="flex justify-between items-center bg-black/15 hover:bg-black/30 border border-white/5 hover:border-white/10 rounded-xl p-3 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs uppercase font-extrabold ${outcomeColor}`}>
                        {round.outcome}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {round.timestamp}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/50 mt-0.5">
                      You: <span className="font-semibold text-white/70">{round.playerScore}</span> | 
                      Dealer: <span className="font-semibold text-white/70">{round.dealerScore}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${round.amount > 0 ? 'text-green-400' : round.amount < 0 ? 'text-red-400' : 'text-white/60'}`}>
                    {profitText}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
