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

// ============ TOURNAMENTS ============

// Get or create current week's tournament
export async function getCurrentTournament(entryFee = 1000) {
  // Week starts Monday 00:00 UTC
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  const weekStart = monday.toISOString().split('T')[0];
  const weekEnd = sunday.toISOString().split('T')[0];

  // Try to get existing
  const existing = await pool.query(
    'SELECT * FROM tournaments WHERE week_start = $1', [weekStart]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  // Create new
  const result = await pool.query(
    'INSERT INTO tournaments (week_start, week_end, entry_fee) VALUES ($1, $2, $3) RETURNING *',
    [weekStart, weekEnd, entryFee]
  );
  return result.rows[0];
}

// Register player in tournament (after payment verified)
export async function enterTournament(tournamentId, wallet, solanaWallet, txSignature) {
  const player = await findOrCreatePlayer(wallet, wallet, 'fire');

  const result = await pool.query(
    `INSERT INTO tournament_entries (tournament_id, player_id, solana_wallet, tx_signature)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tournament_id, player_id) DO NOTHING
     RETURNING id`,
    [tournamentId, player.id, solanaWallet, txSignature]
  );

  if (result.rows.length === 0) {
    return { alreadyEntered: true };
  }

  // Update prize pool
  const tourney = await pool.query('SELECT entry_fee FROM tournaments WHERE id = $1', [tournamentId]);
  const fee = tourney.rows[0]?.entry_fee || 1000;
  await pool.query(
    'UPDATE tournaments SET prize_pool = prize_pool + $1 WHERE id = $2',
    [fee, tournamentId]
  );

  return { entryId: result.rows[0].id };
}

// Submit ranked score
export async function submitRankedScore(tournamentId, wallet, wins, level) {
  const player = await pool.query('SELECT id FROM players WHERE wallet = $1', [wallet]);
  if (player.rows.length === 0) return { error: 'Player not found' };

  const playerId = player.rows[0].id;

  // Only update if better
  await pool.query(
    `UPDATE tournament_entries
     SET best_wins = GREATEST(best_wins, $1), best_level = GREATEST(best_level, $2)
     WHERE tournament_id = $3 AND player_id = $4`,
    [wins, level, tournamentId, playerId]
  );

  return { success: true };
}

// Get tournament leaderboard
export async function getTournamentLeaderboard(tournamentId, limit = 20) {
  const result = await pool.query(
    `SELECT wallet, name, solana_wallet, best_wins, best_level
     FROM tournament_leaderboard
     WHERE tournament_id = $1
     LIMIT $2`,
    [tournamentId, limit]
  );
  return result.rows;
}

// Get tournament entry count and prize pool
export async function getTournamentInfo(tournamentId) {
  const countResult = await pool.query(
    'SELECT COUNT(*) AS entries FROM tournament_entries WHERE tournament_id = $1',
    [tournamentId]
  );
  const tourneyResult = await pool.query(
    'SELECT * FROM tournaments WHERE id = $1',
    [tournamentId]
  );
  return {
    ...tourneyResult.rows[0],
    entries: parseInt(countResult.rows[0].entries),
  };
}

// Check if player is entered in tournament
export async function isPlayerInTournament(tournamentId, wallet) {
  const player = await pool.query('SELECT id FROM players WHERE wallet = $1', [wallet]);
  if (player.rows.length === 0) return false;

  const entry = await pool.query(
    'SELECT id FROM tournament_entries WHERE tournament_id = $1 AND player_id = $2',
    [tournamentId, player.rows[0].id]
  );
  return entry.rows.length > 0;
}

// Close a tournament
export async function closeTournament(tournamentId) {
  await pool.query('UPDATE tournaments SET status = $1 WHERE id = $2', ['closed', tournamentId]);
}

// ============ CLEANUP ============

export async function closeDB() {
  await pool.end();
}

export default pool;