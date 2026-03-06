import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import TokenWidget from '../components/TokenWidget'
import '../styles/home.css'

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 80)
        }
      })
    }, { threshold: 0.1 })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function StarsCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let stars = []
    let animId

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = document.body.scrollHeight
      stars = Array.from({ length: 120 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.005 + 0.002,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const t = Date.now() * 0.001
      stars.forEach(s => {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * s.speed * 10 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 180, 255, ${alpha * 0.5})`
        ctx.fill()
      })
      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}

function AnimatedCounter({ target }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = null
        const step = (ts) => {
          if (!start) start = ts
          const p = Math.min((ts - start) / 1500, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          el.textContent = Math.floor(eased * target).toLocaleString() + '+'
          if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
        observer.disconnect()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])
  return <div ref={ref} className="hero-stat-val">—</div>
}

export default function Home() {
  useReveal()

  return (
    <>
      <StarsCanvas />

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge" style={{ animation: 'fadeUp 0.8s ease 0.2s both' }}>
          <span className="dot" /> Live on Solana
        </div>

        <div className="hero-orb-container" style={{ animation: 'fadeUp 0.8s ease 0.4s both' }}>
          <div className="orb-ring" />
          <div className="orb-ring-2" />
          <div className="hero-orb"><span>🧙‍♂️</span></div>
        </div>

        <h1 style={{ animation: 'fadeUp 0.8s ease 0.6s both' }}>Magic Token</h1>
        <p className="hero-desc" style={{ animation: 'fadeUp 0.8s ease 0.8s both' }}>
          A memecoin with real magic — staking, gaming & a community of wizards building something extraordinary on Solana.
        </p>

        <div className="hero-buttons" style={{ animation: 'fadeUp 0.8s ease 1s both' }}>
          <a href="https://pump.fun/coin/CCzgnyYdNQA1Gwaw2JhniBnrBvEi6fTX5HFNXFuwpump" target="_blank" className="btn-primary"> Buy $MGC</a>
          <Link to="/game" className="btn-secondary">🎮 Play Wizard Wars</Link>
        </div>

        <div className="hero-stats" style={{ animation: 'fadeUp 0.8s ease 1.2s both' }}>
          <div className="hero-stat">
            <AnimatedCounter target={18} />
            <div className="hero-stat-label">Holders</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val">0%</div>
            <div className="hero-stat-label">Buy/Sell Tax</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val">🔒</div>
            <div className="hero-stat-label">LP Locked</div>
          </div>
        </div>
      </section>

      {/* TOKEN PRICE */}
      <section style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', padding: '40px 24px 0' }}>
        <TokenWidget />
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-tag reveal">Why $MGC?</div>
        <h2 className="section-title reveal">Not just a meme. A spell.</h2>
        <div className="features-grid">
          {[
            { icon: '🧙‍♂️', title: 'Community of Wizards', desc: 'Join a growing community of holders who believe memecoins can be fun and meaningful.' },
            { icon: '💰', title: 'Staking Rewards', desc: 'Stake your $MGC and earn passive rewards. The longer you hold, the stronger your magic.' },
            { icon: '🎮', title: 'Wizard Wars Game', desc: 'Turn-based battle game where $MGC is the currency. Choose your element, cast spells, climb the leaderboard.' },
            { icon: '🔮', title: 'Built on Solana', desc: 'Lightning-fast transactions, near-zero fees. The perfect blockchain for gaming and community.' },
            { icon: '🛡️', title: 'Safe & Transparent', desc: 'Liquidity locked. 0% tax. No hidden wallets. Trust is the real magic.' },
            { icon: '⚡', title: 'Growing Ecosystem', desc: 'NFTs, merch, partnerships, and more coming. $MGC is just getting started.' },
          ].map((f, i) => (
            <div className="feature-card reveal" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TOKENOMICS */}
      <section className="tokenomics" id="tokenomics">
        <div className="section-tag reveal">Tokenomics</div>
        <h2 className="section-title reveal">Transparent by design</h2>
        <div className="token-layout reveal">
          <div className="token-chart">
            <div className="donut-container">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#8B5CF6" strokeWidth="16"
                  strokeDasharray="241.3 60.3" strokeLinecap="round" />
                <circle cx="60" cy="60" r="48" fill="none" stroke="#FFD700" strokeWidth="16"
                  strokeDasharray="30.2 271.4" strokeDashoffset="-241.3" strokeLinecap="round" />
                <circle cx="60" cy="60" r="48" fill="none" stroke="#22C55E" strokeWidth="16"
                  strokeDasharray="15.1 286.5" strokeDashoffset="-271.5" strokeLinecap="round" />
                <circle cx="60" cy="60" r="48" fill="none" stroke="#F59E0B" strokeWidth="16"
                  strokeDasharray="15.1 286.5" strokeDashoffset="-286.6" strokeLinecap="round" />
              </svg>
              <div className="donut-center">
                <div style={{ fontSize: 36 }}><img src="https://magic-token.com/magic.jpg" alt="MGC" style={{ width: 40, height: 40, borderRadius: 10 }} /></div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 14, color: 'var(--gold)' }}>$MGC</div>
              </div>
            </div>
          </div>
          <div className="token-details">
            {[
              { color: '#8B5CF6', name: 'Liquidity Pool', desc: 'Locked on launch for trust', pct: '80%' },
              { color: '#FFD700', name: 'Staking Rewards', desc: 'Distributed over 12+ months', pct: '10%' },
              { color: '#22C55E', name: 'Development', desc: 'Game, infrastructure, tools', pct: '5%' },
              { color: '#F59E0B', name: 'Marketing', desc: 'KOLs, events, partnerships', pct: '5%' },
            ].map((t, i) => (
              <div className="token-row" key={i}>
                <div className="token-dot" style={{ background: t.color }} />
                <div className="token-row-info">
                  <div className="token-row-name">{t.name}</div>
                  <div className="token-row-desc">{t.desc}</div>
                </div>
                <div className="token-row-pct">{t.pct}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="roadmap-section" id="roadmap">
        <div className="section-tag reveal">Roadmap</div>
        <h2 className="section-title reveal">The path of magic</h2>
        <div className="roadmap-grid">
          {[
            { phase: '🌱 Phase 1', title: 'Foundation', active: true, color: 'var(--gold)',
              items: ['Token launch on Solana ✓', 'Community building', 'CoinGecko & CMC listing', 'First KOL campaigns', '1,000+ holders'] },
            { phase: '💪 Phase 2', title: 'Growth', color: 'var(--purple-glow)',
              items: ['Staking platform launch', 'Wizard Wars game release', '5,000+ holders', 'CEX tier 2 listing', 'Ambassador program'] },
            { phase: '🚀 Phase 3', title: 'Expansion', color: '#22C55E',
              items: ['PvP game mode', 'NFT collection for stakers', '10,000+ holders', 'CEX tier 1 pursuit', 'Cross-chain bridge'] },
            { phase: '✨ Phase 4', title: 'Magic Era', color: 'var(--accent)',
              items: ['Full gaming ecosystem', 'DAO governance', 'Real-world merch', 'Expanded universe', 'Community-driven future'] },
          ].map((r, i) => (
            <div className={`roadmap-card reveal ${r.active ? 'active' : ''}`} key={i}>
              <span className="roadmap-phase" style={{ background: `${r.color}15`, color: r.color }}>{r.phase}</span>
              <h3>{r.title}</h3>
              <ul>
                {r.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* COMMUNITY CTA */}
      <section className="community">
        <div className="community-box reveal">
          <h2>Join the Wizards ✨</h2>
          <p>The magic is in the community. Follow us, join the conversation, and be part of something different.</p>
          <div className="community-links">
            <a href="https://x.com/magic_token_mgc" target="_blank" rel="noopener noreferrer" className="social-link">𝕏 Twitter</a>
            <a href="https://t.me/mgc_community" target="_blank" rel="noopener noreferrer" className="social-link">✈️ Telegram</a>
            <a href="https://dexscreener.com/solana/CCzgnyYdNQA1Gwaw2JhniBnrBvEi6fTX5HFNXFuwpump" className="social-link">📊 Dexscreener</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        position: 'relative', zIndex: 2, padding: 32, textAlign: 'center',
        borderTop: '1px solid rgba(139,92,246,0.08)', fontSize: 13, color: 'var(--text-dim)',
      }}>
        <p style={{ marginBottom: 8 }}>
          <span style={{
            fontFamily: "'Cinzel Decorative', serif", fontWeight: 900,
            background: 'linear-gradient(135deg, var(--gold), var(--accent))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>✨ $MGC</span> — It's a Magic Token.
        </p>
        <p>$MGC is a memecoin. Not financial advice. DYOR. Only invest what you can afford to lose.</p>
      </footer>
    </>
  )
}