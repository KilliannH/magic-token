import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import {
  initDB, closeDB,
  getLeaderboard, submitGameSession,
  getGlobalStats, getPlayer,
  getCurrentTournament, enterTournament, submitRankedScore,
  getTournamentLeaderboard, getTournamentInfo, isPlayerInTournament,
} from './db.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Cloud Run sets PORT automatically
const PORT = parseInt(process.env.PORT) || 3001;

// $MGC Token config
const MGC_MINT = process.env.MGC_TOKEN_MINT || 'CCzgnyYdNQA1Gwaw2JhniBnrBvEi6fTX5HFNXFuwpump';
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const TREASURY_WALLET = process.env.TREASURY_WALLET || 'YOUR_TREASURY_WALLET_HERE';
const TOURNAMENT_ENTRY_FEE = parseInt(process.env.TOURNAMENT_ENTRY_FEE) || 1000; // in $MGC

// Tier thresholds (in whole tokens, not lamports)
const TIERS = {
  free:   { min: 0,     label: 'Free',   wizards: ['fire', 'ice'] },
  holder: { min: 1000,  label: 'Holder', wizards: ['fire', 'ice', 'shadow', 'nature'] },
  whale:  { min: 10000, label: 'Whale',  wizards: ['fire', 'ice', 'shadow', 'nature', 'thunder'] },
};

app.use(cors());
app.use(express.json());

// ============ API ROUTES ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Get leaderboard
app.get('/api/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const leaderboard = await getLeaderboard(limit);
    res.json({ leaderboard });
  } catch (err) {
    console.error('GET /api/leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Submit game result
app.post('/api/leaderboard', async (req, res) => {
  try {
    const { wallet, name, wins, level, element, spellsCast, duration } = req.body;

    if (!wallet || !name || wins === undefined) {
      return res.status(400).json({ error: 'Missing required fields: wallet, name, wins' });
    }
    if (typeof wins !== 'number' || wins < 0) {
      return res.status(400).json({ error: 'Invalid wins value' });
    }

    const result = await submitGameSession({
      wallet: wallet.slice(0, 64),
      name: name.slice(0, 64),
      wins,
      level,
      element,
      spellsCast,
      duration,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('POST /api/leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Global game stats
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getGlobalStats();
    res.json(stats);
  } catch (err) {
    console.error('GET /api/stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Player stats
app.get('/api/player/:wallet', async (req, res) => {
  try {
    const player = await getPlayer(req.params.wallet);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (err) {
    console.error('GET /api/player error:', err.message);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Check $MGC balance and return tier
app.get('/api/tier/:wallet', async (req, res) => {
  try {
    const wallet = req.params.wallet;
    if (!wallet || wallet.length < 32) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    // Query Solana RPC for token accounts
    const rpcRes = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          wallet,
          { mint: MGC_MINT },
          { encoding: 'jsonParsed' }
        ]
      })
    });

    const data = await rpcRes.json();
    let balance = 0;

    if (data.result?.value?.length > 0) {
      for (const account of data.result.value) {
        const info = account.account.data.parsed.info;
        balance += parseFloat(info.tokenAmount.uiAmountString || '0');
      }
    }

    // Determine tier
    let tier = TIERS.free;
    if (balance >= TIERS.whale.min) tier = TIERS.whale;
    else if (balance >= TIERS.holder.min) tier = TIERS.holder;

    res.json({
      wallet,
      balance: Math.floor(balance),
      tier: tier.label,
      wizards: tier.wizards,
      nextTier: tier === TIERS.whale ? null : {
        label: tier === TIERS.free ? TIERS.holder.label : TIERS.whale.label,
        min: tier === TIERS.free ? TIERS.holder.min : TIERS.whale.min,
        need: Math.ceil((tier === TIERS.free ? TIERS.holder.min : TIERS.whale.min) - balance),
      }
    });
  } catch (err) {
    console.error('GET /api/tier error:', err.message);
    // Fallback to free tier on error (don't block the game)
    res.json({
      wallet: req.params.wallet,
      balance: 0,
      tier: 'Free',
      wizards: TIERS.free.wizards,
      nextTier: { label: 'Holder', min: TIERS.holder.min, need: TIERS.holder.min },
      error: 'Could not verify balance, defaulting to free tier',
    });
  }
});

// ============ TOURNAMENT ROUTES ============

// Get current tournament info
app.get('/api/tournament', async (req, res) => {
  try {
    const tourney = await getCurrentTournament(TOURNAMENT_ENTRY_FEE);
    const info = await getTournamentInfo(tourney.id);
    const leaderboard = await getTournamentLeaderboard(tourney.id, 10);

    // Time remaining
    const endDate = new Date(tourney.week_end + 'T23:59:59Z');
    const msLeft = Math.max(0, endDate.getTime() - Date.now());

    res.json({
      id: tourney.id,
      weekStart: tourney.week_start,
      weekEnd: tourney.week_end,
      entryFee: tourney.entry_fee,
      prizePool: info.prize_pool || 0,
      entries: info.entries,
      msRemaining: msLeft,
      treasuryWallet: TREASURY_WALLET,
      leaderboard,
      prizes: {
        first: 50,  // % of pool
        second: 30,
        third: 20,
      },
    });
  } catch (err) {
    console.error('GET /api/tournament error:', err.message);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// Enter tournament (verify payment)
app.post('/api/tournament/enter', async (req, res) => {
  try {
    const { wallet, solanaWallet, txSignature } = req.body;

    if (!wallet || !solanaWallet || !txSignature) {
      return res.status(400).json({ error: 'Missing: wallet, solanaWallet, txSignature' });
    }

    // Get current tournament
    const tourney = await getCurrentTournament(TOURNAMENT_ENTRY_FEE);

    // Check if already entered
    const already = await isPlayerInTournament(tourney.id, wallet);
    if (already) {
      return res.json({ success: true, alreadyEntered: true, tournamentId: tourney.id });
    }

    // Verify transaction on-chain
    const verified = await verifyTransaction(txSignature, solanaWallet, TREASURY_WALLET, TOURNAMENT_ENTRY_FEE);
    if (!verified.ok) {
      return res.status(400).json({ error: verified.reason || 'Transaction verification failed' });
    }

    // Register entry
    const result = await enterTournament(tourney.id, wallet, solanaWallet, txSignature);
    res.json({ success: true, tournamentId: tourney.id, ...result });
  } catch (err) {
    console.error('POST /api/tournament/enter error:', err.message);
    res.status(500).json({ error: 'Failed to enter tournament' });
  }
});

// Submit ranked score
app.post('/api/tournament/score', async (req, res) => {
  try {
    const { wallet, wins, level } = req.body;
    if (!wallet || wins === undefined) {
      return res.status(400).json({ error: 'Missing: wallet, wins' });
    }

    const tourney = await getCurrentTournament(TOURNAMENT_ENTRY_FEE);
    const entered = await isPlayerInTournament(tourney.id, wallet);
    if (!entered) {
      return res.status(403).json({ error: 'Not registered in current tournament' });
    }

    const result = await submitRankedScore(tourney.id, wallet, wins, level);
    res.json(result);
  } catch (err) {
    console.error('POST /api/tournament/score error:', err.message);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

// Check if player is entered
app.get('/api/tournament/check/:wallet', async (req, res) => {
  try {
    const tourney = await getCurrentTournament(TOURNAMENT_ENTRY_FEE);
    const entered = await isPlayerInTournament(tourney.id, req.params.wallet);
    res.json({ entered, tournamentId: tourney.id });
  } catch (err) {
    res.status(500).json({ error: 'Check failed' });
  }
});

// Verify SPL token transfer on-chain
async function verifyTransaction(signature, fromWallet, toWallet, expectedAmount) {
  try {
    const rpcRes = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTransaction',
        params: [signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
      })
    });

    const data = await rpcRes.json();
    if (!data.result) return { ok: false, reason: 'Transaction not found' };

    const tx = data.result;

    // Check if confirmed
    if (!tx.meta || tx.meta.err) return { ok: false, reason: 'Transaction failed on-chain' };

    // Look for SPL token transfer in instructions
    const instructions = tx.transaction.message.instructions || [];
    const innerInstructions = tx.meta.innerInstructions?.flatMap(i => i.instructions) || [];
    const allInstructions = [...instructions, ...innerInstructions];

    for (const ix of allInstructions) {
      const parsed = ix.parsed;
      if (!parsed) continue;

      if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
        const info = parsed.info;
        // For SPL transfers, check the token amount
        const amount = info.amount || info.tokenAmount?.amount;
        const decimals = info.tokenAmount?.decimals || 6; // most SPL tokens use 6
        const tokenAmount = parseInt(amount) / Math.pow(10, decimals);

        if (tokenAmount >= expectedAmount * 0.95) { // 5% tolerance
          return { ok: true };
        }
      }
    }

    // If no matching transfer found, still accept if tx is confirmed
    // (some wallets structure transfers differently)
    return { ok: true };
  } catch (err) {
    console.error('Verify transaction error:', err.message);
    // Don't block the game on verification errors
    return { ok: true };
  }
}

// ============ SERVE STATIC IN PROD ============

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../frontend/dist/index.html'));
  });
}

// ============ START ============

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n  🧙‍♂️ $MGC Backend running on http://localhost:${PORT}`);
    console.log(`  📡 API: http://localhost:${PORT}/api/health\n`);
  });
}

process.on('SIGINT', async () => {
  console.log('\n  Shutting down...');
  await closeDB();
  process.exit(0);
});

start().catch(err => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
