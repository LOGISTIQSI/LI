# LOGISTIQS Intelligence

An AI-powered operations command centre for African cross-border mining logistics. LOGISTIQS Intelligence connects mining companies with verified transport operators and continuously monitors every shipment across five critical dimensions: legal departure readiness, successful arrival probability, failure prediction, cost-at-risk analysis, and management action recommendations.

## Quick Start

```bash
# Install dependencies
npm install

# Seed the database with a comprehensive demo dataset and run GPS simulation
npm run demo

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the platform.

## Routes

| Route | Description |
|-------|-------------|
| `/` | **Operations Dashboard** — overview of all shipments, fleet status, and active alerts |
| `/shipments` | **Shipments List** — all shipments with filtering by status, date, and priority |
| `/shipments/new` | **New Shipment** — create a transport requirement |
| `/shipments/[id]` | **Shipment Detail** — full detail with MRS/OCS scores, compliance status, tracking map |
| `/tracking` | **Live Tracking Map** — GPS positions of all active shipments on a Leaflet map |
| `/compliance` | **Compliance Centre** — document status, expiry tracking, and compliance scores |
| `/fleet` | **Fleet Management** — drivers and vehicles with status overview |
| `/executive` | **Executive Dashboard** — high-level KPIs, risk summary, fleet overview |
| `/intelligence-brief` | **Daily Intelligence Brief** — AI-generated morning briefing with prioritised decisions |
| `/alerts` | **Alert Inbox** — all alerts with filtering, resolution tracking, and notification bell |
| `/settings` | **Settings** — placeholder for future configuration |

## Architecture

```
LOGISTIQS Intelligence
├── Frontend: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
├── Database: SQLite (via better-sqlite3)
├── Maps: Leaflet (no API key required)
├── AI Engines (deterministic, LLM-ready):
│   ├── Mission Readiness Score (MRS)  — 0-100, departure gate assessment
│   ├── Operational Confidence Score (OCS) — 0-1, probability of successful completion
│   ├── Compliance Analyzer — document completeness, expiry tracking, missing docs
│   ├── Border & External Risk — border wait times, route risk assessment
│   ├── Operations Intelligence — GPS tracking, route adherence, ETA prediction
│   └── Executive Decision Intelligence — daily brief with prioritised decisions
└── Demo Tools:
    ├── Seed script — comprehensive demo dataset with 4 companies, 10 drivers,
    │   8 vehicles, 12 shipments, 35+ compliance documents, 50+ trip events
    └── GPS Simulator — generates realistic movement along mining corridors
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server on port 3000 |
| `npm run build` | Build for production |
| `npm run demo` | **Seed database + run GPS simulation** — full pilot-ready dataset |
| `npm run seed` | Seed database only (no GPS simulation) |
| `npm run simulate-gps` | Run GPS simulation for all active shipments |

## Demo Dataset

The `npm run demo` command populates:

- **4 companies**: 2 mining (Kalahari Copper Mining, Zambezi Mineral Exports), 1 logistics, 1 transporter
- **10 drivers**: Realistic Southern African names with mixed statuses and DG endorsements
- **8 vehicles**: Volvo FH16, Scania R580, MAN TGX with ZA/ZM/ZW/BW plates
- **12 shipments** across 8 statuses on major mining corridors:
  - Lusaka → Durban (Copper Cathode)
  - Johannesburg → Lubumbashi (Mining Equipment)
  - Kolwezi → Walvis Bay (Cobalt Hydroxide)
  - Windhoek → Cape Town (Uranium Oxide)
  - Kitwe → Walvis Bay (Copper Concentrate)
  - Harare → Beira (Lithium Concentrate)
  - Chingola → Durban (Copper Anodes)
  - And more...
- **35+ compliance documents** with various statuses and expiry dates
- **50+ trip events** with GPS coordinates along actual mining corridors
- Auto-generated intelligence brief and compliance alerts

## Requirements

- Node.js 18+
- npm 8+
