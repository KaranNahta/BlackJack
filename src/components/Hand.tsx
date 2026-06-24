import React from 'react';
import { Hand as HandType } from '../game/types';
import { Card } from './Card';

interface HandProps {
  title: string;
  hand: HandType;
  hideScore?: boolean;
  compact?: boolean;
}

export const Hand: React.FC<HandProps> = ({ title, hand, hideScore = false, compact = false }) => {
  const { cards, score, isSoft, isBusted, isBlackjack } = hand;

  const renderBadge = () => {
    if (hideScore || cards.length === 0) return null;

    if (isBlackjack) {
      return (
        <span className={`font-bold bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 rounded-full shadow-lg border border-yellow-300 ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs sm:text-sm animate-bounce'}`}>
          BJ! 👑
        </span>
      );
    }
    
    if (isBusted) {
      return (
        <span className={`font-bold bg-red-600 text-white rounded-full shadow-lg border border-red-500 ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs sm:text-sm'}`}>
          Bust ({score}) 💥
        </span>
      );
    }

    return (
      <span className={`font-semibold bg-black/40 backdrop-blur-md text-white rounded-full shadow border border-white/10 ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs sm:text-sm'}`}>
        {isSoft ? 'Soft' : ''} {score}
      </span>
    );
  };

  return (
    <div className={`flex flex-col items-center w-full ${compact ? 'my-1' : 'my-4'}`}>
      {/* Title & Badge Header */}
      <div className={`flex items-center gap-2 ${compact ? 'mb-1' : 'mb-3'}`}>
        <h3 className={`font-bold tracking-widest text-gold opacity-90 uppercase ${compact ? 'text-xs' : 'text-sm sm:text-base'}`}>
          {title}
        </h3>
        {renderBadge()}
      </div>

      {/* Cards Stack */}
      <div className={`flex justify-center items-center w-full px-2 ${compact ? 'h-[110px] sm:h-[125px]' : 'h-[160px] sm:h-[185px]'}`}>
        {cards.length === 0 ? (
          <div className={`${compact ? 'w-14 h-20 text-xs' : 'w-24 h-36 text-sm'} border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center text-white/20 font-semibold`}>
            Empty
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className="transition-all duration-300"
                style={{
                  marginLeft: idx === 0 ? '0px' : compact ? '-35px' : '-45px',
                  zIndex: idx,
                }}
              >
                <Card card={card} index={idx} compact={compact} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
