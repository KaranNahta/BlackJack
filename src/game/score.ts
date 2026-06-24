import { Card, Hand } from './types';

/**
 * Calculates the score of a hand of cards, returning the full Hand object
 * including score, soft status, bust status, blackjack status, and the cards.
 */
export function calculateHand(cards: Card[]): Hand {
  // If there are no cards, return empty hand
  if (cards.length === 0) {
    return { cards: [], score: 0, isSoft: false, isBusted: false, isBlackjack: false };
  }

  // Filter hidden cards from scoring (like the dealer's hidden card)
  const activeCards = cards.filter((card) => !card.isHidden);
  
  let score = 0;
  let aceCount = 0;

  for (const card of activeCards) {
    if (card.value === 'A') {
      aceCount++;
      score += 11;
    } else if (['K', 'Q', 'J', '10'].includes(card.value)) {
      score += 10;
    } else {
      score += parseInt(card.value, 10);
    }
  }

  // Convert Aces from 11 to 1 if we are busting
  let isSoft = aceCount > 0;
  while (score > 21 && aceCount > 0) {
    score -= 10;
    aceCount--;
  }

  // A soft hand is one where at least one Ace is valued at 11
  // If all Aces are reduced to 1 (aceCount becomes 0 in loop), it is a hard hand
  isSoft = aceCount > 0;

  const isBusted = score > 21;
  
  // Blackjack requires exactly 2 cards and a score of 21 (all cards in the original hand, none hidden)
  const isBlackjack = cards.length === 2 && score === 21 && cards.every(c => !c.isHidden);

  return { cards, score, isSoft, isBusted, isBlackjack };
}
