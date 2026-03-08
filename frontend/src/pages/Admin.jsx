import { useState, useEffect } from 'react'

const ADMIN_KEY = new URLSearchParams(window.location.search).get('key') || '';

export default function Admin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!ADMIN_KEY) { setError('Missing ?key= parameter'); setLoading(false); return; }
    fetch(`/api/tournament/admin?key=${ADMIN_KEY}`)
      .then(r => { if (!r.ok) throw new Error(r.status === 403 ? 'Invalid admin key' : 'Failed'); return r.json(); })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const copy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleClose = () => {
    if (!closing) { setClosing(true); return; }
    fetch(`/api/tournament/close?key=${ADMIN_KEY}`, { method: 'POST' })
      .then(r => r.json())
      .then(d => { if (d.success) setClosed(true); else alert(d.error); })
      .catch(() => alert('Failed'))
      .finally(() => setClosing(false));
  };

  const medals = ['🥇', '🥈', '🥉'];
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <div style={{ minHeight: '100vh', background: '#07040D', color: '#e0d0ff', fontFamily: "'Quicksand', sans-serif", padding: '24px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Quicksand:wght@400;600;700&display=swap');
        .admin-card { background: rgba(14,10,23,0.8); border: 1px solid rgba(139,92,246,0.15); border-radius: 16px; padding: 20px; margin-bottom: 16px; }
        .winner-card { background: rgba(14,10,23,0.8); border-radius: 16px; padding: 18px; margin-bottom: 12px; transition: all 0.3s; }
        .winner-card:hover { border-color: rgba(139,92,246,0.3); }
        .wallet-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
        .wallet-text { font-family: monospace; font-size: 12px; color: #b388ff; background: rgba(123,47,190,0.08); padding: 6px 10px; border-radius: 8px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .copy-btn { padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(139,92,246,0.2); background: rgba(139,92,246,0.06); color: #b388ff; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .copy-btn:hover { background: rgba(139,92,246,0.15); }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .stat-box { text-align: center; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); }
        .stat-val { font-family: 'Cinzel', serif; font-weight: 900; font-size: 20px; color: #FFD700; }
        .stat-label { font-size: 10px; color: #5a4a6e; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .lb-table { width: 100%; border-collapse: collapse; }
        .lb-table th { text-align: left; font-size: 10px; color: #5a4a6e; text-transform: uppercase; letter-spacing: 1px; padding: 6px 8px; border-bottom: 1px solid rgba(139,92,246,0.08); }
        .lb-table td { font-size: 13px; padding: 8px; border-bottom: 1px solid rgba(139,92,246,0.04); }
        .lb-table tr:hover { background: rgba(139,92,246,0.04); }
      `}</style>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 28 }}>🧙‍♂️</span>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 22, color: '#FFD700' }}>$MGC Admin</div>
            <div style={{ fontSize: 11, color: '#5a4a6e' }}>Tournament Management</div>
          </div>
        </div>

        {loading && <div style={{ textAlign: 'center', color: '#8b7aab', padding: 40 }}>Loading...</div>}
        {error && <div style={{ textAlign: 'center', color: '#ef5350', padding: 40 }}>❌ {error}</div>}

        {data && (<>
          {/* Tournament Info */}
          <div className="admin-card">
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 16, marginBottom: 12, color: '#F59E0B' }}>
              🏆 Week {data.tournament.weekStart} → {data.tournament.weekEnd}
            </div>
            <div className="stat-grid">
              <div className="stat-box">
                <div className="stat-val">{Number(data.tournament.prizePool).toLocaleString()}</div>
                <div className="stat-label">Prize Pool ($MGC)</div>
              </div>
              <div className="stat-box">
                <div className="stat-val">{data.tournament.totalEntries}</div>
                <div className="stat-label">Entries</div>
              </div>
              <div className="stat-box">
                <div className="stat-val">{data.tournament.entryFee}</div>
                <div className="stat-label">Entry Fee</div>
              </div>
              <div className="stat-box">
                <div className="stat-val" style={{ fontSize: 14 }}>{closed ? 'closed' : data.tournament.status}</div>
                <div className="stat-label">Status</div>
              </div>
            </div>

            {/* Close button */}
            {!closed && data.tournament.status !== 'closed' ? (
              <button onClick={handleClose} style={{
                width: '100%', padding: '10px', borderRadius: 10, border: `2px solid ${closing ? '#ef5350' : 'rgba(239,83,80,0.3)'}`,
                background: closing ? 'rgba(239,83,80,0.15)' : 'rgba(239,83,80,0.05)',
                color: '#ef5350', fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.3s',
              }}>
                {closing ? '⚠️ Click again to confirm close' : '🔒 Close Tournament'}
              </button>
            ) : (
              <div style={{ textAlign: 'center', padding: 10, borderRadius: 10, background: 'rgba(102,187,106,0.08)', border: '1px solid rgba(102,187,106,0.2)', color: '#66BB6A', fontSize: 13, fontWeight: 700 }}>
                ✅ Tournament closed — send prizes to winners below
              </div>
            )}
          </div>

          {/* Winners */}
          <div className="admin-card">
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>
              💰 Prize Distribution
            </div>

            {data.winners.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#5a4a6e', padding: 20 }}>No entries yet</div>
            ) : (
              data.winners.map((w, i) => (
                <div key={i} className="winner-card" style={{ border: `2px solid ${medalColors[i]}22` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 28 }}>{medals[i]}</span>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 16, color: medalColors[i] }}>
                          {w.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#8b7aab' }}>
                          {w.wins} wins · Level {w.level}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 18, color: '#FFD700' }}>
                        {w.prizeAmount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 10, color: '#5a4a6e' }}>$MGC ({w.prizePercent}%)</div>
                    </div>
                  </div>
                  <div className="wallet-row">
                    <div className="wallet-text">{w.solanaWallet}</div>
                    <button className="copy-btn" onClick={() => copy(w.solanaWallet, i)}>
                      {copied === i ? '✅ Copied' : '📋 Copy'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Full Leaderboard */}
          {data.fullLeaderboard?.length > 0 && (
            <div className="admin-card">
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                📊 Full Leaderboard ({data.fullLeaderboard.length} players)
              </div>
              <table className="lb-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Wins</th>
                    <th>Level</th>
                    <th>Wallet</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.fullLeaderboard.map((p, i) => (
                    <tr key={i}>
                      <td style={{ color: medalColors[i] || '#8b7aab', fontWeight: 800 }}>
                        {i < 3 ? medals[i] : `#${i+1}`}
                      </td>
                      <td style={{ fontWeight: 700 }}>{p.name}</td>
                      <td>{p.best_wins}</td>
                      <td>{p.best_level}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#8b7aab' }}>
                        {p.solana_wallet?.slice(0,6)}...{p.solana_wallet?.slice(-4)}
                      </td>
                      <td>
                        <button className="copy-btn" onClick={() => copy(p.solana_wallet, `lb-${i}`)}>
                          {copied === `lb-${i}` ? '✅' : '📋'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}