# ◆ VRS Predict Dashboard
### CS2 Regional Standings Prediction Engine

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-orange.svg)
![CS2](https://img.shields.io/badge/CS2-Regional_Standings-white.svg)

**VRS Predict** is an interactive dashboard designed to analyze, visualize, and predict Counter-Strike 2 regional rankings based on Valve’s official Regional Standings (VRS) data.

---

## 🚀 Overview

This project builds upon the open-source VRS model to provide:
- **Trend Visualization**: Historical FRV data across 40+ snapshots (2024–2026).
- **Prediction Engine**: Linear and weighted regression models to forecast future rankings.
- **Regional Insights**: Filters for Europe, Americas, and Asia regions.
- **Team Explorer**: Deep dive into specific team histories, rosters, and confidence intervals.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript + Vite + [Chart.js](https://www.chartjs.org/)
- **Data Pipeline**: Node.js parser for Markdown → JSON conversion.
- **Styling**: Modern CSS with CS2-inspired dark theme and glassmorphism.
- **Analytics**: Linear regression for time-series forecasting.

## 📊 Credits & Acknowledgments

This project is a fork and enhancement of several community and official resources. Full credit goes to:

- **Official VRS Model**: [ValveSoftware/counter-strike_regional_standings](https://github.com/ValveSoftware/counter-strike_regional_standings) — The original ranking logic and invitation system.
- **Independent Data Source**: [OpenVRS / MischiefCS](https://github.com/OpenVRS/counter-strike_regional_standings) — For the critical work in maintaining updated regional snapshots, the Liquipedia grabber, and matchdata samples.
- **Data Providers**: Liquipedia (database access) and GRID Esports (official data support).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/VRS-Predict.git
   cd VRS-Predict
   ```

2. Install dashboard dependencies:
   ```bash
   cd dashboard
   npm install
   ```

3. (Optional) Regenerate the data snapshot:
   ```bash
   # From the root directory
   node scripts/parser.cjs
   ```

### Running Locally
```bash
cd dashboard
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) to view the dashboard.

---

## ⚖️ Disclaimer
This project is **unofficial** and not affiliated with Valve Corporation. Predictions are based on historical data and mathematical models; actual invite lists should be verified at the [official Valve repository](https://github.com/ValveSoftware/counter-strike_regional_standings).

---
*Created by S3baS02 for the Counter-Strike community.*
