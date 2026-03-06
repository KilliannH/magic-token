import { useState, useEffect } from 'react'

const TOKEN_CA = 'CCzgnyYdNQA1Gwaw2JhniBnrBvEi6fTX5HFNXFuwpump'
const API_URL = `https://api.dexscreener.com/latest/dex/tokens/${TOKEN_CA}`
const PUMP_URL = `https://pump.fun/coin/${TOKEN_CA}`

export default function TokenWidget() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPrice()
    const interval = setInterval(fetchPrice, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchPrice = async () => {
    try {
      const res = await fetch(API_URL)
      const json = await res.json()
      if (json.pairs?.length > 0) {
        const pair = json.pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]
        setData({
          price: parseFloat(pair.priceUsd) || 0,
          change24h: pair.priceChange?.h24 || 0,
          change1h: pair.priceChange?.h1 || 0,
          mcap: pair.marketCap || pair.fdv || 0,
          vol24h: pair.volume?.h24 || 0,
          pairAddress: pair.pairAddress,
        })
      }
    } catch (err) {
      console.error('Price fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fmtPrice = (p) => {
    if (p < 0.0001) return `$${p.toFixed(8)}`
    if (p < 1) return `$${p.toFixed(6)}`
    return `$${p.toFixed(2)}`
  }

  const fmtUsd = (v) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`
    return `$${v.toFixed(0)}`
  }

  if (!loading && !data) return null

  const isUp = (data?.change24h || 0) >= 0

  return (
    <div className="token-widget reveal">
      <style>{`
        .token-widget {
          position: relative; z-index: 2;
          max-width: 440px; margin: 0 auto;
          padding: 22px 24px; border-radius: 20px;
          background: linear-gradient(145deg, rgba(14,10,23,0.85), rgba(20,14,35,0.65));
          border: 1px solid rgba(139,92,246,0.12);
          backdrop-filter: blur(12px);
          overflow: hidden;
          transition: border-color 0.3s, box-shadow 0.3s;
        }
        .token-widget:hover {
          border-color: rgba(139,92,246,0.25);
          box-shadow: 0 8px 32px rgba(139,92,246,0.08);
        }

        /* Subtle glow */
        .token-widget::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: ${isUp
            ? 'radial-gradient(ellipse at top right, rgba(102,187,106,0.04), transparent 60%)'
            : 'radial-gradient(ellipse at top right, rgba(244,67,54,0.04), transparent 60%)'};
        }

        .tw-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px; position: relative;
        }
        .tw-token { display: flex; align-items: center; gap: 10px; }
        .tw-token-icon {
          width: 38px; height: 38px; border-radius: 12px;
          object-fit: cover;
        }
        .tw-token-name {
          font-family: 'Cinzel', serif; font-weight: 900; font-size: 15px;
          color: #FFD700;
        }
        .tw-token-sub { font-size: 10px; color: rgba(136,120,166,0.6); font-weight: 700; letter-spacing: 1px; }
        .tw-links { display: flex; gap: 6px; }
        .tw-link {
          font-size: 10px; padding: 4px 8px; border-radius: 8px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          color: rgba(136,120,166,0.5); text-decoration: none;
          font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
          transition: all 0.3s; display: flex; align-items: center; gap: 3px;
        }
        .tw-link:hover { color: var(--purple-glow); border-color: rgba(139,92,246,0.2); }

        .tw-price-row {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: 14px; position: relative;
        }
        .tw-price {
          font-family: 'Cinzel', serif; font-weight: 900;
          font-size: 24px; color: #F5F0FF;
        }
        .tw-change {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 10px;
          font-size: 13px; font-weight: 800;
        }
        .tw-change.up {
          background: rgba(102,187,106,0.1); color: #66BB6A;
          border: 1px solid rgba(102,187,106,0.2);
        }
        .tw-change.down {
          background: rgba(244,67,54,0.1); color: #ef5350;
          border: 1px solid rgba(244,67,54,0.2);
        }
        .tw-change-period { font-size: 9px; opacity: 0.5; margin-left: 2px; }

        .tw-stats {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
          position: relative;
        }
        .tw-stat {
          text-align: center; padding: 10px 8px; border-radius: 12px;
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);
        }
        .tw-stat-label {
          font-size: 9px; color: rgba(136,120,166,0.4);
          text-transform: uppercase; letter-spacing: 1px; font-weight: 700;
          margin-bottom: 4px;
        }
        .tw-stat-val {
          font-family: 'Cinzel', serif; font-weight: 900;
          font-size: 14px; color: rgba(245,240,255,0.7);
        }
        .tw-stat-val.up { color: rgba(102,187,106,0.7); }
        .tw-stat-val.down { color: rgba(239,83,80,0.7); }

        .tw-loading {
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .tw-spinner {
          width: 20px; height: 20px; border-radius: 50%;
          border: 2px solid rgba(139,92,246,0.15);
          border-top-color: var(--purple-glow);
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="tw-header">
        <div className="tw-token">
          <img src="https://magic-token.com/magic.jpg" alt="MGC" className="tw-token-icon" />
          <div>
            <div className="tw-token-name">$MGC</div>
            <div className="tw-token-sub">Magic Token</div>
          </div>
        </div>
        <div className="tw-links">
          <a href={PUMP_URL} target="_blank" rel="noopener noreferrer" className="tw-link">
            pump.fun ↗
          </a>
          <a href={data?.pairAddress ? `https://dexscreener.com/solana/${data.pairAddress}` : '#'}
            target="_blank" rel="noopener noreferrer" className="tw-link">
            Chart ↗
          </a>
        </div>
      </div>

      {loading ? (
        <div className="tw-loading"><div className="tw-spinner" /></div>
      ) : data ? (
        <>
          <div className="tw-price-row">
            <div className="tw-price">{fmtPrice(data.price)}</div>
            <div className={`tw-change ${isUp ? 'up' : 'down'}`}>
              {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{data.change24h.toFixed(1)}%
              <span className="tw-change-period">24h</span>
            </div>
          </div>

          <div className="tw-stats">
            <div className="tw-stat">
              <div className="tw-stat-label">MCap</div>
              <div className="tw-stat-val">{fmtUsd(data.mcap)}</div>
            </div>
            <div className="tw-stat">
              <div className="tw-stat-label">Vol 24h</div>
              <div className="tw-stat-val">{fmtUsd(data.vol24h)}</div>
            </div>
            <div className="tw-stat">
              <div className="tw-stat-label">1h</div>
              <div className={`tw-stat-val ${(data.change1h || 0) >= 0 ? 'up' : 'down'}`}>
                {(data.change1h || 0) >= 0 ? '+' : ''}{(data.change1h || 0).toFixed(1)}%
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}