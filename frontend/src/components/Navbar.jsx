import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)

  // Hide navbar inside Telegram Mini App
  const isTelegram = Boolean(window.Telegram?.WebApp?.initData);
  if (isTelegram) return null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '14px 28px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: scrolled ? 'rgba(7,4,13,0.85)' : 'rgba(7,4,13,0.5)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(139,92,246,0.1)',
      transition: 'background 0.3s',
    }}>
      <Link to="/" style={{
        fontFamily: "'Cinzel Decorative', serif",
        fontWeight: 900, fontSize: 20,
        background: 'linear-gradient(135deg, #FFD700, #F59E0B)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        ✨ $MGC
      </Link>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Link to="/" style={{
          fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
          color: location.pathname === '/' ? '#FFD700' : '#8878A6',
          transition: 'color 0.3s',
        }}>Home</Link>

        <Link to="/game" style={{
          fontWeight: 700, fontSize: 14, letterSpacing: 0.5,
          color: location.pathname === '/game' ? '#FFD700' : '#8878A6',
          transition: 'color 0.3s',
        }}>🎮 Play</Link>

        <a
          href="https://t.me/mgc_community"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '7px 18px', borderRadius: 20,
            border: '1.5px solid #FFD700',
            background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(245,158,11,0.05))',
            color: '#FFD700', fontWeight: 800, fontSize: 13,
            transition: 'all 0.3s',
          }}
        >
          Join ✨
        </a>
      </div>
    </nav>
  )
}