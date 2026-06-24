import { useState, useEffect, useCallback } from 'react';
import { Table } from '../components/Table';
import { Chips } from '../components/Chips';
import { Controls } from '../components/Controls';
import { History } from '../components/History';
import { Confetti } from '../components/Confetti';
import { Card, GameStage, RoundResult, PlayerState } from '../game/types';
import { buildShoe, shuffle, draw } from '../game/deck';
import { calculateHand } from '../game/score';
import { evaluateOutcome, shouldDealerHit } from '../game/rules';
import {
  playCardSound,
  playWinSound,
  playLoseSound,
  playPushSound,
  playClickSound,
} from '../utils/audio';

type Step = "players" | "threshold" | "ready";

interface GameConfig {
  players: number;
  threshold: number | null;
  customThreshold: string;
}

const THRESHOLD_PRESETS = [2500, 5000, 10000] as const;

const SUIT_ICONS = ["♠", "♥", "♦", "♣"];

const INITIAL_BALANCE = 1000;
const SHOE_RESHUFFLE_THRESHOLD = 78; // 6 decks (312 cards) * 0.25 remaining = 78 cards

export default function App() {
  // --- Wizard Setup States ---
  const [step, setStep] = useState<Step>("players");
  const [config, setConfig] = useState<GameConfig>({
    players: 0,
    threshold: null,
    customThreshold: "",
  });
  const [customMode, setCustomMode] = useState(false);
  const [customError, setCustomError] = useState("");

  // --- Game Settings & Stages ---
  const [stage, setStage] = useState<GameStage>('SETUP');

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

  // --- Wizard handlers ---
  function selectPlayers(n: number) {
    playClickSound();
    setConfig((c) => ({ ...c, players: n }));
    setTimeout(() => setStep("threshold"), 300);
  }

  function selectThreshold(val: number) {
    playClickSound();
    setConfig((c) => ({ ...c, threshold: val, customThreshold: "" }));
    setCustomMode(false);
    setCustomError("");
  }

  function handleCustomInput(val: string) {
    setConfig((c) => ({ ...c, customThreshold: val, threshold: null }));
    setCustomError("");
  }

  function confirmThreshold() {
    playClickSound();
    if (customMode) {
      const parsed = parseInt(config.customThreshold.replace(/,/g, ""), 10);
      if (isNaN(parsed) || parsed < 100) {
        setCustomError("Enter an amount of at least $100");
        return;
      }
      if (parsed > 1_000_000) {
        setCustomError("Maximum allowed is $1,000,000");
        return;
      }
      setConfig((c) => ({ ...c, threshold: parsed }));
    }
    setStep("ready");
  }

  const effectiveThreshold =
    customMode && config.customThreshold
      ? parseInt(config.customThreshold.replace(/,/g, ""), 10) || null
      : config.threshold;

  const canConfirm = customMode
    ? config.customThreshold.length > 0
    : config.threshold !== null;

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
    setHistory([]);

    setWinLimit(limit);
    setStage('BETTING');
    setActiveBettorIndex(0);
    setMessage(`Player 1's turn to bet. Choose chips!`);
    setGameWinner(null);
    playClickSound();
  };

  const handleRestartGame = useCallback(() => {
    setStage('SETUP');
    setStep('players');
    setConfig({ players: 0, threshold: null, customThreshold: "" });
    setCustomMode(false);
    setCustomError("");
    setPlayers([]);
    setHistory([]);
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
      const allBankrupt = currentPlayers.every((p) => p.isBankrupt);
      if (allBankrupt) {
        setStage('GAME_OVER');
        setMessage('All players went bankrupt! Game Over.');
      } else {
        setStage('ROUND_OVER');
      }
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

    const nextPlayers = players.map((p, idx) => {
      if (idx === currentPlayerIndex) {
        const isBankruptNow = newHand.isBusted && p.balance < 5;
        return {
          ...p,
          hand: newHand,
          shoe: drawn.remaining,
          isBankrupt: p.isBankrupt || isBankruptNow,
        };
      }
      return p;
    });
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

    const nextPlayers = players.map((p, idx) => {
      if (idx === currentPlayerIndex) {
        const nextBalance = p.balance - extraBet;
        const isBankruptNow = newHand.isBusted && nextBalance < 5;
        return {
          ...p,
          hand: newHand,
          shoe: drawn.remaining,
          balance: nextBalance,
          currentBet: doubledBet,
          isBankrupt: p.isBankrupt || isBankruptNow,
        };
      }
      return p;
    });
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
    const activePlayers = currentPlayers.filter((p) => !p.isBankrupt);

    const resetPlayers = activePlayers.map((p) => {
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

    const activePlayers = players.filter((p) => !p.isBankrupt);

    const nextPlayers = activePlayers.map((p) => {
      const betVal = p.previousBet > 0 && p.balance >= p.previousBet ? p.previousBet : 0;
      return {
        ...p,
        balance: p.balance - betVal,
        currentBet: betVal,
        hand: { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false },
        dealerHand: { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false },
      };
    });

    const allBetted = nextPlayers.every((p) => p.currentBet > 0);

    if (allBetted && nextPlayers.length > 0) {
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
    playClickSound();
    localStorage.removeItem('bj_multi_history');
    setHistory([]);
  };

  // --- RENDER SCREENS ---

  if (stage === 'SETUP') {
    return (
      <div
        className="size-full min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at center, #0a4f32 0%, #052618 65%)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Decorative felt arc */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: "55%",
            background: "transparent",
            border: "none",
            borderTop: "2px solid rgba(212,175,55,0.12)",
            borderRadius: "50% 50% 0 0 / 40% 40% 0 0",
          }}
        />

        {/* Floating suit icons */}
        {SUIT_ICONS.map((suit, i) => (
          <span
            key={i}
            className="absolute select-none pointer-events-none"
            style={{
              fontSize: i % 2 === 0 ? "5rem" : "3.5rem",
              opacity: 0.035,
              color: i === 1 || i === 2 ? "#e53e3e" : "#ffffff",
              top: i === 0 ? "8%" : i === 1 ? "72%" : i === 2 ? "15%" : "65%",
              left: i === 0 ? "5%" : i === 1 ? "4%" : i === 2 ? "88%" : "90%",
              transform: `rotate(${i * 12 - 10}deg)`,
            }}
          >
            {suit}
          </span>
        ))}

        {/* Main card */}
        <div
          className="relative w-full max-w-md mx-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(212,175,55,0.25)",
            borderRadius: "1.25rem",
            boxShadow: "0 0 60px rgba(212,175,55,0.08), 0 24px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div className="pt-8 pb-6 px-8 text-center border-b" style={{ borderColor: "rgba(212,175,55,0.15)" }}>
            <div className="flex justify-center gap-3 mb-3">
              {["♠", "♥"].map((s, i) => (
                <span key={i} style={{ color: i === 1 ? "#e53e3e" : "#d4af37", fontSize: "1.4rem", opacity: 0.9 }}>{s}</span>
              ))}
            </div>
            <h1
              style={{
                fontFamily: "'Outfit', 'Inter', sans-serif",
                fontSize: "2rem",
                fontWeight: 700,
                color: "#d4af37",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
                textShadow: "0 0 30px rgba(212,175,55,0.4)",
              }}
            >
              Royal Blackjack
            </h1>
            <p style={{ color: "rgba(245,240,232,0.45)", fontSize: "0.78rem", marginTop: "0.35rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              New Game Setup
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 py-4 px-8">
            {(["players", "threshold"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center rounded-full text-xs font-semibold transition-all duration-300"
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    background: step === s || (step === "ready" && i < 2)
                      ? "linear-gradient(135deg, #d4af37, #aa8c2c)"
                      : "rgba(255,255,255,0.08)",
                    color: step === s || (step === "ready" && i < 2) ? "#052618" : "rgba(245,240,232,0.4)",
                    border: step === s ? "1px solid #d4af37" : "1px solid rgba(255,255,255,0.1)",
                    boxShadow: step === s ? "0 0 12px rgba(212,175,55,0.35)" : "none",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                {i < 1 && (
                  <div
                    style={{
                      width: "2.5rem",
                      height: "1px",
                      background: step !== "players" ? "rgba(212,175,55,0.5)" : "rgba(255,255,255,0.12)",
                      transition: "background 0.3s",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="px-8 pb-8 text-white">
            {/* Step 1 — Players */}
            {step === "players" && (
              <div>
                <h2
                  style={{
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                    fontSize: "1.15rem",
                    color: "#f5f0e8",
                    marginBottom: "0.35rem",
                    fontWeight: 600,
                  }}
                >
                  Number of Players
                </h2>
                <p style={{ color: "rgba(245,240,232,0.45)", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
                  Choose how many players will join the table (1–4)
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => selectPlayers(n)}
                      className="group relative flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200"
                      style={{
                        padding: "1.25rem 0.5rem",
                        background: config.players === n
                          ? "linear-gradient(135deg, #d4af37, #aa8c2c)"
                          : "rgba(255,255,255,0.05)",
                        border: config.players === n
                          ? "1px solid #d4af37"
                          : "1px solid rgba(212,175,55,0.2)",
                        boxShadow: config.players === n
                          ? "0 0 20px rgba(212,175,55,0.3)"
                          : "none",
                        cursor: "pointer",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1.6rem",
                          fontFamily: "'Outfit', 'Inter', sans-serif",
                          fontWeight: 700,
                          color: config.players === n ? "#052618" : "#d4af37",
                          lineHeight: 1,
                        }}
                      >
                        {n}
                      </span>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          color: config.players === n ? "rgba(5,38,24,0.7)" : "rgba(245,240,232,0.4)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {n === 1 ? "Solo" : n === 2 ? "Duo" : n === 3 ? "Trio" : "Full"}
                      </span>
                    </button>
                  ))}
                </div>
                <p style={{ color: "rgba(245,240,232,0.3)", fontSize: "0.72rem", marginTop: "1rem", textAlign: "center" }}>
                  Select a number to continue
                </p>
              </div>
            )}

            {/* Step 2 — Threshold */}
            {step === "threshold" && (
              <div>
                <h2
                  style={{
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                    fontSize: "1.15rem",
                    color: "#f5f0e8",
                    marginBottom: "0.35rem",
                    fontWeight: 600,
                  }}
                >
                  Win Threshold
                </h2>
                <p style={{ color: "rgba(245,240,232,0.45)", fontSize: "0.8rem", marginBottom: "1.25rem" }}>
                  The first player to reach this amount wins the game
                </p>

                <div className="flex flex-col gap-2.5">
                  {THRESHOLD_PRESETS.map((val) => (
                    <button
                      key={val}
                      onClick={() => { selectThreshold(val); }}
                      className="flex items-center justify-between rounded-xl px-5 py-3.5 transition-all duration-200"
                      style={{
                        background: !customMode && config.threshold === val
                          ? "linear-gradient(135deg, #d4af37, #aa8c2c)"
                          : "rgba(255,255,255,0.05)",
                        border: !customMode && config.threshold === val
                          ? "1px solid #d4af37"
                          : "1px solid rgba(212,175,55,0.2)",
                        boxShadow: !customMode && config.threshold === val
                          ? "0 0 18px rgba(212,175,55,0.25)"
                          : "none",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          style={{
                            fontFamily: "'Outfit', 'Inter', sans-serif",
                            fontSize: "1.1rem",
                            fontWeight: 700,
                            color: !customMode && config.threshold === val ? "#052618" : "#d4af37",
                          }}
                        >
                          ${val.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: !customMode && config.threshold === val ? "rgba(5,38,24,0.65)" : "rgba(245,240,232,0.35)",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {val === 2500 ? "Quick game" : val === 5000 ? "Standard" : "High stakes"}
                        </span>
                      </div>
                      {!customMode && config.threshold === val && (
                        <span style={{ color: "#052618", fontSize: "0.9rem" }}>✓</span>
                      )}
                    </button>
                  ))}

                  {/* Custom input row */}
                  <button
                    onClick={() => { playClickSound(); setCustomMode(true); setConfig((c) => ({ ...c, threshold: null })); }}
                    className="flex flex-col rounded-xl px-5 py-3.5 transition-all duration-200 text-left"
                    style={{
                      background: customMode ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.05)",
                      border: customMode ? "1px solid rgba(212,175,55,0.5)" : "1px solid rgba(212,175,55,0.2)",
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        style={{
                          fontSize: "0.82rem",
                          color: customMode ? "#d4af37" : "rgba(245,240,232,0.55)",
                          fontWeight: 500,
                          letterSpacing: "0.04em",
                        }}
                      >
                        Custom amount
                      </span>
                      {customMode && (
                        <span style={{ color: "rgba(212,175,55,0.7)", fontSize: "0.72rem" }}>tap to edit</span>
                      )}
                    </div>
                    {customMode && (
                      <div className="flex items-center gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
                        <span style={{ color: "#d4af37", fontFamily: "'Outfit', 'Inter', sans-serif", fontSize: "1.1rem", fontWeight: 700 }}>$</span>
                        <input
                          autoFocus
                          type="number"
                          min={100}
                          max={1000000}
                          placeholder="Enter amount"
                          value={config.customThreshold}
                          onChange={(e) => handleCustomInput(e.target.value)}
                          className="flex-1 bg-transparent outline-none"
                          style={{
                            color: "#f5f0e8",
                            fontFamily: "'Outfit', 'Inter', sans-serif",
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            borderBottom: "1px solid rgba(212,175,55,0.4)",
                            paddingBottom: "2px",
                          }}
                        />
                      </div>
                    )}
                    {customError && (
                      <p style={{ color: "#e53e3e", fontSize: "0.72rem", marginTop: "0.5rem" }}>{customError}</p>
                    )}
                  </button>
                </div>

                {/* Action row */}
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => { playClickSound(); setStep("players"); }}
                    className="flex-1 rounded-xl py-3 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(245,240,232,0.6)",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={confirmThreshold}
                    disabled={!canConfirm}
                    className="flex-[2] rounded-xl py-3 font-semibold transition-all duration-200"
                    style={{
                      background: canConfirm
                        ? "linear-gradient(135deg, #d4af37, #aa8c2c)"
                        : "rgba(255,255,255,0.06)",
                      border: canConfirm ? "1px solid #d4af37" : "1px solid rgba(255,255,255,0.1)",
                      color: canConfirm ? "#052618" : "rgba(245,240,232,0.25)",
                      fontSize: "0.9rem",
                      cursor: canConfirm ? "pointer" : "not-allowed",
                      boxShadow: canConfirm ? "0 0 20px rgba(212,175,55,0.25)" : "none",
                    }}
                  >
                    Confirm →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Ready */}
            {step === "ready" && (
              <div className="text-center">
                <div
                  className="mx-auto mb-5 flex items-center justify-center rounded-full text-white"
                  style={{
                    width: "4rem",
                    height: "4rem",
                    background: "linear-gradient(135deg, #d4af37, #aa8c2c)",
                    boxShadow: "0 0 30px rgba(212,175,55,0.4)",
                    fontSize: "1.6rem",
                  }}
                >
                  ♠
                </div>
                <h2
                  style={{
                    fontFamily: "'Outfit', 'Inter', sans-serif",
                    fontSize: "1.35rem",
                    color: "#d4af37",
                    fontWeight: 700,
                    marginBottom: "0.4rem",
                  }}
                >
                  Ready to Deal
                </h2>
                <p style={{ color: "rgba(245,240,232,0.5)", fontSize: "0.8rem", marginBottom: "2rem" }}>
                  Your game is configured
                </p>

                {/* Summary */}
                <div
                  className="rounded-xl px-5 py-4 mb-6 text-left"
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    border: "1px solid rgba(212,175,55,0.2)",
                  }}
                >
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
                    <span style={{ color: "rgba(245,240,232,0.45)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Players</span>
                    <span style={{ fontFamily: "'Outfit', 'Inter', sans-serif", color: "#f5f0e8", fontWeight: 600, fontSize: "1rem" }}>
                      {config.players} {config.players === 1 ? "Player" : "Players"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span style={{ color: "rgba(245,240,232,0.45)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.1em" }}>Win at</span>
                    <span style={{ fontFamily: "'Outfit', 'Inter', sans-serif", color: "#d4af37", fontWeight: 700, fontSize: "1.1rem" }}>
                      ${effectiveThreshold?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleStartGame(config.players, effectiveThreshold || 5000)}
                  className="w-full rounded-xl py-3.5 font-semibold transition-all duration-200"
                  style={{
                    background: "linear-gradient(135deg, #d4af37, #aa8c2c)",
                    border: "1px solid #d4af37",
                    color: "#052618",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    boxShadow: "0 0 24px rgba(212,175,55,0.35)",
                  }}
                >
                  Start Game
                </button>
                <button
                  onClick={() => { playClickSound(); setStep("players"); setConfig({ players: 0, threshold: null, customThreshold: "" }); setCustomMode(false); }}
                  className="w-full mt-2.5 rounded-xl py-2.5 transition-all duration-200"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "rgba(245,240,232,0.35)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                >
                  Start over
                </button>
              </div>
            )}
          </div>
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
            playerNames={players.map((p) => p.name)}
          />
        }
      />
    </>
  );
}
