import { useState, useEffect, useCallback, useRef } from "react";

// ============ TELEGRAM ============
const isTelegram = Boolean(window.Telegram?.WebApp?.initData);
const tg = window.Telegram?.WebApp;
if (isTelegram) { tg.ready(); tg.expand(); tg.disableVerticalSwipes(); }

const haptic = (type = "impact") => {
  if (!isTelegram || !tg.HapticFeedback) return;
  if (type === "impact") tg.HapticFeedback.impactOccurred("medium");
  if (type === "success") tg.HapticFeedback.notificationOccurred("success");
  if (type === "error") tg.HapticFeedback.notificationOccurred("error");
};

// ============ GAME DATA ============
const WIZARD_TYPES = {
  fire:    { name: "Fire",    color: "#FF6B35", sprite: "wizards/fire", emoji: "🔥" },
  ice:     { name: "Ice",     color: "#4FC3F7", sprite: "wizards/ice", emoji: "❄️" },
  shadow:  { name: "Shadow",  color: "#9C27B0", sprite: "wizards/shadow", emoji: "🌑" },
  nature:  { name: "Nature",  color: "#66BB6A", sprite: "wizards/nature", emoji: "🌿" },
  thunder: { name: "Thunder", color: "#FFD600", sprite: "wizards/thunder", emoji: "⚡" },
};

const SPELLS = {
  fire: [
    { name: "Fire Punch", dmg: 12, cost: 0, type: "attack", icon: "spells/fire/fire-punch.png" },
    { name: "Fireball", dmg: 25, cost: 20, type: "attack", icon: "spells/fire/fireball.png" },
    { name: "Inferno", dmg: 45, cost: 40, type: "attack", icon: "spells/fire/inferno.png" },
    { name: "Fire Shield", dmg: 0, cost: 25, type: "defend", heal: 20, icon: "spells/fire/fire-shield.png" },
    { name: "Meteor", dmg: 70, cost: 65, type: "ultimate", icon: "spells/fire/meteor.png" },
  ],
  ice: [
    { name: "Frost Slap", dmg: 11, cost: 0, type: "attack", icon: "spells/ice/frost-slap.png" },
    { name: "Ice Shard", dmg: 22, cost: 18, type: "attack", icon: "spells/ice/ice-shard.png" },
    { name: "Blizzard", dmg: 40, cost: 38, type: "attack", icon: "spells/ice/blizzard.png" },
    { name: "Frost Armor", dmg: 0, cost: 22, type: "defend", heal: 25, icon: "spells/ice/frost-armor.png" },
    { name: "Absolute Zero", dmg: 65, cost: 60, type: "ultimate", icon: "spells/ice/absolute-zero.png" },
  ],
  shadow: [
    { name: "Dark Punch", dmg: 12, cost: 0, type: "attack", icon: "spells/shadow/dark-punch.png" },
    { name: "Shadow Bolt", dmg: 24, cost: 19, type: "attack", icon: "spells/shadow/shadow-bolt.png" },
    { name: "Nightmare", dmg: 42, cost: 39, type: "attack", icon: "spells/shadow/nightmare.png" },
    { name: "Dark Veil", dmg: 0, cost: 23, type: "defend", heal: 22, icon: "spells/shadow/dark-veil.png" },
    { name: "Void Rupture", dmg: 68, cost: 62, type: "ultimate", icon: "spells/shadow/void-rupture.png" },
  ],
  nature: [
    { name: "Root Slap", dmg: 10, cost: 0, type: "attack", icon: "spells/nature/root-slap.png" },
    { name: "Vine Whip", dmg: 20, cost: 16, type: "attack", icon: "spells/nature/vine-whip.png" },
    { name: "Thorn Storm", dmg: 38, cost: 35, type: "attack", icon: "spells/nature/thorn-storm.png" },
    { name: "Heal Bloom", dmg: 0, cost: 20, type: "defend", heal: 35, icon: "spells/nature/heal-bloom.png" },
    { name: "Ancient Oak", dmg: 60, cost: 58, type: "ultimate", icon: "spells/nature/ancient-oak.png" },
  ],
  thunder: [
    { name: "Zap", dmg: 12, cost: 0, type: "attack", icon: "spells/thunder/zap.png" },
    { name: "Spark", dmg: 23, cost: 17, type: "attack", icon: "spells/thunder/spark.png" },
    { name: "Lightning", dmg: 43, cost: 40, type: "attack", icon: "spells/thunder/lightning.png" },
    { name: "Static Field", dmg: 0, cost: 24, type: "defend", heal: 18, icon: "spells/thunder/static-field.png" },
    { name: "Thunder God", dmg: 72, cost: 68, type: "ultimate", icon: "spells/thunder/thunder-god.png" },
  ],
};

const ENEMIES = [
  { name: "Dark Apprentice", sprite: "enemies/dark_apprentice", frames: 4, frameW: 76 },
  { name: "Goblin Mage", sprite: "enemies/goblin_mage", frames: 4, frameW: 64 },
  { name: "Shadow Imp", sprite: "enemies/shadow_imp", frames: 4, frameW: 64 },
  { name: "Cursed Knight", sprite: "enemies/cursed_knight", frames: 4, frameW: 100 },
  { name: "Crystal Golem", sprite: "enemies/crystal_golem", frames: 4, frameW: 88 },
  { name: "Phantom Witch", sprite: "enemies/phantom_witch", frames: 4, frameW: 64 },
  { name: "Bone Sorcerer", sprite: "enemies/bone_sorcerer", frames: 4, frameW: 88 },
  { name: "Void Walker", sprite: "enemies/void_walker", frames: 4, frameW: 96 },
  { name: "Dragon Whelp", sprite: "enemies/dragon_whelp", frames: 4, frameW: 76 },
  { name: "Demon Summoner", sprite: "enemies/demon_summoner", frames: 4, frameW: 100 },
];

const MANA_REGEN = 20;

function getEnemy(level) {
  const e = ENEMIES[(level - 1) % ENEMIES.length];
  const types = Object.keys(WIZARD_TYPES);
  const baseHp = 80 + level * 15 + Math.floor(level * level * 0.8);
  const baseDmg = 10 + level * 3;
  return {
    ...e, level,
    type: types[Math.floor(Math.random() * types.length)],
    maxHp: baseHp, hp: baseHp,
    dmgMin: Math.floor(baseDmg * 0.7), dmgMax: baseDmg,
  };
}

// ============ ANIMATED SPRITE COMPONENT ============
function AnimSprite({ basePath, frames = 4, frameW = 64, size = 64, fallback, className = "" }) {
  const [idleUrl, setIdleUrl] = useState(null);
  const [staticUrl, setStaticUrl] = useState(null);
  const [failed, setFailed] = useState(0); // 0=try idle, 1=try static, 2=emoji

  useEffect(() => {
    setFailed(0);
    const idle = new Image();
    idle.onload = () => setIdleUrl(`/assets/${basePath}_idle.png`);
    idle.onerror = () => {
      const stat = new Image();
      stat.onload = () => { setStaticUrl(`/assets/${basePath}.png`); setFailed(1); };
      stat.onerror = () => setFailed(2);
      stat.src = `/assets/${basePath}.png`;
    };
    idle.src = `/assets/${basePath}_idle.png`;
  }, [basePath]);

  if (failed === 2) {
    return <span className={`sprite-fallback ${className}`} style={{ fontSize: size * 0.7 }}>{fallback}</span>;
  }
  if (failed === 1 && staticUrl) {
    return <img src={staticUrl} className={`sprite-static ${className}`} alt=""
      style={{ width: size, height: size, imageRendering: "pixelated" }} draggable={false} />;
  }
  if (idleUrl) {
    const totalW = frameW * frames;
    return (
      <div className={`sprite-animated ${className}`} style={{
        width: size, height: size, overflow: "hidden", position: "relative",
      }}>
        <div style={{
          width: totalW * (size / frameW), height: size,
          backgroundImage: `url(${idleUrl})`,
          backgroundSize: `${totalW * (size / frameW)}px ${size}px`,
          imageRendering: "pixelated",
          animation: `spriteIdle${frames} ${frames * 0.25}s steps(${frames}) infinite`,
        }} />
      </div>
    );
  }
  return <span className={`sprite-fallback ${className}`} style={{ fontSize: size * 0.7 }}>{fallback}</span>;
}

// Simple sprite for icons (no animation)
function Icon({ src, fallback, size = 24 }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <span style={{ fontSize: size * 0.8 }}>{fallback}</span>;
  return <img src={`/assets/${src}`} alt="" style={{ width: size, height: size, imageRendering: "pixelated" }}
    onError={() => setOk(false)} draggable={false} />;
}

// ============ SUB COMPONENTS ============
function HPBar({ current, max, color }) {
  const pct = Math.max(0, (current / max) * 100);
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
    </div>
  );
}

function ManaBar({ current, max }) {
  return (
    <div className="bar-track mana">
      <div className="bar-fill mana-fill" style={{ width: `${Math.max(0, (current / max) * 100)}%` }} />
      <span className="mana-label">✨ {Math.ceil(current)}/{max}</span>
    </div>
  );
}

function DmgPopup({ value, type }) {
  return (
    <div className={`dmg-pop ${type}`}>
      {type === "heal" ? `+${value}` : `-${value}`}
    </div>
  );
}

// ============ MAIN GAME ============
export default function WizardWarsWeb() {
  const [screen, setScreen] = useState("title");
  const [username, setUsername] = useState(isTelegram ? (tg.initDataUnsafe?.user?.first_name || "") : "");
  const [playerType, setPlayerType] = useState(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [playerMana, setPlayerMana] = useState(100);
  const [playerMaxMana, setPlayerMaxMana] = useState(100);
  const [enemy, setEnemy] = useState(null);
  const [level, setLevel] = useState(1);
  const [wins, setWins] = useState(0);
  const [turn, setTurn] = useState("player");
  const [log, setLog] = useState([]);
  const [shakeEnemy, setShakeEnemy] = useState(false);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [glowPlayer, setGlowPlayer] = useState(false);
  const [dmgPopups, setDmgPopups] = useState([]);
  const [enemyIntent, setEnemyIntent] = useState(null);
  const [fadeClass, setFadeClass] = useState("fade-in");
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameMode, setGameMode] = useState("free");
  const [tournamentId, setTournamentId] = useState(null);
  const [tournamentData, setTournamentData] = useState(null);
  const [tournamentStatus, setTournamentStatus] = useState("");
  const logRef = useRef(null);

  const playerId = (() => {
    const name = username.trim() || "Anonymous";
    const tgId = isTelegram ? tg.initDataUnsafe?.user?.id : null;
    return tgId ? `tg_${tgId}` : "player_" + name.toLowerCase().replace(/\s/g, "_");
  })();

  // Fetch leaderboard
  useEffect(() => {
    if (screen === "gameover") {
      const endpoint = gameMode === "ranked" ? "/api/tournament" : "/api/leaderboard";
      fetch(endpoint).then(r => r.json()).then(d => {
        setLeaderboard(d.leaderboard || []);
      }).catch(() => {});
    }
  }, [screen]);

  // Submit score
  useEffect(() => {
    if (screen === "gameover" && wins > 0) {
      const name = username.trim() || "Anonymous";
      fetch("/api/leaderboard", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: playerId, name, wins, level, element: playerType }),
      }).catch(() => {});
      if (gameMode === "ranked") {
        fetch("/api/tournament/score", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: playerId, wins, level }),
        }).catch(() => {});
      }
    }
  }, [screen]);

  const addLog = useCallback((msg) => {
    setLog(prev => [...prev.slice(-20), msg]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  const showDmg = (value, type, position) => {
    const id = Date.now() + Math.random();
    setDmgPopups(prev => [...prev, { id, value, type, position }]);
    setTimeout(() => setDmgPopups(prev => prev.filter(p => p.id !== id)), 900);
  };

  const transition = (next) => {
    setFadeClass("fade-out");
    setTimeout(() => { setFadeClass("fade-in"); next(); }, 250);
  };

  const updateIntent = (lvl) => {
    const heavyChance = Math.min(0.5 + (lvl || level) * 0.03, 0.8);
    setEnemyIntent(Math.random() < heavyChance ? "heavy" : "normal");
  };

  const startGame = (type) => {
    setPlayerType(type);
    setPlayerHp(100); setPlayerMaxHp(100);
    setPlayerMana(100); setPlayerMaxMana(100);
    setLevel(1); setWins(0);
    const e = getEnemy(1);
    setEnemy(e); setTurn("player");
    updateIntent(1);
    transition(() => {
      setScreen("battle");
      setLog([`⚔️ A new challenger: ${e.name}!`]);
    });
  };

  const castSpell = (spell) => {
    if (turn !== "player" || playerMana < spell.cost) return;
    setPlayerMana(m => m - spell.cost);
    haptic("impact");

    if (spell.type === "defend" && spell.heal) {
      const levelBonus = Math.floor(level * 2);
      const healAmt = spell.heal + levelBonus;
      setPlayerHp(h => Math.min(h + healAmt, playerMaxHp));
      setGlowPlayer(true);
      setTimeout(() => setGlowPlayer(false), 500);
      showDmg(healAmt, "heal", "player");
      addLog(`✨ ${spell.name}! +${healAmt} HP`);
    } else {
      const levelBonus = Math.floor(level * 1.5);
      const base = spell.dmg + levelBonus;
      const crit = Math.random() < 0.15;
      const dmg = crit ? Math.floor(base * 1.5) : base;
      setEnemy(e => e ? { ...e, hp: e.hp - dmg } : null);
      setShakeEnemy(true);
      setTimeout(() => setShakeEnemy(false), 400);
      showDmg(dmg, crit ? "crit" : "damage", "enemy");
      addLog(`${spell.name}: ${dmg} dmg${crit ? " 💥CRIT!" : ""}`);
    }

    setTurn("waiting");
    setTimeout(() => {
      setEnemy(curr => {
        if (!curr || curr.hp <= 0) return curr;
        const isHeavy = enemyIntent === "heavy";
        const dmg = isHeavy
          ? Math.floor(curr.dmgMax * 1.2) + Math.floor(Math.random() * 5)
          : curr.dmgMin + Math.floor(Math.random() * (curr.dmgMax - curr.dmgMin));
        setPlayerHp(h => {
          const newHp = h - dmg;
          showDmg(dmg, "damage", "player");
          addLog(`${curr.name} uses ${isHeavy ? "Power Attack" : "Attack"}! -${dmg} HP`);
          addLog(`✨ +${MANA_REGEN} mana`);
          if (newHp <= 0) {
            haptic("error");
            setTimeout(() => transition(() => setScreen("gameover")), 600);
          }
          return newHp;
        });
        setPlayerMana(m => Math.min(m + MANA_REGEN, playerMaxMana));
        setShakePlayer(true);
        setTimeout(() => setShakePlayer(false), 400);
        updateIntent();
        setTurn("player");
        return curr;
      });
    }, 700);
  };

  useEffect(() => {
    if (enemy && enemy.hp <= 0 && screen === "battle") {
      haptic("success");
      setTimeout(() => {
        setWins(w => w + 1);
        transition(() => setScreen("victory"));
      }, 400);
    }
  }, [enemy?.hp]);

  const goToBattle = () => {
    const nl = level + 1;
    setLevel(nl);
    setPlayerMaxHp(m => m + 30);
    setPlayerHp(h => { const newMax = playerMaxHp + 30; return Math.min(h + Math.floor(newMax * 0.25), newMax); });
    setPlayerMaxMana(m => m + 25);
    setPlayerMana(m => { const newMax = playerMaxMana + 25; return Math.min(m + Math.floor(newMax * 0.3), newMax); });
    const e = getEnemy(nl);
    setEnemy(e); setTurn("player"); updateIntent(nl);
    transition(() => { setScreen("battle"); setLog([`⚔️ A new challenger: ${e.name}!`]); });
  };

  const nextBattle = () => {
    if (wins > 0 && wins % 2 === 0) {
      transition(() => setScreen("tavern"));
    } else {
      goToBattle();
    }
  };

  const tavernChoice = (choice) => {
    haptic("success");
    const mxH = playerMaxHp, mxM = playerMaxMana;
    if (choice === "feast") {
      setPlayerHp(h => Math.min(h + Math.floor(mxH * 0.6), mxH));
      setPlayerMana(m => Math.min(m + Math.floor(mxM * 0.15), mxM));
    } else if (choice === "meditate") {
      setPlayerMana(mxM);
      setPlayerHp(h => Math.min(h + Math.floor(mxH * 0.25), mxH));
    } else {
      setPlayerHp(h => Math.min(h + Math.floor(mxH * 0.4), mxH));
      setPlayerMana(m => Math.min(m + Math.floor(mxM * 0.5), mxM));
    }
    const nl = level + 1;
    setLevel(nl);
    setPlayerMaxHp(m => m + 30);
    setPlayerHp(h => { const nm = mxH + 30; return Math.min(h + Math.floor(mxH * 0.1), nm); });
    setPlayerMaxMana(m => m + 25);
    setPlayerMana(m => { const nm = mxM + 25; return Math.min(m + Math.floor(mxM * 0.1), nm); });
    const e = getEnemy(nl);
    setEnemy(e); setTurn("player"); updateIntent(nl);
    transition(() => { setScreen("battle"); setLog([`⚔️ A new challenger: ${e.name}!`]); });
  };

  const shareScore = () => {
    if (isTelegram) tg.switchInlineQuery(`I scored ${wins} wins in Wizard Wars! 🧙‍♂️`, ["users", "groups"]);
  };

  const openTournament = () => {
    if (!username.trim()) return;
    setTournamentStatus("Loading...");
    transition(() => setScreen("tournament"));
    fetch("/api/tournament").then(r => r.json()).then(d => {
      setTournamentData(d); setTournamentStatus("");
    }).catch(() => setTournamentStatus("Failed to load tournament."));
  };

  const enterTournament = (solanaWallet, txSig) => {
    setTournamentStatus("⏳ Verifying on-chain...");
    fetch("/api/tournament/enter", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: playerId, solanaWallet, txSignature: txSig }),
    }).then(r => r.json()).then(result => {
      if (result.success || result.alreadyEntered) {
        haptic("success"); setGameMode("ranked"); setTournamentId(result.tournamentId);
        setTournamentStatus("✅ Verified!");
        setTimeout(() => transition(() => setScreen("select")), 600);
      } else { setTournamentStatus(`❌ ${result.error || "Verification failed"}`); }
    }).catch(() => setTournamentStatus("❌ Network error — try again"));
  };

  const formatTime = (ms) => {
    const h = Math.floor(ms / 3600000);
    if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    return `${h}h ${Math.floor((ms % 3600000) / 60000)}m`;
  };

  const spells = playerType ? SPELLS[playerType] : [];
  const typeInfo = playerType ? WIZARD_TYPES[playerType] : null;
  const isRanked = gameMode === "ranked";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Quicksand:wght@400;600;700&display=swap');

        /* Sprite sheet animation keyframes */
        @keyframes spriteIdle4 { from { transform: translateX(0); } to { transform: translateX(-100%); } }
        @keyframes spriteIdle6 { from { transform: translateX(0); } to { transform: translateX(-100%); } }

        .game-shell {
          width: 100%; min-height: 100vh; background: #07040D;
          display: flex; align-items: center; justify-content: center;
          padding-top: 90px
        }
        .game-phone {
          width: 100%; max-width: 420px; min-height: 100vh; max-height: 100vh;
          overflow-y: auto; overflow-x: hidden;
          background: radial-gradient(ellipse at 50% 20%, #1a0e30, #0a0514 60%);
          position: relative; font-family: 'Quicksand', sans-serif; color: #e0d0ff;
        }
        @media (min-width: 480px) {
          .game-shell { padding: 67px 0; }
          .game-phone {
            min-height: 780px; max-height: 90vh; border-radius: 28px;
            border: 2px solid rgba(123,47,190,0.2);
            box-shadow: 0 0 60px rgba(123,47,190,0.1), 0 20px 60px rgba(0,0,0,0.5);
          }
          .tg-mode .game-phone { max-width: 100%; max-height: 100vh; min-height: 100vh; border-radius: 0; border: none; box-shadow: none; }
        }

        /* Sparkles */
        .sparkles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
        .sparkle { position: absolute; border-radius: 50%; background: #FFD700; opacity: 0; animation: twinkle var(--dur) var(--delay) infinite; }
        @keyframes twinkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:0.7;transform:scale(1)} }

        /* Fade transitions */
        .scene { position: relative; z-index: 1; transition: opacity 0.25s ease, transform 0.25s ease; }
        .fade-in { opacity: 1; transform: translateY(0); }
        .fade-out { opacity: 0; transform: translateY(8px); }

        /* Shared */
        .cinzel { font-family: 'Cinzel', serif; }
        .gold { color: #FFD700; }
        .dim { color: #8b7aab; }

        /* Title */
        .title-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 720px; text-align: center; padding: 20px; }
        .title-icon { animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .title-big { font-family: 'Cinzel', serif; font-weight: 900; font-size: 32px; color: #FFD700; margin: 12px 0 4px; }
        .title-sub { color: #b388ff; font-size: 14px; margin-bottom: 20px; }
        .name-input {
          width: 230px; padding: 10px 16px; border-radius: 14px; margin-bottom: 16px;
          border: 2px solid rgba(139,92,246,0.3); background: rgba(20,12,40,0.9);
          color: #e0d0ff; font-family: 'Quicksand', sans-serif; font-size: 15px;
          font-weight: 700; text-align: center; outline: none;
        }
        .name-input:focus { border-color: rgba(255,215,0,0.5); }
        .play-btn {
          padding: 14px 48px; border-radius: 24px; border: 2px solid #FFD700;
          background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.06));
          color: #FFD700; font-family: 'Cinzel', serif; font-size: 18px; font-weight: 900;
          cursor: pointer; transition: all 0.3s; letter-spacing: 2px;
        }
        .play-btn:hover { background: linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,165,0,0.12)); transform: translateY(-2px); }

        /* Select */
        .select-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 720px; padding: 20px; }
        .wiz-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; max-width: 370px; }
        .wiz-card {
          padding: 14px 8px; border-radius: 16px; text-align: center; cursor: pointer;
          background: rgba(20,12,40,0.6); border: 2px solid rgba(123,47,190,0.15);
          transition: all 0.3s;
        }
        .wiz-card:hover { transform: translateY(-4px); border-color: rgba(123,47,190,0.4); box-shadow: 0 8px 24px rgba(123,47,190,0.12); }
        .wiz-card-name { font-family: 'Cinzel', serif; font-weight: 700; font-size: 14px; margin-top: 6px; }

        /* Battle */
        .battle-wrap { padding: 10px 14px; }
        .battle-top { display: flex; justify-content: space-between; font-size: 12px; color: #b388ff; margin-bottom: 10px; }
        .arena {
          background: url('/assets/bg/arena.png') center/cover no-repeat, linear-gradient(180deg, #1a0e30, #0d0520);
          border-radius: 16px; padding: 16px 14px; margin-bottom: 10px;
          border: 1px solid rgba(123,47,190,0.12);
        }
        .fighter { display: flex; gap: 12px; align-items: center; position: relative; padding: 6px 0; }
        .fighter-avatar {
          width: 72px; height: 72px; border-radius: 14px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .fighter-info { flex: 1; }
        .fighter-name { font-family: 'Cinzel', serif; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
        .intent { font-size: 10px; padding: 2px 7px; border-radius: 6px; background: rgba(244,67,54,0.12); color: #ef5350; font-family: 'Quicksand'; font-weight: 700; }
        .bar-track { height: 10px; border-radius: 5px; background: rgba(255,255,255,0.07); overflow: hidden; }
        .bar-track.mana { position: relative; margin-top: 3px; }
        .bar-fill { height: 100%; border-radius: 5px; transition: width 0.4s ease; }
        .mana-fill { background: linear-gradient(90deg, #7c4dff, #448aff); }
        .mana-label { position: absolute; right: 4px; top: -1px; font-size: 9px; color: #b388ff; font-weight: 700; }
        .hp-num { font-size: 10px; color: #8b7aab; margin-top: 2px; }
        .vs { text-align: center; color: #4a3660; font-size: 11px; font-family: 'Cinzel', serif; padding: 3px 0; }

        /* Shake/Glow */
        .shake { animation: shake 0.4s ease; }
        .glow { animation: glow 0.5s ease; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes glow { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.5) drop-shadow(0 0 10px rgba(102,187,106,0.5))} }

        /* Damage popup */
        .dmg-pop { position: absolute; right: 10px; top: 0; font-weight: 900; font-size: 20px; pointer-events: none; animation: popUp 0.8s ease forwards; z-index: 10; text-shadow: 0 2px 4px rgba(0,0,0,0.6); }
        .dmg-pop.damage { color: #F44336; }
        .dmg-pop.crit { color: #FF9800; font-size: 24px; }
        .dmg-pop.heal { color: #66BB6A; }
        @keyframes popUp { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-40px) scale(1.3)} }

        /* Combat log */
        .combat-log {
          max-height: 70px; overflow-y: auto; margin-bottom: 10px;
          padding: 7px 10px; border-radius: 10px;
          background: rgba(10,5,20,0.55); border: 1px solid rgba(123,47,190,0.06);
          font-size: 11px; color: #8b7aab;
        }
        .combat-log div { padding: 1px 0; }
        .combat-log::-webkit-scrollbar { width: 3px; }
        .combat-log::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.15); border-radius: 3px; }

        /* Spells */
        .spells-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
        .spell-btn {
          padding: 9px; border-radius: 12px; border: 1.5px solid rgba(123,47,190,0.18);
          background: rgba(20,12,40,0.55); cursor: pointer; transition: all 0.2s;
          display: flex; gap: 9px; align-items: center; color: #e0d0ff;
          font-family: 'Quicksand', sans-serif;
        }
        .spell-btn:not(.off):hover { border-color: rgba(123,47,190,0.35); background: rgba(30,18,55,0.7); transform: translateY(-2px); }
        .spell-btn.off { opacity: 0.3; cursor: not-allowed; }
        .spell-btn.ult { border-color: rgba(255,215,0,0.18); }
        .spell-btn.ult:not(.off):hover { border-color: rgba(255,215,0,0.35); }
        .spell-btn.free { border-color: rgba(255,255,255,0.08); }
        .spell-name { font-weight: 700; font-size: 12px; }
        .spell-stat { font-size: 10px; color: #8b7aab; display: flex; gap: 5px; }

        /* Result screens */
        .result-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 680px; text-align: center; padding: 20px; }
        .result-icon { animation: float 2s ease-in-out infinite; margin-bottom: 6px; }
        .result-title { font-family: 'Cinzel', serif; font-weight: 900; font-size: 26px; margin-bottom: 4px; }
        .result-stats { display: flex; gap: 24px; margin: 16px 0; }
        .result-stat-val { font-family: 'Cinzel', serif; font-weight: 900; font-size: 22px; color: #FFD700; }
        .result-stat-label { font-size: 10px; color: #8b7aab; text-transform: uppercase; font-weight: 700; }
        .btn-gold {
          padding: 11px 32px; border-radius: 18px; border: 2px solid #FFD700;
          background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,165,0,0.05));
          color: #FFD700; font-family: 'Cinzel', serif; font-weight: 900; font-size: 13px;
          cursor: pointer; transition: all 0.3s; margin: 4px 0;
        }
        .btn-gold:hover { background: linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1)); transform: translateY(-2px); }
        .btn-dim { border-color: #8b7aab; color: #8b7aab; }
        .btn-tg { border-color: #29B6F6; color: #29B6F6; background: linear-gradient(135deg, rgba(41,182,246,0.08),transparent); }

        /* Tavern */
        .tavern-wrap {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 720px; text-align: center; padding: 20px;
          background: url('/assets/bg/tavern.png') center/cover no-repeat, linear-gradient(180deg, #1a0e10, #0d0508);
          border-radius: 16px; margin: 8px;
        }
        .tavern-status { display: flex; gap: 18px; font-size: 13px; font-weight: 700; margin-bottom: 20px; padding: 7px 16px; border-radius: 10px; background: rgba(10,5,20,0.5); }
        .tavern-choices { display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 300px; }
        .tavern-btn {
          display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-radius: 14px;
          border: 2px solid rgba(245,158,11,0.12); background: rgba(20,12,40,0.55);
          cursor: pointer; transition: all 0.3s; text-align: left; color: #e0d0ff;
          font-family: 'Quicksand', sans-serif;
        }
        .tavern-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(245,158,11,0.08); }
        .tavern-btn-name { font-family: 'Cinzel', serif; font-weight: 700; font-size: 15px; }
        .tavern-btn-desc { font-size: 11px; color: #8b7aab; margin-top: 2px; }

        /* Leaderboard */
        .lb { margin-top: 18px; width: 100%; max-width: 320px; background: rgba(10,5,20,0.5); border: 1px solid rgba(123,47,190,0.12); border-radius: 12px; padding: 12px 14px; text-align: left; }
        .lb-row { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 6px; font-size: 12px; color: #8b7aab; }
        .lb-row:nth-child(2) { color: #FFD700; }
        .lb-row:nth-child(3) { color: #C0C0C0; }
        .lb-row:nth-child(4) { color: #CD7F32; }
        .lb-you { background: rgba(123,47,190,0.1); color: #e0d0ff !important; }
        .lb-rank { font-weight: 800; min-width: 26px; }
        .lb-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lb-wins { font-weight: 800; font-family: 'Cinzel', serif; }

        .ranked-badge { display: inline-block; padding: 3px 10px; border-radius: 8px; background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25); color: #F59E0B; font-size: 10px; font-weight: 800; }
        .btn-ranked { border-color: #F59E0B; color: #F59E0B; background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.04)); font-size: 15px; }
        .tourney-wrap { display: flex; flex-direction: column; align-items: center; padding: 24px 20px; min-height: 720px; }
        .tourney-pool { font-family: 'Cinzel', serif; font-weight: 900; font-size: 24px; color: #FFD700; margin: 8px 0 2px; }
        .tourney-infos { display: flex; gap: 24px; margin: 14px 0 10px; }
        .tourney-info { text-align: center; }
        .tourney-info-val { font-size: 14px; font-weight: 700; color: #e0d0ff; }
        .tourney-info-label { font-size: 9px; color: #5a4a6e; text-transform: uppercase; letter-spacing: 1px; }
        .tourney-enter { width: 100%; max-width: 340px; padding: 18px; border-radius: 16px; background: rgba(245,158,11,0.03); border: 1px solid rgba(245,158,11,0.1); margin-top: 14px; }
        .tourney-input { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid rgba(245,158,11,0.2); background: rgba(20,12,40,0.9); color: #e0d0ff; font-family: 'Quicksand', sans-serif; font-size: 12px; font-weight: 600; text-align: center; outline: none; margin-bottom: 8px; box-sizing: border-box; }
        .tourney-input:focus { border-color: rgba(245,158,11,0.5); }
        .tourney-status { font-size: 12px; margin: 8px 0; min-height: 18px; }
        .copy-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid rgba(123,47,190,0.2); background: rgba(123,47,190,0.06); color: #b388ff; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Quicksand', sans-serif; margin-bottom: 10px; }
        .copy-btn:hover { background: rgba(123,47,190,0.12); }
      `}</style>

      <div className={`game-shell ${isTelegram ? "tg-mode" : ""}`}>
        <div className="game-phone">
          <div className="sparkles">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="sparkle" style={{
                left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
                width: 2+Math.random()*3, height: 2+Math.random()*3,
                "--dur": `${1.5+Math.random()*2}s`, "--delay": `${i*0.4}s`,
              }} />
            ))}
          </div>

          <div className={`scene ${fadeClass}`}>

            {/* ===== TITLE ===== */}
            {screen === "title" && (
              <div className="title-wrap">
                <div className="title-icon">
                  <AnimSprite basePath="ui/title-wizard" fallback="🧙‍♂️" size={96} frameW={96} />
                </div>
                <div className="title-big">WIZARD WARS</div>
                <div className="title-sub">A $MGC Battle Game on Solana</div>
                <p style={{ color: "#8b7aab", fontSize: 12, maxWidth: 280, lineHeight: 1.6, marginBottom: 16 }}>
                  Choose your wizard. Cast spells. Defeat enemies. Climb the ranks.
                </p>
                <input className="name-input" type="text" placeholder="Enter wizard name..." maxLength={16}
                  value={username} onChange={e => setUsername(e.target.value.slice(0, 16))}
                  onKeyDown={e => { if (e.key === "Enter" && username.trim()) { setGameMode("free"); transition(() => setScreen("select")); } }} />
                <button className="play-btn"
                  style={{ opacity: username.trim() ? 1 : 0.4, pointerEvents: username.trim() ? "auto" : "none", marginBottom: 10 }}
                  onClick={() => { if (!username.trim()) return; setGameMode("free"); transition(() => setScreen("select")); }}>
                  ⚔️ PLAY
                </button>
                <button className="btn-gold btn-ranked"
                  style={{ opacity: username.trim() ? 1 : 0.4, pointerEvents: username.trim() ? "auto" : "none" }}
                  onClick={openTournament}>
                  🏆 RANKED
                </button>
              </div>
            )}

            {/* ===== TOURNAMENT ===== */}
            {screen === "tournament" && (
              <div className="tourney-wrap">
                <div className="cinzel gold" style={{ fontSize: 20 }}>🏆 Weekly Tournament</div>
                {!tournamentData ? (
                  <div className="dim" style={{ marginTop: 40 }}>{tournamentStatus || "Loading..."}</div>
                ) : (<>
                  <div className="tourney-pool">{tournamentData.prizePool > 0 ? `${Number(tournamentData.prizePool).toLocaleString()} $MGC` : `${tournamentData.entryFee} $MGC / entry`}</div>
                  <div className="dim" style={{ fontSize: 10 }}>Prize Pool</div>
                  <div className="tourney-infos">
                    <div className="tourney-info"><div className="tourney-info-val">{tournamentData.entries}</div><div className="tourney-info-label">Entries</div></div>
                    <div className="tourney-info"><div className="tourney-info-val">{tournamentData.entryFee} $MGC</div><div className="tourney-info-label">Entry Fee</div></div>
                    <div className="tourney-info"><div className="tourney-info-val">{formatTime(tournamentData.msRemaining)}</div><div className="tourney-info-label">Ends in</div></div>
                  </div>
                  <div className="dim" style={{ fontSize: 12, marginBottom: 14 }}>🥇 50%  ·  🥈 30%  ·  🥉 20%</div>
                  {tournamentData.leaderboard?.length > 0 && (
                    <div className="lb" style={{ marginTop: 0, marginBottom: 14 }}>
                      <div className="cinzel gold" style={{ fontSize: 12, textAlign: "center", marginBottom: 6 }}>Current Rankings</div>
                      {tournamentData.leaderboard.slice(0, 7).map((p, i) => (
                        <div key={i} className={`lb-row ${p.name === username.trim() ? "lb-you" : ""}`}>
                          <span className="lb-rank">#{i+1}</span><span className="lb-name">{p.name}</span><span className="lb-wins">{p.best_wins}W</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="tourney-enter">
                    <div className="cinzel" style={{ fontSize: 14, color: "#F59E0B", marginBottom: 8 }}>Enter Tournament</div>
                    <div className="dim" style={{ fontSize: 11, marginBottom: 8 }}>Send {tournamentData.entryFee} $MGC to:</div>
                    <button className="copy-btn" onClick={(e) => {
                      navigator.clipboard?.writeText(tournamentData.treasuryWallet);
                      e.target.textContent = "✅ Copied!";
                      setTimeout(() => { e.target.textContent = `📋 ${tournamentData.treasuryWallet?.slice(0,8)}...${tournamentData.treasuryWallet?.slice(-8)}`; }, 1500);
                    }}>📋 {tournamentData.treasuryWallet?.slice(0,8)}...{tournamentData.treasuryWallet?.slice(-8)}</button>
                    <input className="tourney-input" id="tw-wallet" placeholder="Your Solana wallet..." maxLength={64} />
                    <input className="tourney-input" id="tw-tx" placeholder="Paste transaction signature..." maxLength={128} />
                    <div className="tourney-status" style={{ color: tournamentStatus.startsWith("✅") ? "#66BB6A" : tournamentStatus.startsWith("❌") ? "#ef5350" : "#F59E0B" }}>{tournamentStatus}</div>
                    <button className="btn-gold btn-ranked" style={{ width: "100%" }} onClick={() => {
                      const w = document.getElementById("tw-wallet")?.value?.trim();
                      const tx = document.getElementById("tw-tx")?.value?.trim();
                      if (!w || w.length < 32) { setTournamentStatus("❌ Enter your Solana wallet"); return; }
                      if (!tx || tx.length < 64) { setTournamentStatus("❌ Enter the transaction signature"); return; }
                      enterTournament(w, tx);
                    }}>⚔️ ENTER & PLAY</button>
                  </div>
                </>)}
                <button className="btn-gold btn-dim" style={{ marginTop: 14 }} onClick={() => transition(() => setScreen("title"))}>← Back</button>
              </div>
            )}

            {/* ===== SELECT ===== */}
            {screen === "select" && (
              <div className="select-wrap">
                <div className="cinzel" style={{ fontSize: 20, marginBottom: 6 }}>Choose Your Wizard</div>
                {isRanked && <div className="ranked-badge" style={{ marginBottom: 14 }}>🏆 RANKED MODE</div>}
                <div className="wiz-grid">
                  {Object.entries(WIZARD_TYPES).map(([key, wiz]) => (
                    <div key={key} className="wiz-card" onClick={() => startGame(key)}
                      style={{ borderColor: `${wiz.color}33` }}>
                      <AnimSprite basePath={wiz.sprite} fallback={wiz.emoji} size={52} frameW={64} />
                      <div className="wiz-card-name" style={{ color: wiz.color }}>{wiz.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== BATTLE ===== */}
            {screen === "battle" && enemy && (
              <div className="battle-wrap">
                <div className="battle-top">
                  <span>⚔️ Battle {level}</span>
                  {isRanked && <span className="ranked-badge">🏆 RANKED</span>}
                  <span>🏆 Wins: {wins}</span>
                </div>

                <div className="arena">
                  {/* Enemy */}
                  <div className={`fighter ${shakeEnemy ? "shake" : ""}`}>
                    <div className="fighter-avatar" style={{ background: `linear-gradient(135deg, ${WIZARD_TYPES[enemy.type]?.color || "#9C27B0"}44, ${WIZARD_TYPES[enemy.type]?.color || "#9C27B0"}22)` }}>
                      <AnimSprite basePath={enemy.sprite} fallback="👹" size={64} frameW={enemy.frameW || 64} />
                    </div>
                    <div className="fighter-info">
                      <div className="fighter-name">
                        {enemy.name} <span className="dim" style={{ fontSize: 10 }}>Lv.{enemy.level}</span>
                        {enemyIntent && <span className="intent">{enemyIntent === "heavy" ? "💀 Power" : "⚔️ Atk"}</span>}
                      </div>
                      <HPBar current={enemy.hp} max={enemy.maxHp} color={WIZARD_TYPES[enemy.type]?.color || "#9C27B0"} />
                      <div className="hp-num">{Math.max(0, Math.ceil(enemy.hp))}/{enemy.maxHp}</div>
                    </div>
                    {dmgPopups.filter(p => p.position === "enemy").map(p => <DmgPopup key={p.id} value={p.value} type={p.type} />)}
                  </div>

                  <div className="vs">— VS —</div>

                  {/* Player */}
                  <div className={`fighter ${shakePlayer ? "shake" : ""} ${glowPlayer ? "glow" : ""}`}>
                    <div className="fighter-avatar" style={{ background: `linear-gradient(135deg, ${typeInfo?.color}44, ${typeInfo?.color}22)` }}>
                      <AnimSprite basePath={typeInfo?.sprite} fallback="🧙‍♂️" size={64} frameW={64} />
                    </div>
                    <div className="fighter-info">
                      <div className="fighter-name" style={{ color: typeInfo?.color }}>
                        {username || "You"} <span style={{ fontSize: 10 }}>{typeInfo?.name}</span>
                      </div>
                      <HPBar current={playerHp} max={playerMaxHp} color={typeInfo?.color} />
                      <div className="hp-num">{Math.max(0, Math.ceil(playerHp))}/{playerMaxHp}</div>
                      <ManaBar current={playerMana} max={playerMaxMana} />
                    </div>
                    {dmgPopups.filter(p => p.position === "player").map(p => <DmgPopup key={p.id} value={p.value} type={p.type} />)}
                  </div>
                </div>

                <div className="combat-log" ref={logRef}>
                  {log.map((l, i) => <div key={i}>{l}</div>)}
                </div>

                <div className="spells-grid">
                  {spells.map((spell, i) => {
                    const can = turn === "player" && playerMana >= spell.cost;
                    return (
                      <button key={i}
                        className={`spell-btn ${!can ? "off" : ""} ${spell.type === "ultimate" ? "ult" : ""} ${spell.cost === 0 ? "free" : ""}`}
                        onClick={() => can && castSpell(spell)}>
                        <Icon src={spell.icon} fallback="✦" size={26} />
                        <div>
                          <div className="spell-name">{spell.name}</div>
                          <div className="spell-stat">
                            <span style={{ color: "#b388ff" }}>{spell.cost === 0 ? "FREE" : `✨${spell.cost}`}</span>
                            {spell.dmg > 0 && <span style={{ color: "#ef5350" }}>⚔️{spell.dmg + Math.floor(level * 1.5)}</span>}
                            {spell.heal > 0 && <span style={{ color: "#66BB6A" }}>💚+{spell.heal + Math.floor(level * 2)}</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== VICTORY ===== */}
            {screen === "victory" && (
              <div className="result-wrap">
                <div className="result-icon"><AnimSprite basePath="ui/trophy" fallback="🏆" size={64} frameW={64} /></div>
                <div className="result-title gold">VICTORY!</div>
                <div className="dim" style={{ fontSize: 13 }}>{enemy?.name} defeated</div>
                {isRanked && <div className="ranked-badge" style={{ margin: "6px 0" }}>🏆 Ranked Run</div>}
                <div className="result-stats">
                  {[{ l: "Wins", v: wins }, { l: "Level", v: level }, { l: "HP Left", v: Math.ceil(playerHp) }].map((s, i) => (
                    <div key={i}><div className="result-stat-val">{s.v}</div><div className="result-stat-label">{s.l}</div></div>
                  ))}
                </div>
                <div className="dim" style={{ fontSize: 12 }}>💚 +25% HP & ✨ +30% Mana restored</div>
                <button className="btn-gold" onClick={nextBattle}>NEXT BATTLE →</button>
                {isTelegram && <button className="btn-gold btn-tg" onClick={shareScore}>📤 Share Score</button>}
                <button className="btn-gold btn-dim" onClick={() => { setGameMode("free"); transition(() => setScreen("title")); }}>MENU</button>
              </div>
            )}

            {/* ===== TAVERN ===== */}
            {screen === "tavern" && (
              <div className="tavern-wrap">
                <div className="result-icon"><AnimSprite basePath="ui/tavern-sign" fallback="🍺" size={72} frameW={72} /></div>
                <div className="cinzel gold" style={{ fontSize: 22, marginBottom: 4 }}>The Wizard's Tavern</div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 16 }}>Rest before your next battle.</div>
                {isRanked && <div className="ranked-badge" style={{ marginBottom: 12 }}>🏆 Ranked Run</div>}
                <div className="tavern-status">
                  <span style={{ color: "#ef5350" }}>❤️ {Math.ceil(playerHp)}/{playerMaxHp}</span>
                  <span style={{ color: "#b388ff" }}>✨ {Math.ceil(playerMana)}/{playerMaxMana}</span>
                </div>
                <div className="tavern-choices">
                  {[
                    { k: "feast", name: "Feast", desc: "+60% HP, +15% Mana", icon: "ui/feast.png", fb: "🍖", bc: "rgba(239,83,80,0.15)" },
                    { k: "meditate", name: "Meditate", desc: "Full Mana, +25% HP", icon: "ui/meditate.png", fb: "🧘", bc: "rgba(124,77,255,0.15)" },
                    { k: "rest", name: "Rest", desc: "+40% HP, +50% Mana", icon: "ui/rest.png", fb: "🛏️", bc: "rgba(245,158,11,0.15)" },
                  ].map(c => (
                    <button key={c.k} className="tavern-btn" onClick={() => tavernChoice(c.k)}
                      onMouseEnter={e => e.currentTarget.style.borderColor = c.bc}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(245,158,11,0.12)"}>
                      <Icon src={c.icon} fallback={c.fb} size={36} />
                      <div>
                        <div className="tavern-btn-name">{c.name}</div>
                        <div className="tavern-btn-desc">{c.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="dim" style={{ fontSize: 10, marginTop: 18, fontStyle: "italic" }}>Choose wisely — the next enemy is stronger.</div>
              </div>
            )}

            {/* ===== GAME OVER ===== */}
            {screen === "gameover" && (
              <div className="result-wrap">
                <div className="result-icon"><AnimSprite basePath="ui/skull" fallback="💀" size={64} frameW={64} /></div>
                <div className="result-title" style={{ color: "#F44336" }}>DEFEATED</div>
                <div className="dim" style={{ fontSize: 12 }}>The magic wasn't strong enough...</div>
                {isRanked && <div className="ranked-badge" style={{ margin: "6px 0" }}>🏆 Ranked Run — Score submitted</div>}
                <div className="result-stats">
                  {[{ l: "Victories", v: wins }, { l: "Reached", v: `Lv.${level}` }].map((s, i) => (
                    <div key={i}><div className="result-stat-val">{s.v}</div><div className="result-stat-label">{s.l}</div></div>
                  ))}
                </div>
                <button className="btn-gold" onClick={() => transition(() => setScreen("select"))}>TRY AGAIN</button>
                {isTelegram && <button className="btn-gold btn-tg" onClick={shareScore}>📤 Share Score</button>}
                <button className="btn-gold btn-dim" onClick={() => { setGameMode("free"); transition(() => setScreen("title")); }}>MENU</button>

                {leaderboard.length > 0 && (
                  <div className="lb">
                    <div className="cinzel gold" style={{ fontSize: 14, textAlign: "center", marginBottom: 8 }}>{isRanked ? "🏆 Ranked Leaderboard" : "🏆 Leaderboard"}</div>
                    {leaderboard.slice(0, 8).map((p, i) => (
                      <div key={i} className={`lb-row ${p.name === username.trim() ? "lb-you" : ""}`}>
                        <span className="lb-rank">#{i+1}</span>
                        <span className="lb-name">{p.name || p.wallet}</span>
                        <span className="lb-wins">{p.best_wins ?? p.wins}W</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}