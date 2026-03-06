-- ============================================
-- $MGC Magic Token — Database Schema
-- ============================================

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  wallet        VARCHAR(64) UNIQUE NOT NULL,
  name          VARCHAR(64) NOT NULL DEFAULT 'Anonymous',
  element       VARCHAR(16) NOT NULL DEFAULT 'fire',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game sessions table (each completed run)
CREATE TABLE IF NOT EXISTS game_sessions (
  id            SERIAL PRIMARY KEY,
  player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  wins          INTEGER NOT NULL DEFAULT 0,
  max_level     INTEGER NOT NULL DEFAULT 1,
  element       VARCHAR(16) NOT NULL DEFAULT 'fire',
  spells_cast   INTEGER NOT NULL DEFAULT 0,
  duration_secs INTEGER,
  played_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leaderboard view: best run per player
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.wallet,
  p.name,
  p.element,
  MAX(gs.wins)       AS best_wins,
  MAX(gs.max_level)  AS best_level,
  COUNT(gs.id)       AS total_games,
  SUM(gs.spells_cast) AS total_spells
FROM players p
LEFT JOIN game_sessions gs ON gs.player_id = p.id
GROUP BY p.id
ORDER BY best_wins DESC NULLS LAST;

-- Global stats view
CREATE OR REPLACE VIEW global_stats AS
SELECT
  COUNT(DISTINCT gs.player_id) AS total_players,
  COUNT(gs.id)                 AS total_games,
  COALESCE(SUM(gs.spells_cast), 0) AS total_spells_cast,
  COALESCE(MAX(gs.wins), 0)   AS highest_wins
FROM game_sessions gs;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_player  ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_wins    ON game_sessions(wins DESC);
CREATE INDEX IF NOT EXISTS idx_players_wallet        ON players(wallet);

-- ============================================
-- Tournament System
-- ============================================

-- Weekly tournaments
CREATE TABLE IF NOT EXISTS tournaments (
  id            SERIAL PRIMARY KEY,
  week_start    DATE NOT NULL UNIQUE,
  week_end      DATE NOT NULL,
  entry_fee     BIGINT NOT NULL DEFAULT 1000,
  prize_pool    BIGINT NOT NULL DEFAULT 0,
  status        VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tournament entries (players who paid)
CREATE TABLE IF NOT EXISTS tournament_entries (
  id              SERIAL PRIMARY KEY,
  tournament_id   INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id       INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  solana_wallet   VARCHAR(64) NOT NULL,
  tx_signature    VARCHAR(128) NOT NULL UNIQUE,
  best_wins       INTEGER NOT NULL DEFAULT 0,
  best_level      INTEGER NOT NULL DEFAULT 1,
  entered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, player_id)
);

-- Tournament ranked leaderboard view
CREATE OR REPLACE VIEW tournament_leaderboard AS
SELECT
  te.tournament_id,
  p.wallet,
  p.name,
  te.solana_wallet,
  te.best_wins,
  te.best_level,
  te.entered_at
FROM tournament_entries te
JOIN players p ON p.id = te.player_id
ORDER BY te.best_wins DESC, te.best_level DESC;

CREATE INDEX IF NOT EXISTS idx_tournament_entries_tourney ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_wins ON tournament_entries(best_wins DESC);
