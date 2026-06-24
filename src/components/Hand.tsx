import React from 'react';
import { Hand as HandType } from '../game/types';
import { Card } from './Card';

interface HandProps {
  title: string;
  hand: HandType;
  hideScore?: boolean;
}

export const Hand: React.FC<HandProps> = ({ title, hand, hideScore = false }) => {
  const { cards, score, isSoft, isBusted, isBlackjack } = hand;

  const renderBadge = () => {
    if (hideScore || cards.length === 0) return null;

    if (isBlackjack) {
      return (
        <span className="px-3 py-1 text-xs sm:text-sm font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 rounded-full shadow-lg border border-yellow-300 animate-bounce">
          Blackjack! 👑
        </span>
      );
    }
    
    if (isBusted) {
      return (
        <span className="px-3 py-1 text-xs sm:text-sm font-bold bg-red-600 text-white rounded-full shadow-lg border border-red-500">
          Bust ({score}) 💥
        </span>
      );
    }

    return (
      <span className="px-3 py-1 text-xs sm:text-sm font-semibold bg-black/40 backdrop-blur-md text-white rounded-full shadow border border-white/10">
        {isSoft ? 'Soft' : ''} {score}
      </span>
    );
  };

  return (
    <div className="flex flex-col items-center my-4 w-full">
      {/* Title & Badge Header */}
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-sm sm:text-base font-bold tracking-widest text-gold opacity-90 uppercase">
          {title}
        </h3>
        {renderBadge()}
      </div>

      {/* Cards Stack */}
      <div className="flex justify-center items-center h-[160px] sm:h-[185px] w-full px-4">
        {cards.length === 0 ? (
          <div className="w-24 h-36 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/20 text-sm font-semibold">
            Empty
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className="transition-all duration-300"
                style={{
                  marginLeft: idx === 0 ? '0px' : '-45px',
                  zIndex: idx,
                }}
              >
                <Card card={card} index={idx} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
