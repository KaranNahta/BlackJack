import React from 'react';
import { Card as CardType } from '../game/types';

interface CardProps {
  card: CardType;
  index: number;
  compact?: boolean;
}

const SuitIcon: React.FC<{ suit: CardType['suit']; className?: string }> = ({ suit, className = 'w-5 h-5' }) => {
  switch (suit) {
    case 'HEARTS':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#e53e3e">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case 'DIAMONDS':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#e53e3e">
          <path d="M12 2L2 12l10 10 10-10L12 2z" />
        </svg>
      );
    case 'CLUBS':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#2d3748">
          <path d="M12 8.5a3.5 3.5 0 113.5 3.5c-.32 0-.63-.04-.93-.12.4.65.63 1.41.63 2.22a3.5 3.5 0 11-6.4-.95c-.24.58-.57 1.1-.97 1.53l.97 3.32h2.4l.97-3.32c-.4-.43-.73-.95-.97-1.53a3.5 3.5 0 11-1.1-6.17c0-.81.23-1.57.63-2.22-.3.08-.61.12-.93.12A3.5 3.5 0 0112 8.5z" />
        </svg>
      );
    case 'SPADES':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="#2d3748">
          <path d="M12 2S4.5 8.5 4.5 12.5a5.5 5.5 0 009.28 4.09l.72 2.41h-2.5v1h7v-1h-2.5l.72-2.41a5.5 5.5 0 002.78-4.09C20 8.5 12 2 12 2z" />
        </svg>
      );
    default:
      return null;
  }
};

export const Card: React.FC<CardProps> = ({ card, index, compact = false }) => {
  const isRed = card.suit === 'HEARTS' || card.suit === 'DIAMONDS';
  const displayVal = card.value;
  
  // Stagger deal animation delay based on order
  const delay = `${index * 150}ms`;

  return (
    <div 
      className={`card-container ${compact ? 'compact' : ''} animate-deal ${!card.isHidden ? 'is-flipped' : ''}`}
      style={{ animationDelay: delay }}
    >
      <div className="card-inner">
        {/* Card Back */}
        <div className="card-face card-back">
          <div className="card-back-pattern" />
        </div>

        {/* Card Front */}
        <div className="card-face card-front border border-gray-200" style={{ padding: compact ? '6px' : '12px' }}>
          {/* Top-Left Corner */}
          <div className="flex flex-col items-center leading-none">
            <span className={`font-bold ${compact ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'} ${isRed ? 'text-red-600' : 'text-slate-800'}`}>
              {displayVal}
            </span>
            <SuitIcon suit={card.suit} className={`${compact ? 'w-2.5 h-2.5 mt-0' : 'w-3.5 h-3.5 mt-0.5'}`} />
          </div>

          {/* Central Suit Graphic */}
          <div className="flex justify-center items-center opacity-90 my-auto">
            <SuitIcon suit={card.suit} className={compact ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-9 h-9 sm:w-12 sm:h-12'} />
          </div>

          {/* Bottom-Right Corner (Inverted) */}
          <div className="flex flex-col items-center leading-none self-end transform rotate-180">
            <span className={`font-bold ${compact ? 'text-xs sm:text-sm' : 'text-base sm:text-lg'} ${isRed ? 'text-red-600' : 'text-slate-800'}`}>
              {displayVal}
            </span>
            <SuitIcon suit={card.suit} className={`${compact ? 'w-2.5 h-2.5 mt-0' : 'w-3.5 h-3.5 mt-0.5'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};
