export type Suit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES';

export type CardValue =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface Card {
  id: string;
  suit: Suit;
  value: CardValue;
  isHidden?: boolean;
}

export interface Hand {
  cards: Card[];
  score: number;
  isSoft: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
}

export type GameStage =
  | 'SETUP'
  | 'BETTING'
  | 'DEALING'
  | 'PLAYER_TURN'
  | 'DEALER_TURN'
  | 'ROUND_OVER'
  | 'GAME_OVER';

export type OutcomeType = 'WIN' | 'LOSS' | 'PUSH' | 'BLACKJACK';

export interface RoundResult {
  id: string;
  playerName: string;
  outcome: OutcomeType;
  amount: number; // positive for win, negative for loss, 0 for push
  playerScore: number;
  dealerScore: number;
  timestamp: string;
}

export interface PlayerState {
  id: number;
  name: string;
  balance: number;
  currentBet: number;
  previousBet: number;
  hand: Hand;
  dealerHand: Hand;
  shoe: Card[];
  isBankrupt: boolean;
}

export interface GameState {
  deck: Card[];
  playerHand: Hand;
  dealerHand: Hand;
  balance: number;
  currentBet: number;
  stage: GameStage;
  history: RoundResult[];
  message: string;
}

