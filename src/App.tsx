import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table } from './components/Table';
import { Hand } from './components/Hand';
import { Chips } from './components/Chips';
import { Controls } from './components/Controls';
import { History } from './components/History';
import { Confetti } from './components/Confetti';
import { Card, Hand as HandType, GameStage, RoundResult } from './game/types';
import { buildShoe, shuffle, draw } from './game/deck';
import { calculateHand } from './game/score';
import { evaluateOutcome, shouldDealerHit } from './game/rules';
import {
  playCardSound,
  playWinSound,
  playBlackjackSound,
  playLoseSound,
  playPushSound,
  playClickSound,
} from './utils/audio';

const INITIAL_BALANCE = 1000;
const SHOE_RESHUFFLE_THRESHOLD = 78; // 6 decks (312 cards) * 0.25 remaining = 78 cards

export const App: React.FC = () => {
  // --- Game State ---
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('bj_balance');
    return saved ? parseInt(saved, 10) : INITIAL_BALANCE;
  });
  
  const [currentBet, setCurrentBet] = useState<number>(0);
  const [previousBet, setPreviousBet] = useState<number>(0);
  
  const [shoe, setShoe] = useState<Card[]>(() => {
    return shuffle(buildShoe(6));
  });

  const [playerHand, setPlayerHand] = useState<HandType>({
    cards: [],
    score: 0,
    isSoft: false,
    isBusted: false,
    isBlackjack: false,
  });

  const [dealerHand, setDealerHand] = useState<HandType>({
    cards: [],
    score: 0,
    isSoft: false,
    isBusted: false,
    isBlackjack: false,
  });

  const [stage, setStage] = useState<GameStage>('BETTING');
  const [message, setMessage] = useState<string>('Place your bet to deal!');
  
  const [history, setHistory] = useState<RoundResult[]>(() => {
    const saved = localStorage.getItem('bj_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [confettiActive, setConfettiActive] = useState<boolean>(false);
  const [showReshuffledBanner, setShowReshuffledBanner] = useState<boolean>(false);

  // Keep references of state for use inside async timers to prevent closure stale state bugs
  const shoeRef = useRef<Card[]>(shoe);
  const currentBetRef = useRef<number>(currentBet);
  
  useEffect(() => {
    shoeRef.current = shoe;
  }, [shoe]);

  useEffect(() => {
    currentBetRef.current = currentBet;
  }, [currentBet]);

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem('bj_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('bj_history', JSON.stringify(history));
  }, [history]);

  // --- Betting Handlers ---
  const handleAddBet = useCallback((amount: number) => {
    if (stage !== 'BETTING') return;
    if (balance < amount) {
      setMessage("Not enough balance!");
      return;
    }
    setBalance((prev) => prev - amount);
    setCurrentBet((prev) => prev + amount);
    setMessage(`Bet increased by $${amount}`);
  }, [balance, stage]);

  const handleClearBet = useCallback(() => {
    if (stage !== 'BETTING') return;
    setBalance((prev) => prev + currentBet);
    setCurrentBet(0);
    setMessage('Bet cleared.');
  }, [currentBet, stage]);

  const handleResetTable = useCallback(() => {
    setPlayerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setDealerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setConfettiActive(false);
    setStage('BETTING');
    
    // Check reshuffle rule
    if (shoe.length < SHOE_RESHUFFLE_THRESHOLD) {
      setShoe(shuffle(buildShoe(6)));
      setShowReshuffledBanner(true);
      setMessage('Shoe reshuffled (75% depleted)');
      setTimeout(() => setShowReshuffledBanner(false), 3000);
    } else {
      setMessage('Place your bet to deal!');
    }
  }, [shoe.length]);

  const handleRebet = useCallback(() => {
    if (stage !== 'ROUND_OVER') return;
    if (previousBet === 0 || balance < previousBet) {
      setMessage('Cannot rebet: insufficient bankroll.');
      return;
    }
    
    // Reset hands
    setPlayerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setDealerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setConfettiActive(false);

    // Rebet balance adjustments
    const bet = previousBet;
    setBalance((prev) => prev - bet);
    setCurrentBet(bet);

    // Trigger deal
    setStage('DEALING');
    setMessage('Dealing...');
    
    let tempShoe = [...shoe];
    if (tempShoe.length < SHOE_RESHUFFLE_THRESHOLD) {
      tempShoe = shuffle(buildShoe(6));
      setShoe(tempShoe);
      setShowReshuffledBanner(true);
      setTimeout(() => setShowReshuffledBanner(false), 3000);
    }

    triggerDealSequence(tempShoe, bet);
  }, [balance, previousBet, stage, shoe]);

  // --- Core Game Deal Flow ---
  const triggerDealSequence = (activeShoe: Card[], activeBet: number) => {
    let currentShoe = [...activeShoe];
    
    const pCards: Card[] = [];
    const dCards: Card[] = [];

    // Step 1: Card 1 to Player (100ms)
    setTimeout(() => {
      const drawn = draw(currentShoe);
      pCards.push(drawn.card);
      currentShoe = drawn.remaining;
      setPlayerHand(calculateHand(pCards));
      playCardSound();
    }, 100);

    // Step 2: Card 2 to Dealer (400ms)
    setTimeout(() => {
      const drawn = draw(currentShoe);
      dCards.push(drawn.card);
      currentShoe = drawn.remaining;
      setDealerHand(calculateHand(dCards));
      playCardSound();
    }, 400);

    // Step 3: Card 3 to Player (700ms)
    setTimeout(() => {
      const drawn = draw(currentShoe);
      pCards.push(drawn.card);
      currentShoe = drawn.remaining;
      setPlayerHand(calculateHand(pCards));
      playCardSound();
    }, 700);

    // Step 4: Card 4 to Dealer (Face Down) (1000ms)
    setTimeout(() => {
      const drawn = draw(currentShoe);
      // Mark as hidden
      const hiddenCard = { ...drawn.card, isHidden: true };
      dCards.push(hiddenCard);
      currentShoe = drawn.remaining;
      
      // Compute dealer hand (ignores hidden card internally)
      setDealerHand(calculateHand(dCards));
      setShoe(currentShoe);
      playCardSound();
    }, 1000);

    // Step 5: Check Blackjack and handoff to player (1300ms)
    setTimeout(() => {
      const currentPH = calculateHand(pCards);

      // Check player Blackjack
      if (currentPH.isBlackjack) {
        // Dealer checks for Blackjack immediately
        const finalDealerCards = dCards.map(c => ({ ...c, isHidden: false }));
        setDealerHand(calculateHand(finalDealerCards));

        const finalDH = calculateHand(finalDealerCards);
        const { outcome, payoutFactor, message: winMsg } = evaluateOutcome(currentPH, finalDH);

        resolveRound(outcome, payoutFactor, winMsg, currentPH, finalDH, activeBet);
      } else {
        setStage('PLAYER_TURN');
        setMessage('Hit, Stand, or Double Down?');
      }
    }, 1300);
  };

  const handleDeal = useCallback(() => {
    if (stage !== 'BETTING' || currentBet === 0) return;
    setStage('DEALING');
    setMessage('Dealing...');
    triggerDealSequence(shoe, currentBet);
  }, [currentBet, stage, shoe]);

  // --- Player Hand Actions ---
  const handleHit = useCallback(() => {
    if (stage !== 'PLAYER_TURN') return;
    
    const drawn = draw(shoe);
    const updatedCards = [...playerHand.cards, drawn.card];
    const newHand = calculateHand(updatedCards);
    
    setPlayerHand(newHand);
    setShoe(drawn.remaining);
    playCardSound();

    if (newHand.isBusted) {
      // Reveal dealer card and resolve loss
      const revealedDealerCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
      const newDealerHand = calculateHand(revealedDealerCards);
      setDealerHand(newDealerHand);

      const { outcome, payoutFactor, message: winMsg } = evaluateOutcome(newHand, newDealerHand);
      resolveRound(outcome, payoutFactor, winMsg, newHand, newDealerHand, currentBet);
    } else if (newHand.score === 21) {
      // Automatic stand on 21
      handleStandWithHand(newHand, drawn.remaining);
    }
  }, [stage, shoe, playerHand, dealerHand, currentBet]);

  const handleStand = useCallback(() => {
    if (stage !== 'PLAYER_TURN') return;
    handleStandWithHand(playerHand, shoe);
  }, [stage, playerHand, shoe]);

  // Helper stand handler that can take a specific player hand state
  const handleStandWithHand = (pHand: HandType, activeShoe: Card[]) => {
    setStage('DEALER_TURN');
    setMessage("Dealer's turn...");

    // 1. Reveal dealer hidden card
    const revealedDealerCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
    const newDealerHand = calculateHand(revealedDealerCards);
    setDealerHand(newDealerHand);
    playCardSound();

    // 2. Begin dealer drawing loop with delay
    setTimeout(() => {
      runDealerTurn(pHand, newDealerHand, activeShoe);
    }, 800);
  };

  const handleDoubleDown = useCallback(() => {
    if (stage !== 'PLAYER_TURN') return;
    if (balance < currentBet) {
      setMessage('Not enough balance to double!');
      return;
    }

    // Deduct double amount from balance and update bet
    const extraBet = currentBet;
    setBalance((prev) => prev - extraBet);
    const doubledBet = currentBet * 2;
    setCurrentBet(doubledBet);

    // Draw exactly one card
    const drawn = draw(shoe);
    const updatedCards = [...playerHand.cards, drawn.card];
    const newPH = calculateHand(updatedCards);
    
    setPlayerHand(newPH);
    setShoe(drawn.remaining);
    playCardSound();

    if (newPH.isBusted) {
      // Reveal dealer card and resolve loss
      const revealedDealerCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
      const newDealerHand = calculateHand(revealedDealerCards);
      setDealerHand(newDealerHand);

      const { outcome, payoutFactor, message: winMsg } = evaluateOutcome(newPH, newDealerHand);
      resolveRound(outcome, payoutFactor, winMsg, newPH, newDealerHand, doubledBet);
    } else {
      // Stand immediately and resolve dealer
      setStage('DEALER_TURN');
      setMessage("Dealer's turn...");

      const revealedDealerCards = dealerHand.cards.map((c) => ({ ...c, isHidden: false }));
      const newDealerHand = calculateHand(revealedDealerCards);
      setDealerHand(newDealerHand);
      playCardSound();

      setTimeout(() => {
        runDealerTurn(newPH, newDealerHand, drawn.remaining, doubledBet);
      }, 800);
    }
  }, [stage, shoe, playerHand, dealerHand, currentBet, balance]);

  // --- Dealer AI Loop ---
  const runDealerTurn = (pHand: HandType, dHand: HandType, activeShoe: Card[], activeBetVal?: number) => {
    const betVal = activeBetVal !== undefined ? activeBetVal : currentBetRef.current;
    
    if (shouldDealerHit(dHand)) {
      const drawn = draw(activeShoe);
      const updatedCards = [...dHand.cards, drawn.card];
      const newDealerHand = calculateHand(updatedCards);
      
      setDealerHand(newDealerHand);
      setShoe(drawn.remaining);
      playCardSound();

      setTimeout(() => {
        runDealerTurn(pHand, newDealerHand, drawn.remaining, betVal);
      }, 800);
    } else {
      // Stand. Resolve winner
      const { outcome, payoutFactor, message: winMsg } = evaluateOutcome(pHand, dHand);
      resolveRound(outcome, payoutFactor, winMsg, pHand, dHand, betVal);
    }
  };

  // --- Resolve Round & Payouts ---
  const resolveRound = (
    outcome: 'WIN' | 'LOSS' | 'PUSH' | 'BLACKJACK',
    payoutFactor: number,
    winMsg: string,
    pHand: HandType,
    dHand: HandType,
    activeBet: number
  ) => {
    // Calculate Payout details
    // If win: player gets back bet + payout (e.g. 1.0 * bet -> returns 2.0 * bet total).
    // If Blackjack: player gets back bet + payout (e.g. 1.5 * bet -> returns 2.5 * bet total).
    // If push: player gets back bet (1.0 * bet returned -> total return = 1.0 * bet).
    // If loss: player gets back 0.
    const balanceChange = activeBet + activeBet * payoutFactor;

    setBalance((prev) => prev + balanceChange);
    setPreviousBet(activeBet);
    setCurrentBet(0);
    setStage('ROUND_OVER');
    setMessage(winMsg);

    // Play outcome sounds
    if (outcome === 'BLACKJACK') {
      playBlackjackSound();
      setConfettiActive(true);
    } else if (outcome === 'WIN') {
      playWinSound();
      setConfettiActive(true);
    } else if (outcome === 'LOSS') {
      playLoseSound();
    } else if (outcome === 'PUSH') {
      playPushSound();
    }

    // Add result to history
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Net profit represents how much balance changed compared to before the bet was placed.
    // E.g. if we bet $100 and win, profit = +100. If we lose, profit = -100.
    let netGain = -activeBet;
    if (outcome === 'WIN') netGain = activeBet;
    else if (outcome === 'BLACKJACK') netGain = activeBet * 1.5;
    else if (outcome === 'PUSH') netGain = 0;

    const newResult: RoundResult = {
      id: Math.random().toString(36).substr(2, 9),
      outcome,
      amount: netGain,
      playerScore: pHand.score,
      dealerScore: dHand.score,
      timestamp,
    };

    setHistory((prev) => [newResult, ...prev]);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('bj_history');
    setHistory([]);
  };

  // Bankruptcy Relief check / Game Over Reset
  const handleBankruptcyRelief = () => {
    playClickSound();
    setBalance(INITIAL_BALANCE);
    setPreviousBet(0);
    setCurrentBet(0);
    setPlayerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setDealerHand({ cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false });
    setMessage('Game restarted! Place your bet.');
  };

  const isBroke = balance < 5 && currentBet === 0 && stage === 'BETTING';

  return (
    <>
      {confettiActive && <Confetti />}
      
      <Table
        balance={balance}
        currentBet={currentBet}
        stage={stage}
        message={message}
        dealerComponent={<Hand title="Dealer" hand={dealerHand} />}
        playerComponent={
          <div className="flex flex-col items-center w-full">
            <Hand title="Player" hand={playerHand} />
            {isBroke && (
              <div className="flex flex-col items-center gap-3 mt-4 p-4 bg-red-950/40 border border-red-500/20 rounded-2xl backdrop-blur-md animate-pulse">
                <span className="text-lg sm:text-xl font-extrabold text-red-500 tracking-widest uppercase font-outfit">
                  🚨 Game Over 🚨
                </span>
                <p className="text-xs text-white/50 text-center max-w-[200px] leading-relaxed">
                  You ran out of playable cash. Restart to play again.
                </p>
                <button
                  onClick={handleBankruptcyRelief}
                  className="btn-action btn-primary text-xs"
                >
                  Restart Game
                </button>
              </div>
            )}
          </div>
        }
        chipsComponent={
          <Chips
            onAddBet={handleAddBet}
            balance={balance}
            disabled={stage !== 'BETTING'}
          />
        }
        controlsComponent={
          <Controls
            stage={stage}
            currentBet={currentBet}
            balance={balance}
            onDeal={handleDeal}
            onHit={handleHit}
            onStand={handleStand}
            onDoubleDown={handleDoubleDown}
            onClearBet={handleClearBet}
            onRebet={handleRebet}
            onResetTable={handleResetTable}
          />
        }
        historyComponent={<History history={history} onClearHistory={handleClearHistory} />}
      />

      {/* Decorative Reshuffle banner top pop */}
      {showReshuffledBanner && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-slate-900 font-bold px-4 py-2 rounded-xl shadow-lg border border-yellow-300 z-50 text-xs tracking-wider uppercase animate-bounce">
          🔄 Shoe Reshuffled
        </div>
      )}
    </>
  );
};
export default App;
