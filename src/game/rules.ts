import { Hand, OutcomeType } from './types';

/**
 * Evaluates the final outcome of a round once both player and dealer turns are complete.
 * Returns the outcome type and the net payout factor (e.g. 1.5 for BJ, 1.0 for standard win, 0 for push, -1 for loss).
 */
export function evaluateOutcome(
  playerHand: Hand,
  dealerHand: Hand
): { outcome: OutcomeType; payoutFactor: number; message: string } {
  // If player busted, they lose immediately (even if dealer busts later)
  if (playerHand.isBusted) {
    return {
      outcome: 'LOSS',
      payoutFactor: -1,
      message: 'Bust! You lose your bet.',
    };
  }

  // If player has Blackjack
  if (playerHand.isBlackjack) {
    if (dealerHand.isBlackjack) {
      return {
        outcome: 'PUSH',
        payoutFactor: 0,
        message: 'Both have Blackjack! Push.',
      };
    } else {
      return {
        outcome: 'BLACKJACK',
        payoutFactor: 1.5,
        message: 'Blackjack! You win 3:2!',
      };
    }
  }

  // If dealer has Blackjack (and player does not, which was caught above)
  if (dealerHand.isBlackjack) {
    return {
      outcome: 'LOSS',
      payoutFactor: -1,
      message: 'Dealer has Blackjack! You lose.',
    };
  }

  // If dealer busted
  if (dealerHand.isBusted) {
    return {
      outcome: 'WIN',
      payoutFactor: 1,
      message: 'Dealer busts! You win!',
    };
  }

  // Compare final scores
  if (playerHand.score > dealerHand.score) {
    return {
      outcome: 'WIN',
      payoutFactor: 1,
      message: `You win with ${playerHand.score} vs Dealer's ${dealerHand.score}!`,
    };
  } else if (playerHand.score < dealerHand.score) {
    return {
      outcome: 'LOSS',
      payoutFactor: -1,
      message: `Dealer wins with ${dealerHand.score} vs your ${playerHand.score}.`,
    };
  } else {
    return {
      outcome: 'PUSH',
      payoutFactor: 0,
      message: `Push! Both scored ${playerHand.score}.`,
    };
  }
}

/**
 * Checks if the dealer should draw another card according to standard rules:
 * Dealer stands on all 17s (hard or soft) and hits on 16 or below.
 */
export function shouldDealerHit(dealerHand: Hand): boolean {
  // If dealer score is less than 17, they must hit.
  // If dealer score is 17 or higher, they must stand.
  return dealerHand.score < 17;
}
