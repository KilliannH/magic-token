import { useState, useEffect, useRef, useCallback } from "react";
import Phaser from "phaser";

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
  fire:    { name: "Fire",    color: 0xFF6B35, hex: "#FF6B35", emoji: "🔥", sprite: "wiz_fire" },
  ice:     { name: "Ice",     color: 0x4FC3F7, hex: "#4FC3F7", emoji: "❄️", sprite: "wiz_ice" },
  shadow:  { name: "Shadow",  color: 0x9C27B0, hex: "#9C27B0", emoji: "🌑", sprite: "wiz_shadow" },
  nature:  { name: "Nature",  color: 0x66BB6A, hex: "#66BB6A", emoji: "🌿", sprite: "wiz_nature" },
  thunder: { name: "Thunder", color: 0xFFD600, hex: "#FFD600", emoji: "⚡", sprite: "wiz_thunder" },
};

const SPELLS = {
  fire: [
    { name: "Fire Punch", dmg: 12, cost: 0, type: "attack", icon: "sp_fire_punch" },
    { name: "Fireball", dmg: 25, cost: 20, type: "attack", icon: "sp_fireball" },
    { name: "Inferno", dmg: 45, cost: 40, type: "attack", icon: "sp_inferno" },
    { name: "Fire Shield", dmg: 0, cost: 25, type: "defend", heal: 20, icon: "sp_fire_shield" },
    { name: "Meteor", dmg: 70, cost: 65, type: "ultimate", icon: "sp_meteor" },
  ],
  ice: [
    { name: "Frost Slap", dmg: 11, cost: 0, type: "attack", icon: "sp_frost_slap" },
    { name: "Ice Shard", dmg: 22, cost: 18, type: "attack", icon: "sp_ice_shard" },
    { name: "Blizzard", dmg: 40, cost: 38, type: "attack", icon: "sp_blizzard" },
    { name: "Frost Armor", dmg: 0, cost: 22, type: "defend", heal: 25, icon: "sp_frost_armor" },
    { name: "Absolute Zero", dmg: 65, cost: 60, type: "ultimate", icon: "sp_absolute_zero" },
  ],
  shadow: [
    { name: "Dark Punch", dmg: 12, cost: 0, type: "attack", icon: "sp_dark_punch" },
    { name: "Shadow Bolt", dmg: 24, cost: 19, type: "attack", icon: "sp_shadow_bolt" },
    { name: "Nightmare", dmg: 42, cost: 39, type: "attack", icon: "sp_nightmare" },
    { name: "Dark Veil", dmg: 0, cost: 23, type: "defend", heal: 22, icon: "sp_dark_veil" },
    { name: "Void Rupture", dmg: 68, cost: 62, type: "ultimate", icon: "sp_void_rupture" },
  ],
  nature: [
    { name: "Root Slap", dmg: 10, cost: 0, type: "attack", icon: "sp_root_slap" },
    { name: "Vine Whip", dmg: 20, cost: 16, type: "attack", icon: "sp_vine_whip" },
    { name: "Thorn Storm", dmg: 38, cost: 35, type: "attack", icon: "sp_thorn_storm" },
    { name: "Heal Bloom", dmg: 0, cost: 20, type: "defend", heal: 35, icon: "sp_heal_bloom" },
    { name: "Ancient Oak", dmg: 60, cost: 58, type: "ultimate", icon: "sp_ancient_oak" },
  ],
  thunder: [
    { name: "Zap", dmg: 12, cost: 0, type: "attack", icon: "sp_zap" },
    { name: "Spark", dmg: 23, cost: 17, type: "attack", icon: "sp_spark" },
    { name: "Lightning", dmg: 43, cost: 40, type: "attack", icon: "sp_lightning" },
    { name: "Static Field", dmg: 0, cost: 24, type: "defend", heal: 18, icon: "sp_static_field" },
    { name: "Thunder God", dmg: 72, cost: 68, type: "ultimate", icon: "sp_thunder_god" },
  ],
};

const ENEMIES = [
  { name: "Dark Apprentice", sprite: "en_dark_apprentice" },
  { name: "Goblin Mage", sprite: "en_goblin_mage" },
  { name: "Shadow Imp", sprite: "en_shadow_imp" },
  { name: "Cursed Knight", sprite: "en_cursed_knight" },
  { name: "Crystal Golem", sprite: "en_crystal_golem" },
  { name: "Phantom Witch", sprite: "en_phantom_witch" },
  { name: "Bone Sorcerer", sprite: "en_bone_sorcerer" },
  { name: "Void Walker", sprite: "en_void_walker" },
  { name: "Dragon Whelp", sprite: "en_dragon_whelp" },
  { name: "Demon Summoner", sprite: "en_demon_summoner" },
];

const MANA_REGEN = 25;

function getEnemy(level) {
  const e = ENEMIES[(level - 1) % ENEMIES.length];
  const types = Object.keys(WIZARD_TYPES);
  const baseHp = 80 + level * 15;
  const baseDmg = 10 + level * 2;
  return {
    ...e, level,
    type: types[Math.floor(Math.random() * types.length)],
    maxHp: baseHp, hp: baseHp,
    dmgMin: Math.floor(baseDmg * 0.7), dmgMax: baseDmg,
  };
}

// ============ PHASER SCENES ============

const W = 400;
const H = 720;

// Shared game state via registry
function initState(reg) {
  reg.set("playerType", null);
  reg.set("playerHp", 100); reg.set("playerMaxHp", 100);
  reg.set("playerMana", 100); reg.set("playerMaxMana", 100);
  reg.set("enemy", null);
  reg.set("level", 1); reg.set("wins", 0);
  reg.set("username", "");
}

// ---- Helper: create text ----
function txt(scene, x, y, text, style = {}) {
  return scene.add.text(x, y, text, {
    fontFamily: "Cinzel, serif",
    fontSize: 16, color: "#e0d0ff",
    align: "center",
    ...style,
  }).setOrigin(0.5);
}

// ---- Helper: create button ----
function btn(scene, x, y, w, h, label, color, cb) {
  const bg = scene.add.rectangle(x, y, w, h, color, 0.15)
    .setStrokeStyle(2, color, 0.6).setInteractive({ useHandCursor: true });
  const t = txt(scene, x, y, label, { fontSize: 14, fontFamily: "Quicksand, sans-serif", color: "#fff" });
  bg.on("pointerover", () => { bg.setFillStyle(color, 0.3); });
  bg.on("pointerout", () => { bg.setFillStyle(color, 0.15); });
  bg.on("pointerdown", () => { haptic("impact"); cb(); });
  return { bg, t };
}

// ---- Helper: HP bar ----
function drawBar(scene, x, y, w, h, pct, color, bgColor = 0xffffff) {
  const track = scene.add.rectangle(x, y, w, h, bgColor, 0.08).setOrigin(0, 0.5);
  const fill = scene.add.rectangle(x, y, w * Math.max(0, pct), h, color).setOrigin(0, 0.5);
  return { track, fill, update(newPct) { scene.tweens.add({ targets: fill, width: w * Math.max(0, newPct), duration: 300 }); }};
}

// ---- Helper: try load sprite, create colored rect fallback ----
function avatar(scene, x, y, key, color, size = 64) {
  // Try animated sprite sheet first
  const idleKey = key + "_idle";
  const animKey = idleKey + "_anim";
  if (scene.textures.exists(idleKey)) {
    const sprite = scene.add.sprite(x, y, idleKey).setDisplaySize(size, size);
    if (scene.anims.exists(animKey)) {
      sprite.play(animKey);
    }
    return sprite;
  }
  // Fallback to static image
  if (scene.textures.exists(key)) {
    return scene.add.image(x, y, key).setDisplaySize(size, size);
  }
  // Fallback to colored rectangle
  return scene.add.rectangle(x, y, size, size, color, 0.7).setStrokeStyle(2, color);
}

// ============================
// BOOT SCENE
// ============================
class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }
  preload() {
    // Loading bar
    const bar = this.add.rectangle(W/2, H/2, 200, 16, 0x222222).setStrokeStyle(1, 0x8B5CF6);
    const fill = this.add.rectangle(W/2 - 98, H/2, 0, 12, 0x8B5CF6).setOrigin(0, 0.5);
    this.load.on("progress", v => { fill.width = 196 * v; });

    txt(this, W/2, H/2 - 40, "✨ Loading...", { fontSize: 14, color: "#8b7aab" });

    // Try loading all assets — game works without them (fallbacks)
    const a = "/assets/";
    // Wizards — try sprite sheets first, static as fallback
    ["fire","ice","shadow","nature","thunder"].forEach(el => {
      this.load.spritesheet("wiz_"+el+"_idle", a+"wizards/"+el+"_idle.png", { frameWidth: 64, frameHeight: 64 });
      this.load.image("wiz_"+el, a+"wizards/"+el+".png");
    });
    // Enemies — try sprite sheets first, static as fallback
    ENEMIES.forEach(e => {
      const file = e.sprite.replace("en_","");
      this.load.spritesheet(e.sprite+"_idle", a+"enemies/"+file+"_idle.png", { frameWidth: 64, frameHeight: 64 });
      this.load.image(e.sprite, a+"enemies/"+file+".png");
    });
    // Backgrounds
    this.load.image("bg_arena", a+"bg/arena.png");
    this.load.image("bg_tavern", a+"bg/tavern.png");
    // UI
    this.load.image("ui_title", a+"ui/title-wizard.png");
    this.load.image("ui_trophy", a+"ui/trophy.png");
    this.load.image("ui_skull", a+"ui/skull.png");
    this.load.image("ui_tavern", a+"ui/tavern-sign.png");
    this.load.image("ui_feast", a+"ui/feast.png");
    this.load.image("ui_meditate", a+"ui/meditate.png");
    this.load.image("ui_rest", a+"ui/rest.png");
    // Spell icons
    Object.entries(SPELLS).forEach(([el, spells]) => {
      spells.forEach(s => {
        const file = s.icon.replace("sp_", "").replace(/_/g, "-");
        this.load.image(s.icon, a+"spells/"+el+"/"+file+".png");
      });
    });

    // Ignore load errors (fallbacks handle missing assets)
    this.load.on("loaderror", () => {});
  }
  create() {
    // Create idle animations for all wizards and enemies
    ["fire","ice","shadow","nature","thunder"].forEach(el => {
      const key = "wiz_"+el+"_idle";
      if (this.textures.exists(key)) {
        this.anims.create({
          key: key+"_anim",
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
          frameRate: 4, repeat: -1,
        });
      }
    });
    ENEMIES.forEach(e => {
      const key = e.sprite+"_idle";
      if (this.textures.exists(key)) {
        this.anims.create({
          key: key+"_anim",
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
          frameRate: 4, repeat: -1,
        });
      }
    });
    initState(this.registry);
    this.scene.start("Title");
  }
}

// ============================
// TITLE SCENE
// ============================
class TitleScene extends Phaser.Scene {
  constructor() { super("Title"); }
  create() {
    this.cameras.main.setBackgroundColor("#0a0514");

    // Sparkles
    for (let i = 0; i < 40; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        Phaser.Math.Between(1, 2), 0xFFD700, 0
      );
      this.tweens.add({
        targets: s, alpha: { from: 0, to: 0.6 }, yoyo: true, repeat: -1,
        duration: Phaser.Math.Between(1500, 3000), delay: Phaser.Math.Between(0, 2000),
      });
    }

    // Title wizard
    const wiz = this.textures.exists("ui_title")
      ? this.add.image(W/2, 180, "ui_title").setDisplaySize(96, 96)
      : txt(this, W/2, 180, "🧙‍♂️", { fontSize: 72 });
    this.tweens.add({ targets: wiz, y: 168, yoyo: true, repeat: -1, duration: 2000, ease: "Sine.easeInOut" });

    txt(this, W/2, 260, "WIZARD WARS", { fontSize: 32, color: "#FFD700", fontFamily: "Cinzel Decorative, Cinzel, serif" });
    txt(this, W/2, 295, "A $MGC Battle Game", { fontSize: 14, color: "#b388ff", fontFamily: "Quicksand, sans-serif" });
    txt(this, W/2, 335, "Choose your wizard. Cast spells.\nDefeat enemies. Climb the ranks.", {
      fontSize: 12, color: "#8b7aab", fontFamily: "Quicksand, sans-serif", lineSpacing: 4,
    });

    // Name input via DOM
    const inputHTML = `<input type="text" id="phaser-name" maxlength="16"
      placeholder="Enter wizard name..."
      style="width:220px;padding:10px 16px;border-radius:14px;border:2px solid rgba(139,92,246,0.3);
      background:rgba(20,12,40,0.9);color:#e0d0ff;font-family:Quicksand,sans-serif;font-size:15px;
      font-weight:700;text-align:center;outline:none;" />`;
    const dom = this.add.dom(W/2, 400).createFromHTML(inputHTML);
    const input = dom.getChildByID("phaser-name");

    // Pre-fill Telegram name
    const tgName = isTelegram ? (tg.initDataUnsafe?.user?.first_name || "") : "";
    if (tgName) input.value = tgName;

    // Play button
    const playBtn = btn(this, W/2, 470, 180, 46, "⚔️  PLAY", 0xFFD700, () => {
      const name = input.value.trim();
      if (!name) return;
      this.registry.set("username", name);
      this.scene.start("Select");
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        this.registry.set("username", input.value.trim());
        this.scene.start("Select");
      }
    });

    // Fade in
    this.cameras.main.fadeIn(400);
  }
}

// ============================
// SELECT SCENE
// ============================
class SelectScene extends Phaser.Scene {
  constructor() { super("Select"); }
  create() {
    this.cameras.main.setBackgroundColor("#0a0514");

    txt(this, W/2, 50, "Choose Your Wizard", { fontSize: 22, color: "#e0d0ff" });

    const keys = Object.keys(WIZARD_TYPES);
    const cols = 3;
    const cardW = 110, cardH = 130, gap = 10;
    const startX = (W - (cols * cardW + (cols-1) * gap)) / 2 + cardW/2;
    const startY = 130;

    keys.forEach((key, i) => {
      const wiz = WIZARD_TYPES[key];
      const col = i % cols, row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + gap);

      const card = this.add.rectangle(cx, cy, cardW, cardH, wiz.color, 0.08)
        .setStrokeStyle(2, wiz.color, 0.2).setInteractive({ useHandCursor: true });

      // Avatar
      avatar(this, cx, cy - 25, wiz.sprite, wiz.color, 48);

      txt(this, cx, cy + 20, wiz.name, { fontSize: 15, color: wiz.hex });

      // Spell dots
      const spells = SPELLS[key];
      spells.forEach((s, si) => {
        const dotX = cx - ((spells.length - 1) * 8) / 2 + si * 8;
        this.add.circle(dotX, cy + 42, 3, s.type === "ultimate" ? 0xFFD700 : wiz.color, 0.5);
      });

      card.on("pointerover", () => card.setFillStyle(wiz.color, 0.2));
      card.on("pointerout", () => card.setFillStyle(wiz.color, 0.08));
      card.on("pointerdown", () => {
        haptic("impact");
        this.registry.set("playerType", key);
        this.registry.set("playerHp", 100); this.registry.set("playerMaxHp", 100);
        this.registry.set("playerMana", 100); this.registry.set("playerMaxMana", 100);
        this.registry.set("level", 1); this.registry.set("wins", 0);
        this.registry.set("enemy", getEnemy(1));
        this.cameras.main.fadeOut(200, 0, 0, 0, (cam, pct) => {
          if (pct >= 1) this.scene.start("Battle");
        });
      });
    });

    this.cameras.main.fadeIn(300);
  }
}

// ============================
// BATTLE SCENE
// ============================
class BattleScene extends Phaser.Scene {
  constructor() { super("Battle"); }

  create() {
    this.cameras.main.setBackgroundColor("#0a0514");

    const reg = this.registry;
    const type = reg.get("playerType");
    const wizInfo = WIZARD_TYPES[type];
    const spells = SPELLS[type];
    let enemy = reg.get("enemy");
    let turn = "player";

    // Background
    if (this.textures.exists("bg_arena")) {
      this.add.image(W/2, 180, "bg_arena").setDisplaySize(W - 16, 240).setAlpha(0.3);
    }

    // ---- TOP BAR ----
    const levelTxt = txt(this, 60, 20, `⚔️ Battle ${reg.get("level")}`, {
      fontSize: 12, color: "#b388ff", fontFamily: "Quicksand, sans-serif"
    });
    const winsTxt = txt(this, W - 60, 20, `🏆 Wins: ${reg.get("wins")}`, {
      fontSize: 12, color: "#b388ff", fontFamily: "Quicksand, sans-serif"
    });

    // ---- ENEMY ----
    const enemyColor = WIZARD_TYPES[enemy.type]?.color || 0x9C27B0;
    const enemyAv = avatar(this, 55, 90, enemy.sprite, enemyColor, 64);
    const enemyNameTxt = txt(this, 200, 65, `${enemy.name}  Lv.${enemy.level}`, {
      fontSize: 13, color: "#e0d0ff", fontFamily: "Quicksand, sans-serif",
    }).setOrigin(0, 0.5);
    const enemyIntentTxt = txt(this, 340, 65, "", { fontSize: 10, color: "#ef5350", fontFamily: "Quicksand, sans-serif" });
    const enemyHpBar = drawBar(this, 130, 90, 220, 10, 1, enemyColor);
    const enemyHpTxt = txt(this, 350, 90, `${enemy.hp}/${enemy.maxHp}`, {
      fontSize: 10, color: "#8b7aab", fontFamily: "Quicksand, sans-serif"
    }).setOrigin(0, 0.5);

    // ---- VS ----
    txt(this, W/2, 130, "— VS —", { fontSize: 11, color: "#4a3660" });

    // ---- PLAYER ----
    const playerAv = avatar(this, 55, 175, wizInfo.sprite, wizInfo.color, 64);
    const playerName = reg.get("username") || "You";
    txt(this, 200, 150, `${playerName}  ${wizInfo.name}`, {
      fontSize: 13, color: wizInfo.hex, fontFamily: "Quicksand, sans-serif",
    }).setOrigin(0, 0.5);
    const playerHpBar = drawBar(this, 130, 172, 220, 10, 1, wizInfo.color);
    const playerHpTxt = txt(this, 350, 172, `${reg.get("playerHp")}/${reg.get("playerMaxHp")}`, {
      fontSize: 10, color: "#8b7aab", fontFamily: "Quicksand, sans-serif"
    }).setOrigin(0, 0.5);
    const playerManaBar = drawBar(this, 130, 192, 220, 7, 1, 0x7c4dff);
    const playerManaTxt = txt(this, 350, 192, `✨ ${reg.get("playerMana")}/${reg.get("playerMaxMana")}`, {
      fontSize: 9, color: "#b388ff", fontFamily: "Quicksand, sans-serif"
    }).setOrigin(0, 0.5);

    // ---- COMBAT LOG ----
    const logBg = this.add.rectangle(W/2, 240, W - 24, 60, 0x0a0514, 0.6).setStrokeStyle(1, 0x7B2FBE, 0.08);
    const logTxt = txt(this, W/2, 240, `A new challenger: ${enemy.name}!`, {
      fontSize: 11, color: "#8b7aab", fontFamily: "Quicksand, sans-serif", wordWrap: { width: W - 48 },
    });
    const logLines = [];
    const addLog = (msg) => {
      logLines.push(msg);
      if (logLines.length > 3) logLines.shift();
      logTxt.setText(logLines.join("\n"));
    };

    // ---- ENEMY INTENT ----
    let intent = Math.random() > 0.5 ? "heavy" : "normal";
    const updateIntent = () => {
      intent = Math.random() > 0.5 ? "heavy" : "normal";
      enemyIntentTxt.setText(intent === "heavy" ? "💀 Power" : "⚔️ Atk");
    };
    updateIntent();

    // ---- UPDATE UI ----
    const refreshUI = () => {
      const hp = reg.get("playerHp"), maxHp = reg.get("playerMaxHp");
      const mana = reg.get("playerMana"), maxMana = reg.get("playerMaxMana");
      enemy = reg.get("enemy");

      playerHpBar.update(hp / maxHp);
      playerHpTxt.setText(`${Math.max(0, Math.ceil(hp))}/${maxHp}`);
      playerManaBar.update(mana / maxMana);
      playerManaTxt.setText(`✨ ${Math.ceil(mana)}/${maxMana}`);
      enemyHpBar.update(enemy.hp / enemy.maxHp);
      enemyHpTxt.setText(`${Math.max(0, Math.ceil(enemy.hp))}/${enemy.maxHp}`);

      // Update spell button opacity
      spellBtns.forEach((b, i) => {
        const canCast = turn === "player" && mana >= spells[i].cost;
        b.bg.setAlpha(canCast ? 1 : 0.3);
        b.label.setAlpha(canCast ? 1 : 0.3);
        b.cost.setAlpha(canCast ? 1 : 0.3);
      });
    };

    // ---- DAMAGE POPUP ----
    const popDmg = (x, y, value, color) => {
      const t = this.add.text(x, y, value > 0 ? `-${value}` : `+${Math.abs(value)}`, {
        fontFamily: "Cinzel, serif", fontSize: 22, fontStyle: "bold",
        color: color, stroke: "#000", strokeThickness: 3,
      }).setOrigin(0.5);
      this.tweens.add({ targets: t, y: y - 40, alpha: 0, scale: 1.3, duration: 800, onComplete: () => t.destroy() });
    };

    // ---- ENEMY TURN ----
    const enemyTurn = () => {
      const e = reg.get("enemy");
      if (!e || e.hp <= 0) return;

      const isHeavy = intent === "heavy";
      const dmg = isHeavy
        ? Math.floor(e.dmgMax * 1.2) + Phaser.Math.Between(0, 4)
        : Phaser.Math.Between(e.dmgMin, e.dmgMax);

      this.time.delayedCall(600, () => {
        const newHp = reg.get("playerHp") - dmg;
        reg.set("playerHp", newHp);
        reg.set("playerMana", Math.min(reg.get("playerMana") + MANA_REGEN, reg.get("playerMaxMana")));

        this.tweens.add({ targets: playerAv, x: playerAv.x + 6, yoyo: true, repeat: 2, duration: 50 });
        popDmg(200, 160, dmg, "#F44336");
        addLog(`${e.name} uses ${isHeavy ? "Power Attack" : "Attack"}! -${dmg} HP`);
        addLog(`✨ +${MANA_REGEN} mana restored`);

        refreshUI();
        updateIntent();

        if (newHp <= 0) {
          haptic("error");
          this.time.delayedCall(600, () => {
            this.cameras.main.fadeOut(300, 0, 0, 0, (cam, pct) => {
              if (pct >= 1) this.scene.start("GameOver");
            });
          });
        } else {
          turn = "player";
          refreshUI();
        }
      });
    };

    // ---- CAST SPELL ----
    const castSpell = (spell) => {
      if (turn !== "player") return;
      const mana = reg.get("playerMana");
      if (mana < spell.cost) return;

      turn = "waiting";
      reg.set("playerMana", mana - spell.cost);
      haptic("impact");

      if (spell.type === "defend" && spell.heal) {
        const maxHp = reg.get("playerMaxHp");
        const levelBonus = Math.floor(reg.get("level") * 3);
        const healAmt = spell.heal + levelBonus;
        const newHp = Math.min(reg.get("playerHp") + healAmt, maxHp);
        reg.set("playerHp", newHp);
        this.tweens.add({ targets: playerAv, alpha: 1.5, yoyo: true, duration: 200, repeat: 1 });
        popDmg(200, 160, -healAmt, "#66BB6A");
        addLog(`✨ ${spell.name}! +${healAmt} HP`);
      } else {
        const levelBonus = Math.floor(reg.get("level") * 2);
        const baseDmg = spell.dmg + levelBonus;
        const crit = Math.random() < 0.15;
        const dmg = crit ? Math.floor(baseDmg * 1.5) : baseDmg;
        const e = reg.get("enemy");
        e.hp -= dmg;
        reg.set("enemy", e);
        this.tweens.add({ targets: enemyAv, x: enemyAv.x + 6, yoyo: true, repeat: 2, duration: 50 });
        popDmg(200, 75, dmg, crit ? "#FF9800" : "#F44336");
        addLog(`${spell.name}: ${dmg} dmg${crit ? " 💥CRIT!" : ""}`);

        if (e.hp <= 0) {
          haptic("success");
          reg.set("wins", reg.get("wins") + 1);
          refreshUI();
          this.time.delayedCall(500, () => {
            this.cameras.main.fadeOut(300, 0, 0, 0, (cam, pct) => {
              if (pct >= 1) this.scene.start("Victory");
            });
          });
          return;
        }
      }

      refreshUI();
      enemyTurn();
    };

    // ---- SPELL BUTTONS ----
    const spellBtns = [];
    const spellStartY = 290;
    const btnW = (W - 36) / 2, btnH = 52;

    spells.forEach((spell, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 14 + col * (btnW + 8) + btnW / 2;
      const y = spellStartY + row * (btnH + 6) + btnH / 2;

      const isUlt = spell.type === "ultimate";
      const borderCol = isUlt ? 0xFFD700 : 0x7B2FBE;

      const bg = this.add.rectangle(x, y, btnW, btnH, borderCol, 0.06)
        .setStrokeStyle(1.5, borderCol, 0.25).setInteractive({ useHandCursor: true });

      // Icon
      if (this.textures.exists(spell.icon)) {
        this.add.image(x - btnW/2 + 22, y, spell.icon).setDisplaySize(24, 24);
      }

      const label = txt(this, x + 4, y - 8, spell.name, {
        fontSize: 12, fontFamily: "Quicksand, sans-serif", color: "#e0d0ff",
      });
      const costStr = spell.cost === 0 ? "FREE" : `✨${spell.cost}`;
      const dmgStr = spell.dmg > 0 ? ` ⚔️${spell.dmg}` : (spell.heal ? ` 💚+${spell.heal}` : "");
      const cost = txt(this, x + 4, y + 10, `${costStr}${dmgStr}`, {
        fontSize: 10, fontFamily: "Quicksand, sans-serif", color: "#8b7aab",
      });

      bg.on("pointerover", () => bg.setFillStyle(borderCol, 0.15));
      bg.on("pointerout", () => bg.setFillStyle(borderCol, 0.06));
      bg.on("pointerdown", () => castSpell(spell));

      spellBtns.push({ bg, label, cost });
    });

    refreshUI();
    this.cameras.main.fadeIn(300);
  }
}

// ============================
// VICTORY SCENE
// ============================
class VictoryScene extends Phaser.Scene {
  constructor() { super("Victory"); }
  create() {
    this.cameras.main.setBackgroundColor("#0a0514");
    const reg = this.registry;

    const icon = this.textures.exists("ui_trophy")
      ? this.add.image(W/2, 120, "ui_trophy").setDisplaySize(64, 64)
      : txt(this, W/2, 120, "🏆", { fontSize: 56 });
    this.tweens.add({ targets: icon, y: 110, yoyo: true, repeat: -1, duration: 2000, ease: "Sine.easeInOut" });

    txt(this, W/2, 180, "VICTORY!", { fontSize: 28, color: "#FFD700" });
    txt(this, W/2, 210, `${reg.get("enemy")?.name} defeated`, { fontSize: 13, color: "#8b7aab", fontFamily: "Quicksand, sans-serif" });

    // Stats
    const stats = [
      { label: "Wins", val: reg.get("wins") },
      { label: "Level", val: reg.get("level") },
      { label: "HP Left", val: Math.ceil(reg.get("playerHp")) },
    ];
    stats.forEach((s, i) => {
      const x = W/2 - 80 + i * 80;
      txt(this, x, 260, `${s.val}`, { fontSize: 22, color: "#FFD700" });
      txt(this, x, 285, s.label, { fontSize: 10, color: "#8b7aab", fontFamily: "Quicksand, sans-serif" });
    });

    txt(this, W/2, 320, "💚 +35% HP & ✨ +40% Mana restored", { fontSize: 12, color: "#81c784", fontFamily: "Quicksand, sans-serif" });

    // Next battle
    btn(this, W/2, 370, 200, 42, "NEXT BATTLE →", 0xFFD700, () => {
      const wins = reg.get("wins");
      if (wins > 0 && wins % 2 === 0) {
        this.scene.start("Tavern");
      } else {
        this.goToBattle();
      }
    });

    // Share (Telegram)
    if (isTelegram) {
      btn(this, W/2, 420, 180, 36, "📤 Share Score", 0x29B6F6, () => {
        tg.switchInlineQuery(`I scored ${reg.get("wins")} wins in Wizard Wars! 🧙‍♂️`, ["users", "groups"]);
      });
    }

    btn(this, W/2, isTelegram ? 465 : 425, 140, 36, "MENU", 0x8b7aab, () => {
      this.scene.start("Title");
    });

    this.cameras.main.fadeIn(300);
  }

  goToBattle() {
    const reg = this.registry;
    const newLevel = reg.get("level") + 1;
    reg.set("level", newLevel);
    reg.set("playerMaxHp", reg.get("playerMaxHp") + 40);
    const maxHp = reg.get("playerMaxHp");
    reg.set("playerHp", Math.min(reg.get("playerHp") + Math.floor(maxHp * 0.35), maxHp));
    reg.set("playerMaxMana", reg.get("playerMaxMana") + 40);
    const maxMana = reg.get("playerMaxMana");
    reg.set("playerMana", Math.min(reg.get("playerMana") + Math.floor(maxMana * 0.4), maxMana));
    reg.set("enemy", getEnemy(newLevel));
    this.scene.start("Battle");
  }
}

// ============================
// TAVERN SCENE
// ============================
class TavernScene extends Phaser.Scene {
  constructor() { super("Tavern"); }
  create() {
    this.cameras.main.setBackgroundColor("#0d0508");

    // Background
    if (this.textures.exists("bg_tavern")) {
      this.add.image(W/2, H/2, "bg_tavern").setDisplaySize(W, H).setAlpha(0.2);
    }

    const reg = this.registry;

    const icon = this.textures.exists("ui_tavern")
      ? this.add.image(W/2, 100, "ui_tavern").setDisplaySize(72, 72)
      : txt(this, W/2, 100, "🍺", { fontSize: 56 });
    this.tweens.add({ targets: icon, y: 90, yoyo: true, repeat: -1, duration: 2500, ease: "Sine.easeInOut" });

    txt(this, W/2, 160, "The Wizard's Tavern", { fontSize: 22, color: "#F59E0B" });
    txt(this, W/2, 190, "Rest before your next battle.", { fontSize: 12, color: "#8b7aab", fontFamily: "Quicksand, sans-serif" });

    // Status
    const hp = Math.ceil(reg.get("playerHp")), maxHp = reg.get("playerMaxHp");
    const mana = Math.ceil(reg.get("playerMana")), maxMana = reg.get("playerMaxMana");
    txt(this, W/2, 230, `❤️ ${hp}/${maxHp} HP     ✨ ${mana}/${maxMana} Mana`, {
      fontSize: 13, color: "#b388ff", fontFamily: "Quicksand, sans-serif",
    });

    // Choices
    const choices = [
      { key: "feast", label: "Feast", desc: "+70% HP, +20% Mana", icon: "ui_feast", emoji: "🍖", color: 0xef5350 },
      { key: "meditate", label: "Meditate", desc: "Full Mana, +30% HP", icon: "ui_meditate", emoji: "🧘", color: 0x7c4dff },
      { key: "rest", label: "Rest", desc: "+50% HP, +60% Mana", icon: "ui_rest", emoji: "🛏️", color: 0xF59E0B },
    ];

    choices.forEach((c, i) => {
      const y = 300 + i * 75;
      const bg = this.add.rectangle(W/2, y, W - 60, 60, c.color, 0.06)
        .setStrokeStyle(2, c.color, 0.15).setInteractive({ useHandCursor: true });

      // Icon
      if (this.textures.exists(c.icon)) {
        this.add.image(60, y, c.icon).setDisplaySize(36, 36);
      } else {
        txt(this, 60, y, c.emoji, { fontSize: 28 });
      }

      txt(this, 170, y - 10, c.label, { fontSize: 16, color: "#e0d0ff" }).setOrigin(0, 0.5);
      txt(this, 170, y + 12, c.desc, {
        fontSize: 11, color: "#8b7aab", fontFamily: "Quicksand, sans-serif"
      }).setOrigin(0, 0.5);

      bg.on("pointerover", () => bg.setFillStyle(c.color, 0.15));
      bg.on("pointerout", () => bg.setFillStyle(c.color, 0.06));
      bg.on("pointerdown", () => {
        haptic("success");
        this.applyChoice(c.key);
      });
    });

    txt(this, W/2, 540, "Choose wisely — the next enemy is stronger.", {
      fontSize: 10, color: "#5a4a6e", fontFamily: "Quicksand, sans-serif",
    });

    this.cameras.main.fadeIn(300);
  }

  applyChoice(choice) {
    const reg = this.registry;
    const maxHp = reg.get("playerMaxHp"), maxMana = reg.get("playerMaxMana");

    if (choice === "feast") {
      reg.set("playerHp", Math.min(reg.get("playerHp") + Math.floor(maxHp * 0.7), maxHp));
      reg.set("playerMana", Math.min(reg.get("playerMana") + Math.floor(maxMana * 0.2), maxMana));
    } else if (choice === "meditate") {
      reg.set("playerMana", maxMana);
      reg.set("playerHp", Math.min(reg.get("playerHp") + Math.floor(maxHp * 0.3), maxHp));
    } else {
      reg.set("playerHp", Math.min(reg.get("playerHp") + Math.floor(maxHp * 0.5), maxHp));
      reg.set("playerMana", Math.min(reg.get("playerMana") + Math.floor(maxMana * 0.6), maxMana));
    }

    // Go to next battle
    const newLevel = reg.get("level") + 1;
    reg.set("level", newLevel);
    reg.set("playerMaxHp", maxHp + 40);
    reg.set("playerHp", Math.min(reg.get("playerHp") + Math.floor(maxHp * 0.15), reg.get("playerMaxHp")));
    reg.set("playerMaxMana", maxMana + 40);
    reg.set("playerMana", Math.min(reg.get("playerMana") + Math.floor(maxMana * 0.15), reg.get("playerMaxMana")));
    reg.set("enemy", getEnemy(newLevel));
    this.cameras.main.fadeOut(200, 0, 0, 0, (cam, pct) => {
      if (pct >= 1) this.scene.start("Battle");
    });
  }
}

// ============================
// GAME OVER SCENE
// ============================
class GameOverScene extends Phaser.Scene {
  constructor() { super("GameOver"); }
  create() {
    this.cameras.main.setBackgroundColor("#0a0514");
    const reg = this.registry;

    const icon = this.textures.exists("ui_skull")
      ? this.add.image(W/2, 100, "ui_skull").setDisplaySize(64, 64)
      : txt(this, W/2, 100, "💀", { fontSize: 56 });
    this.tweens.add({ targets: icon, y: 90, yoyo: true, repeat: -1, duration: 2000, ease: "Sine.easeInOut" });

    txt(this, W/2, 160, "DEFEATED", { fontSize: 28, color: "#F44336" });
    txt(this, W/2, 190, "The magic wasn't strong enough...", { fontSize: 12, color: "#8b7aab", fontFamily: "Quicksand, sans-serif" });

    const stats = [
      { label: "Victories", val: reg.get("wins") },
      { label: "Reached", val: `Lv.${reg.get("level")}` },
    ];
    stats.forEach((s, i) => {
      const x = W/2 - 50 + i * 100;
      txt(this, x, 240, `${s.val}`, { fontSize: 22, color: "#FFD700" });
      txt(this, x, 265, s.label, { fontSize: 10, color: "#8b7aab", fontFamily: "Quicksand, sans-serif" });
    });

    // Submit score
    const name = reg.get("username") || "Anonymous";
    const tgId = isTelegram ? tg.initDataUnsafe?.user?.id : null;
    const id = tgId ? `tg_${tgId}` : "player_" + name.toLowerCase().replace(/\s/g, "_");
    const wins = reg.get("wins");

    if (wins > 0) {
      fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: id, name, wins, level: reg.get("level"), element: reg.get("playerType") }),
      }).catch(() => {});
    }

    // Leaderboard
    fetch("/api/leaderboard").then(r => r.json()).then(data => {
      if (!data.leaderboard?.length) return;
      txt(this, W/2, 310, "🏆 Leaderboard", { fontSize: 15, color: "#FFD700" });
      const colors = ["#FFD700", "#C0C0C0", "#CD7F32"];
      data.leaderboard.slice(0, 7).forEach((p, i) => {
        const y = 340 + i * 24;
        const col = colors[i] || "#8b7aab";
        const isYou = p.name === name;
        if (isYou) this.add.rectangle(W/2, y, W - 60, 22, 0x7B2FBE, 0.1);
        txt(this, 50, y, `#${i+1}`, { fontSize: 11, color: col, fontFamily: "Quicksand, sans-serif" });
        txt(this, W/2, y, p.name || p.wallet, { fontSize: 11, color: isYou ? "#e0d0ff" : col, fontFamily: "Quicksand, sans-serif" });
        txt(this, W - 60, y, `${p.best_wins ?? p.wins}W`, { fontSize: 11, color: col, fontFamily: "Cinzel, serif" });
      });
    }).catch(() => {});

    btn(this, W/2, 560, 180, 42, "TRY AGAIN", 0xFFD700, () => this.scene.start("Select"));

    if (isTelegram) {
      btn(this, W/2, 610, 160, 36, "📤 Share Score", 0x29B6F6, () => {
        tg.switchInlineQuery(`I scored ${wins} wins in Wizard Wars! 🧙‍♂️`, ["users", "groups"]);
      });
    }

    btn(this, W/2, isTelegram ? 655 : 615, 140, 36, "MENU", 0x8b7aab, () => this.scene.start("Title"));

    this.cameras.main.fadeIn(300);
  }
}

// ============ PHASER CONFIG ============

const gameConfig = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: "#0a0514",
  pixelArt: true,
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, SelectScene, BattleScene, VictoryScene, TavernScene, GameOverScene],
};

// ============ REACT WRAPPER ============

export default function WizardWars() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      gameRef.current = new Phaser.Game({
        ...gameConfig,
        parent: containerRef.current,
      });
    }
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      background: "#07040D",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div
        ref={containerRef}
        style={{
          width: "100%", maxWidth: 420,
          borderRadius: window.innerWidth > 480 ? 28 : 0,
          overflow: "hidden",
          boxShadow: window.innerWidth > 480 ? "0 0 60px rgba(123,47,190,0.1), 0 20px 60px rgba(0,0,0,0.5)" : "none",
          border: window.innerWidth > 480 ? "2px solid rgba(123,47,190,0.2)" : "none",
        }}
      />
    </div>
  );
}