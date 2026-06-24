import React, { useState, useEffect, useCallback } from 'react';
import { Table } from './components/Table';
import { Chips } from './components/Chips';
import { Controls } from './components/Controls';
import { History } from './components/History';
import { Confetti } from './components/Confetti';
import { Card, GameStage, RoundResult, PlayerState } from './game/types';
import { buildShoe, shuffle, draw } from './game/deck';
import { calculateHand } from './game/score';
import { evaluateOutcome, shouldDealerHit } from './game/rules';
import {
  playCardSound,
  playWinSound,
  playLoseSound,
  playPushSound,
  playClickSound,
} from './utils/audio';

const INITIAL_BALANCE = 1000;
const SHOE_RESHUFFLE_THRESHOLD = 78; // 6 decks (312 cards) * 0.25 remaining = 78 cards

export const App: React.FC = () => {
  // --- Game Settings & Stages ---
  const [stage, setStage] = useState<GameStage>('SETUP');
  const [numPlayers, setNumPlayers] = useState<number>(1);
  const [winLimit, setWinLimit] = useState<number>(5000);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  
  // --- Active Indices for turn tracking ---
  const [activeBettorIndex, setActiveBettorIndex] = useState<number>(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState<number>(0);
  const [dealerPlayerIndex, setDealerPlayerIndex] = useState<number>(-1);
  
  const [message, setMessage] = useState<string>('Welcome! Configure the game settings to start.');
  const [history, setHistory] = useState<RoundResult[]>(() => {
    const saved = localStorage.getItem('bj_multi_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [confettiActive, setConfettiActive] = useState<boolean>(false);
  const [gameWinner, setGameWinner] = useState<string | null>(null);

  // Sync history to local storage
  useEffect(() => {
    localStorage.setItem('bj_multi_history', JSON.stringify(history));
  }, [history]);

  // --- Start Game Setup ---
  const handleStartGame = (pCount: number, limit: number) => {
    const initialPlayers: PlayerState[] = Array.from({ length: pCount }).map((_, i) => ({
      id: i + 1,
      name: `Player ${i + 1}`,
      balance: INITIAL_BALANCE,
      currentBet: 0,
      previousBet: 0,
      hand: { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false },
      dealerHand: { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false },
      shoe: shuffle(buildShoe(6)),
      isBankrupt: false,
    }));
    setPlayers(initialPlayers);
    setNumPlayers(pCount);
    setWinLimit(limit);
    setStage('BETTING');
    setActiveBettorIndex(0);
    setMessage(`Player 1's turn to bet. Choose chips!`);
    setGameWinner(null);
    playClickSound();
  };

  const handleRestartGame = useCallback(() => {
    setStage('SETUP');
    setPlayers([]);
    setGameWinner(null);
    setMessage('Welcome! Configure the game settings to start.');
    playClickSound();
  }, []);

  // --- Betting Handlers ---
  const handleAddBet = useCallback((amount: number) => {
    if (stage !== 'BETTING') return;
    const player = players[activeBettorIndex];
    if (player.balance < amount) {
      setMessage('Not enough balance!');
      return;
    }
    const nextPlayers = players.map((p, idx) =>
      idx === activeBettorIndex
        ? { ...p, balance: p.balance - amount, currentBet: p.currentBet + amount }
        : p
    );
    setPlayers(nextPlayers);
    setMessage(`${player.name}'s bet increased to $${player.currentBet + amount}`);
  }, [stage, players, activeBettorIndex]);

  const handleClearBet = useCallback(() => {
    if (stage !== 'BETTING') return;
    const player = players[activeBettorIndex];
    const nextPlayers = players.map((p, idx) =>
      idx === activeBettorIndex
        ? { ...p, balance: p.balance + p.currentBet, currentBet: 0 }
        : p
    );
    setPlayers(nextPlayers);
    setMessage(`${player.name}'s bet cleared.`);
  }, [stage, players, activeBettorIndex]);

  // --- Advance Betting Sequence ---
  const advanceBetting = (updatedPlayers: PlayerState[], currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    while (nextIndex < updatedPlayers.length && updatedPlayers[nextIndex].isBankrupt) {
      nextIndex++;
    }

    if (nextIndex < updatedPlayers.length) {
      setActiveBettorIndex(nextIndex);
      setMessage(`${updatedPlayers[nextIndex].name}'s turn to bet. Choose chips!`);
    } else {
      // All active players placed bets. Deal!
      setStage('DEALING');
      setMessage('Dealing cards...');
      triggerDealSequence(updatedPlayers);
    }
  };

  const handleConfirmBet = useCallback(() => {
    if (stage !== 'BETTING') return;
    const player = players[activeBettorIndex];
    if (player.currentBet === 0) {
      setMessage('Please place a bet of at least $5!');
      return;
    }
    playClickSound();
    advanceBetting(players, activeBettorIndex);
  }, [stage, players, activeBettorIndex]);

  // --- Core Game Deal Flow ---
  const triggerDealSequence = (activePlayers: PlayerState[]) => {
    let updated = [...activePlayers];
    
    // Draw initial 2 cards for players and dealer (from player's deck)
    updated = updated.map((p) => {
      if (p.isBankrupt || p.currentBet === 0) return p;

      let currentShoe = [...p.shoe];
      const pCards: Card[] = [];
      const dCards: Card[] = [];

      // Card 1 to Player
      const d1 = draw(currentShoe);
      pCards.push(d1.card);
      currentShoe = d1.remaining;

      // Card 1 to Dealer
      const d2 = draw(currentShoe);
      dCards.push(d2.card);
      currentShoe = d2.remaining;

      // Card 2 to Player
      const d3 = draw(currentShoe);
      pCards.push(d3.card);
      currentShoe = d3.remaining;

      // Card 2 to Dealer (Hidden)
      const d4 = draw(currentShoe);
      dCards.push({ ...d4.card, isHidden: true });
      currentShoe = d4.remaining;

      return {
        ...p,
        hand: calculateHand(pCards),
        dealerHand: calculateHand(dCards),
        shoe: currentShoe,
      };
    });

    // Play deal sounds with slight staggered delays
    const playersToDeal = updated.filter((p) => !p.isBankrupt && p.currentBet > 0);
    playersToDeal.forEach((_, idx) => {
      setTimeout(() => {
        playCardSound();
      }, idx * 200 + 100);
    });

    setTimeout(() => {
      setPlayers(updated);

      // Find first player turn
      let firstPlayer = 0;
      while (firstPlayer < updated.length && (updated[firstPlayer].isBankrupt || updated[firstPlayer].currentBet === 0)) {
        firstPlayer++;
      }

      if (firstPlayer < updated.length) {
        setStage('PLAYER_TURN');
        setCurrentPlayerIndex(firstPlayer);
        // If first player has Blackjack, auto-advance!
        if (updated[firstPlayer].hand.isBlackjack) {
          setMessage(`${updated[firstPlayer].name} has Blackjack!`);
          setTimeout(() => {
            advancePlayerTurn(updated, firstPlayer);
          }, 1200);
        } else {
          setMessage(`${updated[firstPlayer].name}'s Turn! Hit, Stand, or Double Down?`);
        }
      } else {
        setStage('ROUND_OVER');
        setMessage('No active bets.');
      }
    }, playersToDeal.length * 200 + 300);
  };

  // --- Advance Turn Sequence ---
  const advancePlayerTurn = (updatedPlayers: PlayerState[], currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    while (nextIndex < updatedPlayers.length && (updatedPlayers[nextIndex].isBankrupt || updatedPlayers[nextIndex].currentBet === 0)) {
      nextIndex++;
    }

    if (nextIndex < updatedPlayers.length) {
      setCurrentPlayerIndex(nextIndex);
      if (updatedPlayers[nextIndex].hand.isBlackjack) {
        setMessage(`${updatedPlayers[nextIndex].name} has Blackjack!`);
        setTimeout(() => {
          advancePlayerTurn(updatedPlayers, nextIndex);
        }, 1200);
      } else {
        setMessage(`${updatedPlayers[nextIndex].name}'s Turn! Hit, Stand, or Double Down?`);
      }
    } else {
      // All player turns complete. Move to Dealer's sequential play
      setStage('DEALER_TURN');
      startDealerTurns(updatedPlayers);
    }
  };

  // --- Dealer Sequential Drawing Loop ---
  const startDealerTurns = (currentPlayers: PlayerState[]) => {
    let idx = 0;
    while (idx < currentPlayers.length && (currentPlayers[idx].isBankrupt || currentPlayers[idx].currentBet === 0)) {
      idx++;
    }

    if (idx < currentPlayers.length) {
      setDealerPlayerIndex(idx);
      setMessage(`Dealer playing against ${currentPlayers[idx].name}...`);
      setTimeout(() => {
        runDealerTurnForPlayer(currentPlayers, idx);
      }, 800);
    } else {
      setStage('ROUND_OVER');
    }
  };

  const runDealerTurnForPlayer = (currentPlayers: PlayerState[], pIdx: number) => {
    const player = currentPlayers[pIdx];
    let dealerH = { ...player.dealerHand };

    // 1. Reveal Dealer Hidden Card
    if (dealerH.cards.some((c) => c.isHidden)) {
      const revealedCards = dealerH.cards.map((c) => ({ ...c, isHidden: false }));
      dealerH = calculateHand(revealedCards);
      playCardSound();

      const nextPlayers = currentPlayers.map((p, i) => (i === pIdx ? { ...p, dealerHand: dealerH } : p));
      setPlayers(nextPlayers);

      setTimeout(() => {
        runDealerTurnForPlayer(nextPlayers, pIdx);
      }, 800);
      return;
    }

    // 2. Dealer draws cards if player hasn't busted
    if (shouldDealerHit(dealerH) && !player.hand.isBusted) {
      const drawn = draw(player.shoe);
      const updatedCards = [...dealerH.cards, drawn.card];
      const newDealerHand = calculateHand(updatedCards);
      playCardSound();

      const nextPlayers = currentPlayers.map((p, i) =>
        i === pIdx ? { ...p, dealerHand: newDealerHand, shoe: drawn.remaining } : p
      );
      setPlayers(nextPlayers);

      setTimeout(() => {
        runDealerTurnForPlayer(nextPlayers, pIdx);
      }, 800);
    } else {
      // 3. Dealer finished drawing. Resolve round results for this player
      const { outcome, payoutFactor } = evaluateOutcome(player.hand, dealerH);
      const balanceChange = player.currentBet + player.currentBet * payoutFactor;

      let netGain = -player.currentBet;
      if (outcome === 'WIN') netGain = player.currentBet;
      else if (outcome === 'BLACKJACK') netGain = player.currentBet * 1.5;
      else if (outcome === 'PUSH') netGain = 0;

      const finalBalance = player.balance + balanceChange;
      const resolvedPlayer: PlayerState = {
        ...player,
        balance: finalBalance,
        previousBet: player.currentBet,
        currentBet: 0,
        isBankrupt: finalBalance < 5, // Cannot afford minimum $5 chip
      };

      const nextPlayers = currentPlayers.map((p, i) => (i === pIdx ? resolvedPlayer : p));
      setPlayers(nextPlayers);

      // Play outcome sounds
      if (outcome === 'BLACKJACK' || outcome === 'WIN') {
        playWinSound();
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 2000);
      } else if (outcome === 'LOSS') {
        playLoseSound();
      } else {
        playPushSound();
      }

      // Log to history
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newResult: RoundResult = {
        id: Math.random().toString(36).substr(2, 9),
        playerName: player.name,
        outcome,
        amount: netGain,
        playerScore: player.hand.score,
        dealerScore: dealerH.score,
        timestamp,
      };

      setHistory((prev) => [newResult, ...prev]);

      // Move to next player
      let nextIdx = pIdx + 1;
      while (nextIdx < nextPlayers.length && (nextPlayers[nextIdx].isBankrupt || nextPlayers[nextIdx].currentBet === 0)) {
        nextIdx++;
      }

      if (nextIdx < nextPlayers.length) {
        setDealerPlayerIndex(nextIdx);
        setMessage(`Dealer playing against ${nextPlayers[nextIdx].name}...`);
        setTimeout(() => {
          runDealerTurnForPlayer(nextPlayers, nextIdx);
        }, 800);
      } else {
        // All dealer rounds completed. Check win/loss targets
        let hitTargetWinner: PlayerState | null = null;
        for (const p of nextPlayers) {
          if (p.balance >= winLimit) {
            if (!hitTargetWinner || p.balance > hitTargetWinner.balance) {
              hitTargetWinner = p;
            }
          }
        }

        if (hitTargetWinner) {
          setStage('GAME_OVER');
          setGameWinner(hitTargetWinner.name);
          setMessage(`👑 ${hitTargetWinner.name} wins the game by reaching $${hitTargetWinner.balance.toLocaleString()}!`);
        } else {
          const allBankrupt = nextPlayers.every((p) => p.isBankrupt);
          if (allBankrupt) {
            setStage('GAME_OVER');
            setMessage('All players went bankrupt! Game Over.');
          } else {
            setStage('ROUND_OVER');
            setMessage('Round complete! Review results below.');
          }
        }
      }
    }
  };

  // --- Player Hand Actions ---
  const handleHit = useCallback(() => {
    if (stage !== 'PLAYER_TURN') return;

    const player = players[currentPlayerIndex];
    const drawn = draw(player.shoe);
    const updatedCards = [...player.hand.cards, drawn.card];
    const newHand = calculateHand(updatedCards);

    playCardSound();

    const nextPlayers = players.map((p, idx) =>
      idx === currentPlayerIndex ? { ...p, hand: newHand, shoe: drawn.remaining } : p
    );
    setPlayers(nextPlayers);

    if (newHand.isBusted) {
      setMessage(`${player.name} Busted!`);
      setTimeout(() => {
        advancePlayerTurn(nextPlayers, currentPlayerIndex);
      }, 1200);
    } else if (newHand.score === 21) {
      setMessage(`${player.name} stands on 21.`);
      setTimeout(() => {
        advancePlayerTurn(nextPlayers, currentPlayerIndex);
      }, 1200);
    }
  }, [stage, players, currentPlayerIndex]);

  const handleStand = useCallback(() => {
    if (stage !== 'PLAYER_TURN') return;
    const player = players[currentPlayerIndex];
    setMessage(`${player.name} stands.`);
    advancePlayerTurn(players, currentPlayerIndex);
  }, [stage, players, currentPlayerIndex]);

  const handleDoubleDown = useCallback(() => {
    if (stage !== 'PLAYER_TURN') return;
    const player = players[currentPlayerIndex];
    if (player.balance < player.currentBet) {
      setMessage('Not enough balance to double!');
      return;
    }

    const extraBet = player.currentBet;
    const doubledBet = player.currentBet * 2;

    const drawn = draw(player.shoe);
    const updatedCards = [...player.hand.cards, drawn.card];
    const newHand = calculateHand(updatedCards);

    playCardSound();

    const nextPlayers = players.map((p, idx) =>
      idx === currentPlayerIndex
        ? {
            ...p,
            hand: newHand,
            shoe: drawn.remaining,
            balance: p.balance - extraBet,
            currentBet: doubledBet,
          }
        : p
    );
    setPlayers(nextPlayers);

    if (newHand.isBusted) {
      setMessage(`${player.name} Busted!`);
    } else {
      setMessage(`${player.name} doubled and stands.`);
    }

    setTimeout(() => {
      advancePlayerTurn(nextPlayers, currentPlayerIndex);
    }, 1200);
  }, [stage, players, currentPlayerIndex]);

  // --- Reset Round betting ---
  const startRoundBetting = (currentPlayers: PlayerState[]) => {
    const resetPlayers = currentPlayers.map((p) => {
      let tempShoe = [...p.shoe];
      if (tempShoe.length < SHOE_RESHUFFLE_THRESHOLD) {
        tempShoe = shuffle(buildShoe(6));
      }
      return {
        ...p,
        currentBet: 0,
        hand: { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false },
        dealerHand: { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false },
        shoe: tempShoe,
      };
    });

    setPlayers(resetPlayers);

    let firstBettor = 0;
    while (firstBettor < resetPlayers.length && resetPlayers[firstBettor].isBankrupt) {
      firstBettor++;
    }

    if (firstBettor < resetPlayers.length) {
      setStage('BETTING');
      setActiveBettorIndex(firstBettor);
      setMessage(`${resetPlayers[firstBettor].name}'s turn to bet. Choose chips!`);
    } else {
      setStage('GAME_OVER');
      setMessage('Game Over! All players are bankrupt.');
    }
  };

  const handleResetTable = useCallback(() => {
    playClickSound();
    startRoundBetting(players);
  }, [players]);

  const handleRebet = useCallback(() => {
    if (stage !== 'ROUND_OVER') return;
    playClickSound();

    const nextPlayers = players.map((p) => {
      if (p.isBankrupt) return p;
      const betVal = p.previousBet > 0 && p.balance >= p.previousBet ? p.previousBet : 0;
      return {
        ...p,
        balance: p.balance - betVal,
        currentBet: betVal,
        hand: { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false },
        dealerHand: { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false },
      };
    });

    const activePlayers = nextPlayers.filter((p) => !p.isBankrupt);
    const allBetted = activePlayers.every((p) => p.currentBet > 0);

    if (allBetted && activePlayers.length > 0) {
      setPlayers(nextPlayers);
      setStage('DEALING');
      setMessage('Dealing cards...');
      setTimeout(() => {
        triggerDealSequence(nextPlayers);
      }, 500);
    } else {
      setPlayers(nextPlayers);
      let firstBettor = 0;
      while (firstBettor < nextPlayers.length && nextPlayers[firstBettor].isBankrupt) {
        firstBettor++;
      }
      setStage('BETTING');
      setActiveBettorIndex(firstBettor);
      setMessage(`${nextPlayers[firstBettor].name}'s turn to bet. Choose chips!`);
    }
  }, [players, stage]);

  const handleClearHistory = () => {
    localStorage.removeItem('bj_multi_history');
    setHistory([]);
  };

  // --- RENDER SCREENS ---

  if (stage === 'SETUP') {
    return (
      <div className="felt-table min-h-screen text-white flex flex-col justify-center items-center p-4 sm:p-6 relative">
        <div className="absolute inset-0 bg-black/70 z-0" />

        <div className="bg-[#fbfaf5] border-2 border-gold/50 rounded-3xl w-full max-w-md p-6 sm:p-8 z-10 text-center flex flex-col gap-6 shadow-2xl relative text-slate-950">
          <div className="flex flex-col items-center">
            <span className="text-4xl sm:text-5xl mb-2 filter drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] animate-pulse">👑</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider uppercase font-outfit text-slate-950">
              Grand Royale
            </h1>
            <span className="text-xs sm:text-sm font-bold tracking-widest uppercase opacity-100 mt-1" style={{ color: '#9a7a1c' }}>
              Blackjack Multiplayer
            </span>
          </div>

          <div className="flex flex-col gap-5 text-left">
            {/* Number of Players Card Selector */}
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-800 tracking-wider uppercase flex items-center gap-2">
                <span>1.</span> Select Table Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { count: 1, label: 'Single', desc: '1 Seat', icon: '👤' },
                  { count: 2, label: 'Duo', desc: '2 Seats', icon: '👥' },
                  { count: 3, label: 'Trio', desc: '3 Seats', icon: '👥👤' },
                  { count: 4, label: 'Quad', desc: '4 Seats', icon: '👑' },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setNumPlayers(item.count);
                    }}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300 border-2 ${
                      numPlayers === item.count
                        ? 'bg-gradient-to-b from-yellow-400 to-amber-500 text-slate-950 border-yellow-300 font-extrabold shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-[1.03]'
                        : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300'
                    }`}
                  >
                    <span className="text-lg sm:text-xl">{item.icon}</span>
                    <span className={`font-extrabold font-outfit text-[11px] leading-tight text-center ${numPlayers === item.count ? 'text-slate-950' : 'text-slate-900'}`}>
                      {item.label}
                    </span>
                    <span className={`text-[8px] font-extrabold uppercase tracking-wider ${numPlayers === item.count ? 'text-slate-800' : 'text-amber-800'}`}>
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Winning Target Amount Tiers */}
            <div className="flex flex-col gap-2.5 mt-1">
              <label className="text-xs font-bold text-slate-800 tracking-wider uppercase flex items-center gap-2">
                <span>2.</span> Set Victory Target
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 2500, label: 'VIP Standard', icon: '💎' },
                  { val: 5000, label: 'High Roller', icon: '👑' },
                  { val: 10000, label: 'Royale Legend', icon: '🏆' },
                ].map((tier) => (
                  <button
                    key={tier.val}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setWinLimit(tier.val);
                    }}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all duration-300 border-2 ${
                      winLimit === tier.val
                        ? 'bg-gradient-to-b from-yellow-400 to-amber-500 text-slate-950 border-yellow-300 font-extrabold shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-[1.03]'
                        : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300'
                    }`}
                  >
                    <span className="text-base">{tier.icon}</span>
                    <span className={`font-bold text-[11px] ${winLimit === tier.val ? 'text-slate-950' : 'text-slate-900'}`}>{tier.label}</span>
                    <span className={`text-[9px] font-extrabold ${winLimit === tier.val ? 'text-slate-900' : 'text-amber-800'}`}>${tier.val.toLocaleString()}</span>
                  </button>
                ))}
              </div>
              
              {/* Custom Target Input */}
              <div className="mt-1">
                <div className="flex items-center bg-white border-2 border-slate-300 rounded-xl px-3 py-2 text-sm focus-within:border-amber-500 transition-colors">
                  <span className="text-amber-800 font-bold mr-2 text-xs uppercase tracking-wider">Custom Limit:</span>
                  <input
                    type="number"
                    min="1500"
                    max="100000"
                    step="500"
                    value={winLimit}
                    onChange={(e) => {
                      const parsed = parseInt(e.target.value, 10);
                      setWinLimit(isNaN(parsed) ? 5000 : parsed);
                    }}
                    className="w-full bg-transparent border-none text-slate-950 text-right focus:outline-none font-extrabold text-sm tracking-wide"
                    placeholder="Enter limit..."
                  />
                </div>
                <span className="text-[9px] text-slate-600 text-center block mt-1.5 font-semibold">
                  First to reach victory target wins. Min target: $1,500.
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleStartGame(numPlayers, winLimit)}
            className="w-full btn-action btn-primary text-xs py-3.5 rounded-2xl font-bold tracking-widest uppercase transition-all duration-300 hover:scale-[1.01] shadow-2xl text-slate-950"
          >
            Enter Grand Arena
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'GAME_OVER') {
    return (
      <div className="felt-table min-h-screen text-white flex flex-col justify-center items-center p-6 relative">
        <div className="absolute inset-0 bg-black/60 z-0" />

        <div className="bg-[#051710] border-2 border-red-500/20 rounded-3xl w-full max-w-md p-6 sm:p-8 z-10 text-center flex flex-col gap-6 shadow-2xl relative">
          <div className="flex flex-col items-center gap-3">
            <span className="text-5xl animate-bounce">🏆</span>
            <span className="text-lg sm:text-xl font-extrabold text-gold tracking-widest uppercase font-outfit">
              Royale Game Over
            </span>
            <h2 className="text-2xl sm:text-3xl font-black font-outfit text-white leading-tight">
              {gameWinner ? `${gameWinner} has won!` : 'All Players Went Bankrupt'}
            </h2>
            <p className="text-sm text-white/50 max-w-xs mt-2">
              {gameWinner
                ? `Successfully reached the target threshold of $${winLimit.toLocaleString()}!`
                : 'No one has enough bankroll left to continue playing Blackjack.'}
            </p>
          </div>

          <div className="flex flex-col items-center mt-4">
            <button
              onClick={handleRestartGame}
              className="w-48 btn-action btn-primary text-xs py-3 font-extrabold tracking-widest uppercase rounded-2xl"
            >
              Start New Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Bettor/Player info for controls
  const activeBettor = players[activeBettorIndex];
  const activePlayer = players[currentPlayerIndex];

  return (
    <>
      {confettiActive && <Confetti />}

      <Table
        players={players}
        activeBettorIndex={activeBettorIndex}
        currentPlayerIndex={currentPlayerIndex}
        dealerPlayerIndex={dealerPlayerIndex}
        winLimit={winLimit}
        stage={stage}
        message={message}
        onRestartGame={handleRestartGame}
        chipsComponent={
          stage === 'BETTING' && activeBettor ? (
            <Chips
              onAddBet={handleAddBet}
              balance={activeBettor.balance}
              disabled={false}
            />
          ) : null
        }
        controlsComponent={
          <Controls
            stage={stage}
            currentBet={
              stage === 'BETTING' && activeBettor
                ? activeBettor.currentBet
                : stage === 'PLAYER_TURN' && activePlayer
                ? activePlayer.currentBet
                : 0
            }
            balance={
              stage === 'BETTING' && activeBettor
                ? activeBettor.balance
                : stage === 'PLAYER_TURN' && activePlayer
                ? activePlayer.balance
                : 0
            }
            onDeal={handleConfirmBet} // Maps to confirm bet during betting phase
            onHit={handleHit}
            onStand={handleStand}
            onDoubleDown={handleDoubleDown}
            onClearBet={handleClearBet}
            onRebet={handleRebet}
            onResetTable={handleResetTable}
          />
        }
        historyComponent={
          <History
            history={history}
            onClearHistory={handleClearHistory}
          />
        }
      />
    </>
  );
};

export default App;
