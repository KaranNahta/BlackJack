import React from 'react';

interface TableProps {
  balance: number;
  currentBet: number;
  stage: 'BETTING' | 'DEALING' | 'PLAYER_TURN' | 'DEALER_TURN' | 'ROUND_OVER';
  message: string;
  dealerComponent: React.ReactNode;
  playerComponent: React.ReactNode;
  controlsComponent: React.ReactNode;
  chipsComponent: React.ReactNode;
  historyComponent: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({
  balance,
  currentBet,
  stage,
  message,
  dealerComponent,
  playerComponent,
  controlsComponent,
  chipsComponent,
  historyComponent,
}) => {
  // Generate a stack of chips visually if there is a bet
  const renderChipStack = () => {
    if (currentBet === 0) return null;

    // Estimate number of chips in stack based on bet amount
    const stackSize = Math.min(Math.ceil(currentBet / 10), 8);
    const chipsArr = Array.from({ length: stackSize });

    return (
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
        {chipsArr.map((_, i) => {
          // Color based on bet value
          let chipBg = 'bg-red-600'; // Default
          if (currentBet >= 500) chipBg = 'bg-purple-600';
          else if (currentBet >= 100) chipBg = 'bg-slate-900 border border-white/20';
          else if (currentBet >= 25) chipBg = 'bg-green-600';
          else if (currentBet >= 10) chipBg = 'bg-blue-600';

          return (
            <div
              key={i}
              className={`absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full ${chipBg} shadow-md border-2 border-dashed border-white/40 flex items-center justify-center`}
              style={{
                transform: `translateY(-${i * 3}px) rotate(${i * 8}deg)`,
                zIndex: i,
              }}
            >
              <div className="w-4/5 h-4/5 rounded-full bg-black/10 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white text-shadow-sm">
                {i === stackSize - 1 ? `$${currentBet}` : ''}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="felt-table min-h-screen text-white flex flex-col lg:flex-row relative">
      {/* Main Table Felt */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full z-10">
        
        {/* Top Header Bar */}
        <header className="flex justify-between items-center mb-6 sm:mb-8 bg-black/15 backdrop-blur-sm border border-white/5 p-3 sm:p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">👑</span>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm sm:text-base tracking-wider uppercase font-outfit text-white">
                Grand Royale
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-gold tracking-widest uppercase opacity-85">
                Blackjack
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Bankroll</span>
              <span className="text-lg sm:text-xl font-extrabold text-gold font-outfit">
                ${balance.toLocaleString()}
              </span>
            </div>
          </div>
        </header>

        {/* Playfield Area */}
        <div className="flex-1 flex flex-col justify-between items-center my-2 gap-4">
          
          {/* Dealer Area */}
          <div className="w-full flex justify-center">
            {dealerComponent}
          </div>

          {/* Central Rules & Betting Circle Area */}
          <div className="flex flex-col items-center justify-center my-2 text-center relative z-20">
            {/* Rules Text */}
            <div className="mb-4 pointer-events-none select-none">
              <h2 className="text-xs sm:text-sm font-bold tracking-widest text-gold opacity-60 uppercase mb-1">
                Blackjack Pays 3 to 2
              </h2>
              <p className="text-[10px] sm:text-xs font-semibold tracking-wider text-white/30 uppercase">
                Dealer must stand on 17 • Insurance unavailable
              </p>
            </div>

            {/* Betting Circle */}
            <div className="relative my-2">
              <div 
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 ${
                  stage === 'BETTING' 
                    ? 'border-gold/30 hover:border-gold/50 cursor-pointer pulse-bet-circle bg-black/5' 
                    : 'border-white/10 bg-black/10'
                }`}
              >
                {currentBet === 0 ? (
                  <div className="flex flex-col items-center pointer-events-none text-white/30">
                    <span className="text-xs font-bold tracking-widest uppercase">Place</span>
                    <span className="text-sm font-extrabold text-gold/40">Bet</span>
                  </div>
                ) : (
                  renderChipStack()
                )}
              </div>
            </div>

            {/* Game Message Banner */}
            {message && (
              <div className="absolute top-[110%] left-1/2 transform -translate-x-1/2 w-64 sm:w-80 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-2xl animate-fade-in">
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-white/90">
                  {message}
                </p>
              </div>
            )}
          </div>

          {/* Player Area */}
          <div className="w-full flex justify-center mt-2">
            {playerComponent}
          </div>

        </div>

        {/* Controls, Bets and Chips Footer */}
        <footer className="mt-8 flex flex-col gap-6 items-center">
          {/* Chip Betting Selection */}
          {stage === 'BETTING' && (
            <div className="w-full flex justify-center animate-fade-in">
              {chipsComponent}
            </div>
          )}

          {/* Action Buttons Panel */}
          <div className="w-full max-w-md bg-black/25 backdrop-blur-md border border-white/5 p-4 rounded-3xl shadow-xl">
            {controlsComponent}
          </div>
        </footer>

      </div>

      {/* Stats and History Sidebar */}
      <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-white/10 bg-black/20 backdrop-blur-lg flex-shrink-0 p-4 lg:p-6 min-h-[300px] lg:min-h-0">
        {historyComponent}
      </aside>
    </div>
  );
};
