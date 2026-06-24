import React, { useState } from 'react';
import { PlayerState, GameStage } from '../game/types';
import { Hand } from './Hand';

interface TableProps {
  players: PlayerState[];
  activeBettorIndex: number;
  currentPlayerIndex: number;
  dealerPlayerIndex: number;
  winLimit: number;
  stage: GameStage;
  message: string;
  controlsComponent: React.ReactNode;
  chipsComponent: React.ReactNode;
  historyComponent: React.ReactNode;
  onRestartGame: () => void;
}

export const Table: React.FC<TableProps> = ({
  players,
  activeBettorIndex,
  currentPlayerIndex,
  dealerPlayerIndex,
  winLimit,
  stage,
  message,
  controlsComponent,
  chipsComponent,
  historyComponent,
  onRestartGame,
}) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Dynamic layout class based on number of players
  const activePlayersCount = players.filter(p => !p.isBankrupt).length;

  const getGridClass = () => {
    switch (activePlayersCount) {
      case 1:
        return "flex justify-center w-full max-w-md mx-auto";
      case 2:
        return "grid grid-cols-2 gap-4 w-full max-w-4xl mx-auto";
      case 3:
        return "grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-3xl mx-auto"; // 2 cols, Player 3 centered below
      case 4:
        return "grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-3xl mx-auto"; // 2 left, 2 right (2x2 grid)
      default:
        return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full";
    }
  };

  const isFourPlayers = activePlayersCount === 4;

  return (
    <div className="felt-table min-h-screen text-white flex flex-col relative overflow-y-auto">
      {/* Main Table Felt */}
      <div className="flex-1 flex flex-col p-4 sm:p-5 max-w-5xl mx-auto w-full z-10 justify-between">
        {/* Top Header Bar */}
        <header className="flex justify-between items-center mb-4 bg-black/15 backdrop-blur-sm border border-white/5 p-2.5 sm:p-3.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">👑</span>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase font-outfit text-white">
                Grand Royale
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-gold tracking-widest uppercase opacity-85">
                Blackjack Multiplayer
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-white/45 uppercase tracking-widest leading-none">Target to Win</span>
              <span className="text-sm sm:text-base font-extrabold text-gold font-outfit mt-0.5">
                ${winLimit.toLocaleString()}
              </span>
            </div>
            <button
              onClick={onRestartGame}
              className="text-[11px] font-bold bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10 text-white/60 hover:text-white transition-colors"
            >
              Quit Game
            </button>
          </div>
        </header>

        {/* Central Rules & Game Banner Message */}
        <div className="flex flex-col items-center text-center mb-3">
          <div className="mb-1 pointer-events-none select-none">
            <h2 className="text-xs font-bold tracking-widest text-gold opacity-60 uppercase mb-0.5">
              Blackjack Pays 3 to 2
            </h2>
            <p className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-white/30 uppercase">
              Dealer must stand on 17 • Separate decks per player
            </p>
          </div>

          {/* Dynamic Message Banner */}
          {message && (
            <div className="bg-black/40 backdrop-blur-md border border-white/10 px-5 py-2 rounded-full shadow-2xl animate-fade-in mt-1 max-w-sm">
              <p className="text-[11px] sm:text-xs font-semibold tracking-wide text-white/90">
                {message}
              </p>
            </div>
          )}
        </div>

        {/* Playfield Area - Multiplayer Grid */}
        <div className="flex-1 flex flex-col justify-center items-center my-2 w-full">
          <div className={getGridClass()}>
            {players
              .filter((p) => !p.isBankrupt)
              .map((player, activeIdx, filteredArr) => {
                const originalIdx = players.findIndex((p) => p.id === player.id);
                const isActiveBettor = stage === 'BETTING' && originalIdx === activeBettorIndex;
                const isActivePlayer = stage === 'PLAYER_TURN' && originalIdx === currentPlayerIndex;
                const isDealerActive = stage === 'DEALER_TURN' && originalIdx === dealerPlayerIndex;

                const isCentredOdd = filteredArr.length === 3 && activeIdx === 2;

                return (
                  <div
                    key={player.id}
                    className={`glass-panel flex flex-col justify-between rounded-3xl transition-all duration-300 border-2 ${
                      isCentredOdd ? 'col-span-2 max-w-sm sm:max-w-md mx-auto w-full' : ''
                    } ${
                      isFourPlayers || filteredArr.length === 3 ? 'p-3' : 'p-4'
                    } ${
                      isActivePlayer || isActiveBettor
                        ? 'active-player-glow scale-[1.02]'
                        : isDealerActive
                        ? 'active-dealer-glow scale-[1.02]'
                        : player.isBankrupt
                        ? 'border-red-500/20 opacity-30 bg-red-950/5'
                        : 'border-white/5'
                    }`}
                  >
                  {/* Seat Header */}
                  <div className={`w-full flex justify-between items-center pb-1.5 border-b border-white/5 ${isFourPlayers || filteredArr.length === 3 ? 'mb-2' : 'mb-3'}`}>
                    <span
                      className={`font-bold font-outfit text-xs tracking-wide uppercase ${
                        isActivePlayer ? 'text-gold' : player.isBankrupt ? 'text-red-500' : 'text-white'
                      }`}
                    >
                      {player.name} {isActivePlayer && '⭐'} {player.isBankrupt && '💀'}
                    </span>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider leading-none">Bankroll</span>
                      <span className="text-xs font-bold text-gold mt-0.5">${player.balance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Betting Circle or Card Hands */}
                  {stage === 'BETTING' ? (
                    <div className={`flex-1 flex flex-col items-center justify-center ${isFourPlayers ? 'py-4' : 'py-6'}`}>
                      <div
                        className={`rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 ${
                          isFourPlayers ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-20 h-20 sm:w-24 sm:h-24'
                        } ${
                          isActiveBettor
                            ? 'border-gold/50 cursor-pointer pulse-bet-circle bg-black/10'
                            : 'border-white/10 bg-black/5'
                        }`}
                      >
                        {player.currentBet === 0 ? (
                          <div className="flex flex-col items-center pointer-events-none text-white/30">
                            <span className="text-[9px] font-bold tracking-widest uppercase">Place</span>
                            <span className="text-xs font-extrabold text-gold/40">Bet</span>
                          </div>
                        ) : (
                          <div className="text-sm font-extrabold text-gold">${player.currentBet}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Game stage is not betting
                    <div className="w-full flex flex-col gap-0.5 flex-1 justify-center">
                      {player.currentBet > 0 || player.hand.cards.length > 0 ? (
                        <>
                          <Hand title="Dealer" hand={player.dealerHand} compact={true} />
                          <div className="border-t border-dashed border-white/5 my-1.5" />
                          <Hand title="Player" hand={player.hand} compact={true} />
                        </>
                      ) : (
                        <div className="text-center text-white/20 italic text-xs py-8">
                          {player.isBankrupt ? 'Bankrupt' : 'Not Dealt'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Outcome display if round over or bet confirmed */}
                  {stage === 'BETTING' && player.currentBet > 0 && (
                    <div className="mt-2 text-center bg-black/10 py-1.5 rounded-xl border border-white/5 text-[10px] font-bold text-green-400">
                      Bet Confirmed: ${player.currentBet}
                    </div>
                  )}

                  {stage === 'ROUND_OVER' && player.previousBet > 0 && (
                    <div className="mt-2 text-center bg-black/10 py-1.5 rounded-xl border border-white/5 text-[10px] font-bold text-white/60">
                      Bet: ${player.previousBet}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls, Bets and Chips Footer */}
        <footer className="mt-4 flex flex-col gap-4 items-center">
          {/* Chip Betting Selection */}
          {chipsComponent && (
            <div className="w-full flex justify-center animate-fade-in">
              {chipsComponent}
            </div>
          )}

          {/* Action Buttons Panel */}
          <div className="w-full max-w-md bg-black/25 backdrop-blur-md border border-white/5 p-3 rounded-3xl shadow-xl">
            {controlsComponent}
          </div>

          {/* Collapsible Stats and History Dashboard Toggle */}
          <div className="w-full flex flex-col items-center">
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-black/35 hover:bg-black/50 border border-white/10 rounded-full hover:border-gold/30 transition-all font-bold text-[9px] tracking-widest uppercase text-gold"
            >
              📊 {isHistoryOpen ? 'Hide Stats & History' : 'Show Stats & History'}
            </button>

            {/* Slider container for History */}
            {isHistoryOpen && (
              <div className="w-full max-w-xl mt-3 animate-fade-in">
                {historyComponent}
              </div>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
