# Grand Royale Blackjack

A beautifully designed, interactive Blackjack game built with React, TypeScript, and Vite.

## Features
- **Classic Blackjack Rules:** Standard game loop with Hit, Stand, and Double Down mechanics. Dealer stands on 17. Blackjack pays 3:2.
- **Dynamic Betting System:** Select chip denominations to place bets, clear bets, or rebet after a round.
- **Premium UI/UX:** Features a custom-built, tailwind-like vanilla CSS utility system, complete with 3D card flipping animations, dynamic chip rendering, and glassmorphism styling.
- **Audio & Visual Feedback:** Immersive sound effects for card drawing, betting, winning, and losing, paired with confetti celebrations for Blackjacks and wins.
- **Persistent State:** Bankroll and game history are saved to local storage so you can pick up where you left off.

## Tech Stack
- **Frontend Framework:** [React 18](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** Custom Vanilla CSS Utility Engine (No external CSS frameworks required)

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Open your terminal and navigate to the project directory:
   ```bash
   cd BlackJack
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```

### Running the Game

To start the development server and play the game locally, run:
```bash
npm run dev
```
Then, open your browser and navigate to the URL provided in the terminal (usually `http://localhost:5173`).

### Building for Production

To create a production-ready build, run:
```bash
npm run build
```
The optimized files will be generated in the `dist` folder.

## How to Play
1. **Place Your Bet:** Click on the chips at the bottom of the screen to add them to your betting circle.
2. **Deal:** Once your bet is placed, click the "Deal" button to start the round.
3. **Player Action:** Choose to **Hit** (take another card), **Stand** (keep your current hand), or **Double Down** (double your bet and take exactly one more card).
4. **Dealer Action:** The dealer will reveal their hidden card and must hit until they reach 17 or higher.
5. **Outcome:** If your hand is closer to 21 than the dealer's without going over, you win!
