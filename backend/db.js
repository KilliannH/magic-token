import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// ============ CONNECTION ============

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('  ❌ Unexpected DB pool error:', err.message);
});

// ============ INIT ============

export async function initDB() {
  try {
    const client = await pool.connect();
    console.log('  ✅ Connected to PostgreSQL');

    // Run schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await client.query(schema);
    console.log('  ✅ Schema applied');

    client.release();
  } catch (err) {
    console.error('  ❌ DB init failed:', err.message);
    console.error('  💡 Make sure DATABASE_URL is set in .env');
    process.exit(1);
  }
}

// ============ PLAYERS ============

export async function findOrCreatePlayer(wallet, name, element) {
  // Try to find existing player
  const existing = await pool.query(
    'SELECT id, wallet, name, element FROM players WHERE wallet = $1',
    [wallet]
  );

  if (existing.rows.length > 0) {
    // Update name/element if changed
    await pool.query(
      'UPDATE players SET name = $1, element = $2, updated_at = NOW() WHERE wallet = $3',
      [name, element, wallet]
    );
    return existing.rows[0];
  }

  // Create new player
  const result = await pool.query(
    'INSERT INTO players (wallet, name, element) VALUES ($1, $2, $3) RETURNING id, wallet, name, element',
    [wallet, name, element]
  );
  return result.rows[0];
}

export async function getPlayer(wallet) {
  const result = await pool.query(
    `SELECT
      p.wallet, p.name, p.element, p.created_at,
      COALESCE(MAX(gs.wins), 0)        AS best_wins,
      COALESCE(MAX(gs.max_level), 0)   AS best_level,
      COUNT(gs.id)                      AS total_games,
      COALESCE(SUM(gs.spells_cast), 0) AS total_spells
    FROM players p
    LEFT JOIN game_sessions gs ON gs.player_id = p.id
    WHERE p.wallet = $1
    GROUP BY p.id`,
    [wallet]
  );

  if (result.rows.length === 0) return null;

  // Get rank
  const rankResult = await pool.query(
    `SELECT COUNT(*) + 1 AS rank FROM leaderboard
     WHERE best_wins > (SELECT COALESCE(MAX(wins), 0) FROM game_sessions gs JOIN players p ON p.id = gs.player_id WHERE p.wallet = $1)`,
    [wallet]
  );

  return {
    ...result.rows[0],
    rank: parseInt(rankResult.rows[0].rank),
  };
}

// ============ GAME SESSIONS ============

export async function submitGameSession({ wallet, name, wins, level, element, spellsCast, duration }) {
  const player = await findOrCreatePlayer(wallet, name, element);

  const result = await pool.query(
    `INSERT INTO game_sessions (player_id, wins, max_level, element, spells_cast, duration_secs)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [player.id, wins, level || 1, element || 'fire', spellsCast || 0, duration || null]
  );

  // Get rank
  const rankResult = await pool.query(
    `SELECT COUNT(*) + 1 AS rank FROM leaderboard WHERE best_wins > $1`,
    [wins]
  );

  return {
    sessionId: result.rows[0].id,
    rank: parseInt(rankResult.rows[0].rank),
  };
}

// ============ LEADERBOARD ============

export async function getLeaderboard(limit = 20) {
  const result = await pool.query(
    `SELECT wallet, name, element, best_wins, best_level, total_games, total_spells
     FROM leaderboard
     WHERE best_wins > 0
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// ============ GLOBAL STATS ============

export async function getGlobalStats() {
  const result = await pool.query('SELECT * FROM global_stats');
  const row = result.rows[0] || {};

  // Most popular element
  const elementResult = await pool.query(
    `SELECT element, COUNT(*) AS cnt
     FROM game_sessions
     GROUP BY element
     ORDER BY cnt DESC
     LIMIT 1`
  );

  return {
    totalPlayers: parseInt(row.total_players || 0),
    totalGames: parseInt(row.total_games || 0),
    totalSpellsCast: parseInt(row.total_spells_cast || 0),
    highestWins: parseInt(row.highest_wins || 0),
    topElement: elementResult.rows[0]?.element || 'fire',
  };
}

// ============ CLEANUP ============

export async function closeDB() {
  await pool.end();
}

export default pool;
