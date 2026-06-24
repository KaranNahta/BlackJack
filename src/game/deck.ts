import { Card, Suit, CardValue } from './types';

const SUITS: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
const VALUES: CardValue[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
];

/**
 * Creates a shoe containing the specified number of standard 52-card decks.
 */
export function buildShoe(deckCount: number = 6): Card[] {
  const shoe: Card[] = [];
  for (let d = 0; d < deckCount; d++) {
    for (const suit of SUITS) {
      for (const value of VALUES) {
        shoe.push({
          id: `${suit}-${value}-${d}-${Math.random().toString(36).substr(2, 4)}`,
          suit,
          value,
        });
      }
    }
  }
  return shoe;
}

/**
 * Shuffles an array of cards in-place (or returning a new array) using the Fisher-Yates algorithm.
 */
export function shuffle(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draws a single card from the top of the deck.
 */
export function draw(deck: Card[]): { card: Card; remaining: Card[] } {
  if (deck.length === 0) {
    throw new Error('Cannot draw from an empty deck shoe.');
  }
  const remaining = [...deck];
  const card = remaining.shift()!;
  return { card, remaining };
}
