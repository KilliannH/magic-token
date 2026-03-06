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
