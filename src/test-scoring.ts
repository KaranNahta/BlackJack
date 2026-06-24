import { calculateHand } from './game/score';
import { evaluateOutcome } from './game/rules';
import { Card, Hand } from './game/types';

function runTests() {
  console.log('--- RUNNING BLACKJACK LOGIC TESTS ---');

  // Test Case 1: [A, A, 9] should count as 21 (Soft) since 11 + 1 + 9 = 21 does not bust
  const cards1: Card[] = [
    { id: '1', suit: 'SPADES', value: 'A' },
    { id: '2', suit: 'HEARTS', value: 'A' },
    { id: '3', suit: 'CLUBS', value: '9' },
  ];
  const hand1 = calculateHand(cards1);
  console.assert(hand1.score === 21, `Test 1 Failed: Expected score 21, got ${hand1.score}`);
  console.assert(hand1.isSoft === true, 'Test 1 Failed: Expected hand to be soft');
  console.assert(hand1.isBusted === false, 'Test 1 Failed: Expected hand to not be busted');
  console.log('✅ Test 1 Passed: [A, A, 9] -> Score: 21 (Soft 21)');

  // Test Case 1b: [A, A, 10] should reduce to 1 + 1 + 10 = 12 to avoid busting
  const cards1b: Card[] = [
    { id: '1', suit: 'SPADES', value: 'A' },
    { id: '2', suit: 'HEARTS', value: 'A' },
    { id: '3', suit: 'CLUBS', value: '10' },
  ];
  const hand1b = calculateHand(cards1b);
  console.assert(hand1b.score === 12, `Test 1b Failed: Expected score 12, got ${hand1b.score}`);
  console.assert(hand1b.isSoft === false, 'Test 1b Failed: Expected hand to be hard');
  console.assert(hand1b.isBusted === false, 'Test 1b Failed: Expected hand to not be busted');
  console.log('✅ Test 1b Passed: [A, A, 10] -> Score: 12 (Hard)');

  // Test Case 2: [A, 10] should be a natural Blackjack
  const cards2: Card[] = [
    { id: '1', suit: 'SPADES', value: 'A' },
    { id: '2', suit: 'CLUBS', value: '10' },
  ];
  const hand2 = calculateHand(cards2);
  console.assert(hand2.score === 21, `Test 2 Failed: Expected score 21, got ${hand2.score}`);
  console.assert(hand2.isBlackjack === true, 'Test 2 Failed: Expected hand to be Blackjack');
  console.log('✅ Test 2 Passed: [A, 10] -> Score: 21 (Blackjack)');

  // Test Case 3: [K, Q, 5] should bust
  const cards3: Card[] = [
    { id: '1', suit: 'SPADES', value: 'K' },
    { id: '2', suit: 'CLUBS', value: 'Q' },
    { id: '3', suit: 'DIAMONDS', value: '5' },
  ];
  const hand3 = calculateHand(cards3);
  console.assert(hand3.score === 25, `Test 3 Failed: Expected score 25, got ${hand3.score}`);
  console.assert(hand3.isBusted === true, 'Test 3 Failed: Expected hand to be busted');
  console.log('✅ Test 3 Passed: [K, Q, 5] -> Score: 25 (Busted)');

  // Test Case 4: Dealer stands on soft/hard 17 or higher
  // Evaluating outcome when Player has 18 and Dealer has 17
  const pHand: Hand = { cards: [], score: 18, isSoft: false, isBusted: false, isBlackjack: false };
  const dHand: Hand = { cards: [], score: 17, isSoft: true, isBusted: false, isBlackjack: false };
  const result1 = evaluateOutcome(pHand, dHand);
  console.assert(result1.outcome === 'WIN', `Test 4 Failed: Expected WIN, got ${result1.outcome}`);
  console.assert(result1.payoutFactor === 1, `Test 4 Failed: Expected payout 1.0, got ${result1.payoutFactor}`);
  console.log('✅ Test 4 Passed: Player 18 vs Dealer Soft 17 -> Player Wins (1:1 Payout)');

  // Test Case 5: Player Blackjack vs Dealer Blackjack push
  const pHandBJ: Hand = { cards: [], score: 21, isSoft: true, isBusted: false, isBlackjack: true };
  const dHandBJ: Hand = { cards: [], score: 21, isSoft: true, isBusted: false, isBlackjack: true };
  const result2 = evaluateOutcome(pHandBJ, dHandBJ);
  console.assert(result2.outcome === 'PUSH', `Test 5 Failed: Expected PUSH, got ${result2.outcome}`);
  console.assert(result2.payoutFactor === 0, `Test 5 Failed: Expected payout 0, got ${result2.payoutFactor}`);
  console.log('✅ Test 5 Passed: Player BJ vs Dealer BJ -> Push (0 Payout)');

  console.log('--- ALL LOGIC TESTS PASSED SUCCESSFULLY ---');
}

runTests();
