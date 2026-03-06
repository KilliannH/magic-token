# ✨ $MGC — Magic Token

Landing page + Wizard Wars game for the $MGC memecoin on Solana.

## Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Styling**: Custom CSS

## Project Structure

```
mgc-project/
├── backend/
│   ├── server.js          # Express API server
│   ├── db.js              # PostgreSQL connection & queries
│   ├── schema.sql         # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Navbar.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx   # Landing page
│   │   │   └── Game.jsx   # Wizard Wars game
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   └── home.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Setup

### 1. PostgreSQL

You need a PostgreSQL database. Options:

**Local (Mac):**
```bash
brew install postgresql@16
brew services start postgresql@16
createdb mgc
```

**Local (Ubuntu/Debian):**
```bash
sudo apt install postgresql
sudo -u postgres createdb mgc
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

**Hosted (easiest for deployment):**
- [Neon](https://neon.tech) — free tier, serverless
- [Supabase](https://supabase.com) — free tier
- [Railway](https://railway.app) — easy deploy
- Create a database and copy the connection URL

### 2. Environment

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your database URL:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mgc
```

For hosted DBs, set `DATABASE_SSL=true`.

### 3. Install & Run

```bash
npm run install:all
npm install
npm run dev
```

This starts:
- Frontend → `http://localhost:5173`
- Backend → `http://localhost:3001`

The schema is applied automatically on first startup.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/leaderboard?limit=20` | Top players (best run) |
| POST | `/api/leaderboard` | Submit game `{ wallet, name, wins, level, element, spellsCast, duration }` |
| GET | `/api/stats` | Global stats (total games, players, spells) |
| GET | `/api/player/:wallet` | Player profile + rank |

## Database Schema

- **players** — wallet, name, element, timestamps
- **game_sessions** — each completed game run (wins, level, spells cast, duration)
- **leaderboard** (view) — best run per player, auto-ranked
- **global_stats** (view) — aggregated totals

## Production Deploy

```bash
npm run build
NODE_ENV=production DATABASE_URL=your_url npm start
```

The backend serves the built frontend + API from a single process.

## Links

- Twitter: [@proposto_mgc](https://x.com/proposto_mgc)
- Telegram: [Community](https://t.me/solanatipcommunitydiscussion)

---

*It's a Magic Token.* ✨
