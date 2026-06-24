# Grand Royale Blackjack (Multiplayer Edition)

A beautifully designed, interactive local multiplayer Blackjack game built with React, TypeScript, and Vite.

## Features
- **Local Pass-and-Play Multiplayer (1-4 Players):** Gather friends around the same screen to play at the same casino felt table. Start players with $1,000 each and make independent bids.
- **Victory Limit & Bankrupt Mechanics:**
  - Setup asks for victory targets (default $5,000). Reaching this threshold wins the entire table.
  - Bankrupt players (balance < $5 minimum bet) are automatically skipped from rounds.
- **Dynamic Seating & Desktop Layouts (Zero Scroll):**
  - Player boxes automatically resize and layout according to active, non-bankrupt players.
  - **1 Player:** Centered single box.
  - **2 Players:** 2 columns side-by-side.
  - **3 Players:** 2-column pyramid (Player 1 & 2 side-by-side, Player 3 centered below) to fit the screen vertically.
  - **4 Players:** 2x2 grid (2 left, 2 right) with super-compact sizing to completely eliminate vertical scrollbars.
  - If a player goes bankrupt, their box is hidden, and the grid dynamically resizes on the fly!
- **Separate Decks per Seat:** The dealer plays a separate hand against each player using that player's specific shoe/deck, mimicking independent casino action.
- **Ivory VIP Setup & Custom Goal Tiers:**
  - Sleek, high-contrast setup dashboard styling (`bg-[#fbfaf5]` with gold outline) utilizing black/slate font selections for readability.
  - Presets forvictory targets (💎 **VIP Standard** $2,500, 👑 **High Roller** $5,000, 🏆 **Royale Legend** $10,000) or enter custom amounts.
- **Collapsible Stats Dashboard:** Pushed stats summaries, ratio bars, and player-tagged logs into an elegant slide-up drawer at the bottom of the table to preserve workspace.

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
Then, open your browser and navigate to `http://localhost:5173`.

### Building for Production

To create a production-ready build, run:
```bash
npm run build
```
The optimized files will be generated in the `dist` folder.

## How to Play
1. **Configure Table:** Set the player count (1-4) and target win limit on the high-contrast VIP setup card.
2. **Sequential Betting:** Active players take turns choosing chips at the bottom and clicking **Confirm Bet**.
3. **Take Actions:** Dealt players take sequential actions: **Hit**, **Stand**, or **Double Down**.
4. **Dealer AI Draws:** The dealer plays out sequentially against each player's cards from their corresponding shoe.
5. **Winning:** The first player to reach the target amount wins!
