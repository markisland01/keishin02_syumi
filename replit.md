# Keishin Score Simulator (経審スコアシミュレーター)

## Project Overview
A React-based simulator for Japanese construction companies to estimate their "P-score" (総合評定値 - General Evaluation Score). The P-score is used to rank construction firms for bidding on public works projects.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite 5
- **Charting:** Recharts 2
- **Language:** JavaScript (JSX)
- **Package Manager:** npm

## Project Structure
```
src/
  main.jsx           - Application entry point
  App.jsx            - Main dashboard component (state & layout)
  components/
    PScoreChart.jsx  - Score projection chart (Recharts)
    YearPanel.jsx    - Per-year data editing panel
  utils/
    calculations.js  - Core P-score calculation logic
```

## Score Formula
P = 0.25×X1 + 0.15×X2 + 0.20×Y + 0.25×Z + 0.15×W

- **X1** – Revenue score (2-3 year average, 42-step table)
- **X2** – Equity/profit score (47-step and 37-step tables)
- **Y** – Management analysis (Simple 4-indicator or Full 8-indicator MLIT formula)
- **Z** – Technical ability (qualified engineers, Level 1 & 2)
- **W** – Social contribution (insurance, ISO, retirement plans, etc.)

## Development
```bash
npm install
npm run dev   # starts on port 5000
```

## Deployment
Configured as a **static** deployment:
- Build: `npm run build`
- Public dir: `dist`
