import React from 'react';
import { playChipSound } from '../utils/audio';

interface ChipsProps {
  onAddBet: (amount: number) => void;
  balance: number;
  disabled?: boolean;
}

const CHIP_VALUES = [5, 10, 25, 100, 500];

export const Chips: React.FC<ChipsProps> = ({ onAddBet, balance, disabled = false }) => {
  const handleChipClick = (amount: number) => {
    if (disabled || balance < amount) return;
    playChipSound();
    onAddBet(amount);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold tracking-wider text-white/50 uppercase">
        Select Chips to Bet
      </span>
      <div className="flex justify-center items-center gap-3 sm:gap-4 p-2 bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl">
        {CHIP_VALUES.map((val) => {
          const isAffordable = balance >= val;
          return (
            <button
              key={val}
              disabled={disabled || !isAffordable}
              onClick={() => handleChipClick(val)}
              className={`chip chip-${val} focus:outline-none transform hover:-translate-y-1.5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none disabled:transform-none`}
              title={`Bet $${val}`}
            >
              <div className="chip-inner font-bold">
                ${val}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
