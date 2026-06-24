import React from 'react';
import { GameStage } from '../game/types';
import { playClickSound } from '../utils/audio';

interface ControlsProps {
  stage: GameStage;
  currentBet: number;
  balance: number;
  onDeal: () => void;
  onHit: () => void;
  onStand: () => void;
  onDoubleDown: () => void;
  onClearBet: () => void;
  onRebet: () => void;
  onResetTable: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  stage,
  currentBet,
  balance,
  onDeal,
  onHit,
  onStand,
  onDoubleDown,
  onClearBet,
  onRebet,
  onResetTable,
}) => {
  const handleButtonClick = (action: () => void) => {
    playClickSound();
    action();
  };

  const canDouble = balance >= currentBet;

  if (stage === 'BETTING') {
    return (
      <div className="flex flex-wrap justify-center items-center gap-4 py-2">
        <button
          disabled={currentBet === 0}
          onClick={() => handleButtonClick(onClearBet)}
          className="btn-action btn-danger text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear Bet
        </button>

        <button
          disabled={currentBet === 0}
          onClick={() => handleButtonClick(onDeal)}
          className="btn-action btn-primary text-sm px-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Confirm Bet
        </button>
      </div>
    );
  }

  if (stage === 'PLAYER_TURN') {
    return (
      <div className="flex flex-wrap justify-center items-center gap-4 py-2">
        <button
          onClick={() => handleButtonClick(onHit)}
          className="btn-action btn-secondary text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Hit
        </button>

        <button
          onClick={() => handleButtonClick(onStand)}
          className="btn-action btn-primary text-sm px-8"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Stand
        </button>

        <button
          disabled={!canDouble}
          onClick={() => handleButtonClick(onDoubleDown)}
          className="btn-action btn-secondary text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          Double Down
        </button>
      </div>
    );
  }

  if (stage === 'ROUND_OVER') {
    return (
      <div className="flex flex-wrap justify-center items-center gap-4 py-2">
        <button
          onClick={() => handleButtonClick(onResetTable)}
          className="btn-action btn-secondary text-sm"
        >
          New Bet
        </button>

        {currentBet > 0 && balance >= currentBet && (
          <button
            onClick={() => handleButtonClick(onRebet)}
            className="btn-action btn-primary text-sm px-8"
          >
            Rebet & Deal
          </button>
        )}
      </div>
    );
  }

  // Fallback / Loading / Dealing stage
  return (
    <div className="flex justify-center items-center h-12">
      <div className="flex items-center gap-2 text-white/60 text-sm font-semibold tracking-wider animate-pulse">
        <svg className="animate-spin h-5 w-5 text-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Dealing cards...
      </div>
    </div>
  );
};
