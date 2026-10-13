/**
 * NEON DASH: JUMP RUNNER
 * Modern HTML5 Canvas 2D Mobile-First Game Engine
 * Includes: Physics, Procedural Synth Audio, Particle FX, Combo System, 
 * and Google AdMob Rewarded Video Ad Integration.
 */

// --- GOOGLE ADMOB PRODUCTION CONFIGURATION ---
const ADMOB_CONFIG = {
  appId: 'ca-app-pub-6825618674768588~4209422830',
  rewardedAdUnitId: 'ca-app-pub-6825618674768588/2789539117'
};

// --- SOUND SYNTHESIZER (Web Audio API - 100% Offline, No MP3 files needed) ---
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, endFreq = null, volume = 0.2) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  playJump() {
    this.playTone(260, 'sine', 0.18, 580, 0.25);
  }

  playDoubleJump() {
    this.playTone(480, 'triangle', 0.22, 920, 0.3);
  }

  playGem() {
    this.playTone(1046, 'sine', 0.08, 1318, 0.3);
    setTimeout(() => {
      this.playTone(1568, 'sine', 0.14, 2093, 0.25);
    }, 40);
  }

  playCombo() {
    this.playTone(1174, 'triangle', 0.1, 1568, 0.35);
    setTimeout(() => {
      this.playTone(1760, 'sine', 0.18, 2637, 0.35);
    }, 50);
  }

  playCrash() {
    this.playTone(180, 'sawtooth', 0.35, 40, 0.4);
  }

  playRevive() {
    this.playTone(400, 'sine', 0.4, 1200, 0.4);
  }
}

// --- MULTI-EFFECT PARTICLE SYSTEM ---
class Particle {
  constructor(x, y, colorOrOptions, speed = 3, size = 3, life = 0.8) {
    this.x = x;
    this.y = y;

    let opts = {};
    if (typeof colorOrOptions === 'object' && colorOrOptions !== null) {
      opts = colorOrOptions;
    } else {
      opts = {
        color: colorOrOptions,
        speed: speed,
        size: size,
        life: life
      };
    }

    this.type = opts.type || 'circle';
    this.color = opts.color || '#00f3ff';
    this.size = opts.size || 3;
    this.maxLife = opts.life || 0.8;
    this.life = this.maxLife;
    this.alpha = 1;

    const angle = opts.angle !== undefined ? opts.angle : Math.random() * Math.PI * 2;
    const spd = opts.speed !== undefined ? opts.speed : (Math.random() * 4 + 1);
    this.vx = Math.cos(angle) * spd;
    this.vy = Math.sin(angle) * spd;
    this.gravity = opts.gravity || 0;
    this.friction = opts.friction || 0.98;

    this.rot = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 14;

    this.text = opts.text || '';
    this.radius = opts.radius || 4;
    this.maxRadius = opts.maxRadius || 45;
  }

  update(dt) {
    if (this.type === 'ring') {
      this.radius += (this.maxRadius - this.radius) * 9 * dt;
      this.life -= dt;
      this.alpha = Math.max(0, this.life / this.maxLife);
      return;
    }

    if (this.type === 'popupText') {
      this.y += this.vy * 60 * dt;
      this.life -= dt;
      this.alpha = Math.max(0, this.life / this.maxLife);
      return;
    }

    this.vx *= Math.pow(this.friction, dt * 60);
    this.vy += this.gravity * 60 * dt;
    this.x += this.vx * 60 * dt;
    this.y += this.vy * 60 * dt;
    this.rot += this.rotSpeed * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha));

    if (this.type === 'ring') {
      // Expanding Shockwave ring
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, 3.5 * this.alpha);
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(1, this.radius), 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.type === 'popupText') {
      // Floating glowing score text
      ctx.font = '900 16px Outfit, sans-serif';
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;
      ctx.textAlign = 'center';
      ctx.fillText(this.text, this.x, this.y);
    } else if (this.type === 'shard') {
      // Crystal Shard (rotating sharp glass/gem facet)
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 14;

      const s = this.size;
      // Main Shard Body
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.6);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, s * 1.6);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();
      ctx.fill();

      // Specular Highlight Edge (Pure bright reflection)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.6);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'sparkle') {
      // 4-Point Glitter Star (✦)
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 16;

      const s = this.size;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.8);
      ctx.quadraticCurveTo(0, 0, s * 1.8, 0);
      ctx.quadraticCurveTo(0, 0, 0, s * 1.8);
      ctx.quadraticCurveTo(0, 0, -s * 1.8, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s * 1.8);
      ctx.fill();
    } else {
      // Normal glowing particle
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// --- MAIN GAME CLASS ---
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundManager();

    // DOM Elements
    this.startScreen = document.getElementById('start-screen');
    this.hud = document.getElementById('hud');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.adModal = document.getElementById('ad-modal');
    this.btnStart = document.getElementById('btn-start');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnRevive = document.getElementById('btn-revive');
    this.btnClaimReward = document.getElementById('btn-claim-reward');
    this.btnSound = document.getElementById('btn-sound');
    this.soundOnIcon = document.getElementById('sound-on-icon');
    this.soundOffIcon = document.getElementById('sound-off-icon');

    // Stats Elements
    this.hudScore = document.getElementById('hud-score-val');
    this.hudGems = document.getElementById('hud-gems-val');
    this.comboBadge = document.getElementById('combo-badge');
    this.goScore = document.getElementById('go-score');
    this.goGems = document.getElementById('go-gems');
    this.goHigh = document.getElementById('go-high');
    this.startHighScore = document.getElementById('start-high-score');
    this.startGems = document.getElementById('start-gems');
    this.reviveProgress = document.getElementById('revive-progress');
    this.reviveSection = document.getElementById('revive-section');

    // Storage
    this.highScore = parseInt(localStorage.getItem('cyber_high_score') || '0', 10);
    this.totalGems = parseInt(localStorage.getItem('cyber_total_gems') || '0', 10);
    this.updateStatsPreview();

    // Internal resolution (Virtual Mobile Portrait)
    this.width = 400;
    this.height = 700;
    this.groundY = 560;

    // Game State
    this.state = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER' | 'AD'
    this.score = 0;
    this.gemsCollectedRun = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hasUsedRevive = false;

    // World & Movement
    this.gameSpeed = 5.5;
    this.baseSpeed = 5.5;
    this.distance = 0;
    this.spawnTimer = 0;
    this.gemSpawnTimer = 0;

    // Player
    this.player = {
      x: 70,
      y: this.groundY - 36,
      width: 36,
      height: 36,
      vy: 0,
      gravity: 0.85,
      jumpForce: -14.5,
      jumpsLeft: 2,
      isGrounded: true,
      shieldTime: 0,
      scaleX: 1,
      scaleY: 1
    };

    // Arrays
    this.obstacles = [];
    this.gems = [];
    this.particles = [];
    this.trailParticles = [];
    this.bgGridOffset = 0;
    this.screenShake = 0;

    // Revive window timer
    this.reviveWindowDuration = 5.0; // 5 seconds to choose revive
    this.reviveWindowRemaining = 0;

    // Setup
    this.resizeCanvas();
    this.bindEvents();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.scale = rect.width / this.width;
    this.scaleY = rect.height / this.height;

    this.ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scaleY, 0, 0);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    const handleAction = (e) => {
      if (this.state === 'PLAYING') {
        e.preventDefault();
        this.playerJump();
      }
    };

    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleAction(e);
      }
    });

    // Touch / Click on canvas
    this.canvas.addEventListener('pointerdown', (e) => {
      handleAction(e);
    });

    // UI Buttons
    this.btnStart.addEventListener('click', () => {
      this.sound.init();
      this.startGame();
    });

    this.btnRestart.addEventListener('click', () => {
      this.sound.init();
      this.startGame();
    });

    this.btnRevive.addEventListener('click', () => {
      this.triggerRewardedAd();
    });

    this.btnClaimReward.addEventListener('click', () => {
      this.claimAdRewardAndResume();
    });

    // Sound Toggle
    this.btnSound.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      if (this.sound.enabled) {
        this.sound.init();
        this.soundOnIcon.classList.remove('hidden');
        this.soundOffIcon.classList.add('hidden');
      } else {
        this.soundOnIcon.classList.add('hidden');
        this.soundOffIcon.classList.remove('hidden');
      }
    });
  }

  updateStatsPreview() {
    this.startHighScore.textContent = this.highScore;
    this.startGems.textContent = this.totalGems;
  }

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.gemsCollectedRun = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hasUsedRevive = false;
    this.gameSpeed = this.baseSpeed;
    this.distance = 0;
    this.obstacles = [];
    this.gems = [];
    this.particles = [];
    this.trailParticles = [];
    this.screenShake = 0;

    // Reset player
    this.player.y = this.groundY - this.player.height;
    this.player.vy = 0;
    this.player.jumpsLeft = 2;
    this.player.isGrounded = true;
    this.player.shieldTime = 0;

    // Switch UI screens
    this.startScreen.classList.remove('active');
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.remove('active');
    this.gameOverScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');
    this.hud.classList.add('active');

    this.hudScore.textContent = '0';
    this.hudGems.textContent = '0';
    this.comboBadge.classList.add('hidden');

    // Seed immediate gems right at start so player tests collection immediately!
    this.gems.push({
      x: 260,
      y: this.groundY - 35,
      size: 15,
      rot: 0,
      color: '#00f3ff'
    });
    this.gems.push({
      x: 360,
      y: this.groundY - 100,
      size: 15,
      rot: 0,
      color: '#00f3ff'
    });
    this.gemSpawnTimer = 1.0;
    this.spawnTimer = 2.4; // Grace period before first spike
  }

  playerJump() {
    if (this.player.jumpsLeft > 0) {
      this.sound.init();
      if (this.player.jumpsLeft === 2) {
        this.sound.playJump();
        this.player.scaleX = 0.7;
        this.player.scaleY = 1.35;
      } else {
        this.sound.playDoubleJump();
        this.player.scaleX = 1.3;
        this.player.scaleY = 0.7;
        // Burst particles on double jump
        for (let i = 0; i < 8; i++) {
          this.particles.push(new Particle(
            this.player.x + this.player.width / 2,
            this.player.y + this.player.height,
            '#00f3ff', 3.5, 2.5, 0.4
          ));
        }
      }
      this.player.vy = this.player.jumpForce;
      this.player.jumpsLeft--;
      this.player.isGrounded = false;
    }
  }

  // --- REWARDED AD LOGIC (GOOGLE ADMOB HOOK) ---
  triggerRewardedAd() {
    this.state = 'AD';
    this.gameOverScreen.classList.remove('active');
    this.gameOverScreen.classList.add('hidden');
    this.adModal.classList.remove('hidden');
    this.adModal.classList.add('active');

    const countdownEl = document.getElementById('ad-countdown');
    this.btnClaimReward.classList.add('hidden');

    let seconds = 5;
    countdownEl.textContent = `Ad in ${seconds}s...`;

    // --- GOOGLE ADMOB INTEGRATION HOOK ---
    // When deploying to Google Play via Capacitor / Cordova:
    // admob.showRewardVideoAd().then(...) replaces this interval simulation!
    const timer = setInterval(() => {
      seconds--;
      if (seconds > 0) {
        countdownEl.textContent = `Ad in ${seconds}s...`;
      } else {
        clearInterval(timer);
        countdownEl.textContent = 'Reward Ready! 🎉';
        this.btnClaimReward.classList.remove('hidden');
      }
    }, 1000);
  }

  claimAdRewardAndResume() {
    this.adModal.classList.remove('active');
    this.adModal.classList.add('hidden');

    this.state = 'PLAYING';
    this.hasUsedRevive = true;
    this.hud.classList.remove('hidden');
    this.hud.classList.add('active');

    // Grant Revive Perks:
    // 1. Reset player position safe above ground
    this.player.y = this.groundY - this.player.height - 40;
    this.player.vy = -4;
    this.player.jumpsLeft = 2;
    // 2. Grant 3.5 seconds of invincibility shield
    this.player.shieldTime = 3.5;
    // 3. Clear obstacles in immediate zone so player doesn't spawn into spike
    this.obstacles = this.obstacles.filter(obs => obs.x > 320);

    this.sound.playRevive();

    // Flash particles on revive
    for (let i = 0; i < 35; i++) {
      this.particles.push(new Particle(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        '#00ff88', 6, 3.5, 0.8
      ));
    }
  }

  onGameOver() {
    this.state = 'GAMEOVER';
    this.sound.playCrash();
    this.screenShake = 18;

    // Particles explosion on player
    for (let i = 0; i < 30; i++) {
      this.particles.push(new Particle(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        '#ff007f', 7, 4, 0.9
      ));
    }

    // Update records
    let isNewHigh = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('cyber_high_score', this.highScore);
      isNewHigh = true;
    }

    this.totalGems += this.gemsCollectedRun;
    localStorage.setItem('cyber_total_gems', this.totalGems);
    this.updateStatsPreview();

    // Populate Game Over screen
    this.goScore.textContent = this.score;
    this.goGems.textContent = `+${this.gemsCollectedRun}`;
    this.goHigh.textContent = `${this.highScore}${isNewHigh ? ' (NEW!)' : ''}`;

    // Handle Revive availability (only allowed 1 revive per run)
    if (!this.hasUsedRevive) {
      this.reviveSection.classList.remove('hidden');
      this.reviveWindowRemaining = this.reviveWindowDuration;
    } else {
      this.reviveSection.classList.add('hidden');
    }

    // Switch UI
    this.hud.classList.remove('active');
    this.hud.classList.add('hidden');
    this.gameOverScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('active');
  }

  // --- GAME LOOP & UPDATES ---
  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake -= dt * 45;
      if (this.screenShake < 0) this.screenShake = 0;
    }

    // Update particles regardless of state
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }

    // Handle Revive button countdown in GameOver state
    if (this.state === 'GAMEOVER' && !this.hasUsedRevive && this.reviveWindowRemaining > 0) {
      this.reviveWindowRemaining -= dt;
      const pct = Math.max(0, (this.reviveWindowRemaining / this.reviveWindowDuration) * 100);
      this.reviveProgress.style.width = `${pct}%`;
      if (this.reviveWindowRemaining <= 0) {
        this.reviveSection.classList.add('hidden');
      }
    }

    if (this.state !== 'PLAYING') return;

    // Increase speed and score gradually
    this.distance += dt;
    this.score = Math.floor(this.distance * 10);
    this.hudScore.textContent = this.score;

    this.gameSpeed = this.baseSpeed + Math.min(6, this.score / 200);

    // Combo timer decay
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboBadge.classList.add('hidden');
      }
    }

    // Player Physics
    this.player.vy += this.player.gravity;
    this.player.y += this.player.vy;

    // Ground Collision
    if (this.player.y >= this.groundY - this.player.height) {
      this.player.y = this.groundY - this.player.height;
      this.player.vy = 0;
      this.player.jumpsLeft = 2;
      if (!this.player.isGrounded) {
        // Landing squash
        this.player.scaleX = 1.25;
        this.player.scaleY = 0.8;
      }
      this.player.isGrounded = true;
    }

    // Elastic bounce restoration
    this.player.scaleX += (1 - this.player.scaleX) * 0.15;
    this.player.scaleY += (1 - this.player.scaleY) * 0.15;

    // Shield decay
    if (this.player.shieldTime > 0) {
      this.player.shieldTime -= dt;
    }

    // Player running trail
    if (Math.random() < 0.6) {
      this.trailParticles.push({
        x: this.player.x + 4,
        y: this.player.y + this.player.height - 4,
        size: Math.random() * 4 + 2,
        alpha: 0.8,
        color: this.player.shieldTime > 0 ? '#00ff88' : '#00f3ff'
      });
    }

    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.x -= this.gameSpeed;
      p.alpha -= dt * 2.2;
      if (p.alpha <= 0) this.trailParticles.splice(i, 1);
    }

    // Spawning Obstacles
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      // Random interval between 1.2s and 2.2s depending on speed
      this.spawnTimer = Math.max(0.9, (Math.random() * 0.9 + 1.2) - (this.score / 1500));
    }

    // Spawning Gems
    this.gemSpawnTimer -= dt;
    if (this.gemSpawnTimer <= 0) {
      this.spawnGem();
      this.gemSpawnTimer = Math.random() * 1.5 + 1.2;
    }

    // Update Obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.gameSpeed;

      // Obstacle specific animations
      if (obs.type === 'drone') {
        obs.hoverAngle = (obs.hoverAngle || 0) + dt * 4;
        obs.y = obs.baseY + Math.sin(obs.hoverAngle) * 14;
      } else if (obs.type === 'saw') {
        obs.rot = (obs.rot || 0) + dt * 14;
        // Ground friction sparks
        if (Math.random() < 0.35) {
          this.particles.push(new Particle(obs.x + obs.width / 2, this.groundY - 1, {
            speed: Math.random() * 3.5 + 1.5,
            angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.4,
            size: Math.random() * 2.5 + 1.2,
            color: '#ffe600',
            gravity: 0.22,
            life: 0.22
          }));
        }
      } else if (obs.type === 'laser') {
        obs.pulse = (obs.pulse || 0) + dt * 12;
      }

      // Collision Check with Player
      if (this.checkCollision(this.player, obs)) {
        if (this.player.shieldTime <= 0) {
          this.onGameOver();
          return;
        } else {
          // Shield destroys obstacle with explosion
          this.sound.playCrash();
          for (let k = 0; k < 15; k++) {
            this.particles.push(new Particle(obs.x + obs.width / 2, obs.y + obs.height / 2, '#ff007f', 5, 3));
          }
          this.obstacles.splice(i, 1);
          continue;
        }
      }

      // Remove off-screen obstacles
      if (obs.x + obs.width < -30) {
        this.obstacles.splice(i, 1);
      }
    }

    // Update Gems
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      gem.x -= this.gameSpeed;
      gem.rot += dt * 3.5;

      // Gem Collection Check
      if (this.checkGemCollision(this.player, gem)) {
        this.collectGem(gem);
        this.gems.splice(i, 1);
        continue;
      }

      if (gem.x + gem.size < -30) {
        this.gems.splice(i, 1);
      }
    }

    // Parallax background grid offset
    this.bgGridOffset = (this.bgGridOffset + this.gameSpeed * 0.6) % 40;
  }

  spawnObstacle() {
    // Progressive pool of obstacles based on score
    const types = ['spike', 'saw'];
    if (this.score > 35) types.push('drone');
    if (this.score > 65) types.push('laser');
    if (this.score > 95) types.push('barrier');

    const chosen = types[Math.floor(Math.random() * types.length)];

    if (chosen === 'spike') {
      const isDouble = Math.random() < 0.45 && this.score > 80;
      const w = isDouble ? 52 : 26;
      this.obstacles.push({
        type: 'spike',
        x: this.width + 25,
        y: this.groundY - 32,
        width: w,
        height: 32,
        color: '#ff007f'
      });
    } else if (chosen === 'saw') {
      // Rolling Cyber Saw
      this.obstacles.push({
        type: 'saw',
        x: this.width + 25,
        y: this.groundY - 36,
        width: 36,
        height: 36,
        rot: 0,
        color: '#ff7700'
      });
    } else if (chosen === 'laser') {
      // Pulsing Laser Gate
      this.obstacles.push({
        type: 'laser',
        x: this.width + 25,
        y: this.groundY - 44,
        width: 32,
        height: 44,
        pulse: 0,
        color: '#00f3ff'
      });
    } else if (chosen === 'barrier') {
      // Tall Cyber Barrier Wall (requires high double jump!)
      this.obstacles.push({
        type: 'barrier',
        x: this.width + 25,
        y: this.groundY - 64,
        width: 24,
        height: 64,
        color: '#b026ff'
      });
    } else if (chosen === 'drone') {
      // Flying Cyber Drone
      const droneY = this.groundY - 95 - Math.random() * 35;
      this.obstacles.push({
        type: 'drone',
        x: this.width + 25,
        y: droneY,
        baseY: droneY,
        hoverAngle: 0,
        width: 36,
        height: 24,
        color: '#ff0055'
      });
    }
  }

  spawnGem() {
    // Spawn at jump arcs
    const heights = [this.groundY - 35, this.groundY - 110, this.groundY - 165];
    const targetY = heights[Math.floor(Math.random() * heights.length)];
    this.gems.push({
      x: this.width + 20,
      y: targetY,
      size: 14,
      rot: 0,
      color: '#00f3ff'
    });
  }

  collectGem(gem) {
    this.gemsCollectedRun++;
    this.hudGems.textContent = this.gemsCollectedRun;

    // Combo system
    this.combo++;
    this.comboTimer = 2.4; // 2.4 seconds to collect next gem for combo
    const isCombo = this.combo >= 2;
    if (isCombo) {
      this.comboBadge.textContent = `${this.combo}X COMBO! 🔥`;
      this.comboBadge.classList.remove('hidden');
      this.sound.playCombo();
    } else {
      this.sound.playGem();
    }

    const gemColor = isCombo ? '#ffe600' : '#00f3ff';

    // 1. Double Expanding Neon Shockwave Rings
    this.particles.push(new Particle(gem.x, gem.y, {
      type: 'ring',
      color: gemColor,
      radius: 6,
      maxRadius: 55,
      life: 0.35
    }));
    this.particles.push(new Particle(gem.x, gem.y, {
      type: 'ring',
      color: '#ffffff',
      radius: 2,
      maxRadius: 36,
      life: 0.22
    }));

    // 2. Crystal Shards bursting in all 360 degrees
    const shardCount = isCombo ? 20 : 14;
    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 / shardCount) * i + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 5 + 3.8;
      const size = Math.random() * 4 + 3.2;
      const color = Math.random() < 0.65 ? gemColor : (Math.random() < 0.5 ? '#ffffff' : '#00ff88');
      this.particles.push(new Particle(gem.x, gem.y, {
        type: 'shard',
        angle: angle,
        speed: speed,
        size: size,
        color: color,
        gravity: 0.28,
        friction: 0.95,
        life: Math.random() * 0.4 + 0.65
      }));
    }

    // 3. Glitter Sparkle Stars (✦)
    for (let i = 0; i < 10; i++) {
      this.particles.push(new Particle(gem.x, gem.y, {
        type: 'sparkle',
        speed: Math.random() * 5.5 + 2,
        size: Math.random() * 3.5 + 2.5,
        color: Math.random() < 0.6 ? '#ffffff' : '#ffe600',
        gravity: 0.1,
        friction: 0.94,
        life: Math.random() * 0.35 + 0.5
      }));
    }

    // 4. Floating Score Popup Text (+1 GEM or Combo)
    this.particles.push(new Particle(gem.x, gem.y - 10, {
      type: 'popupText',
      text: isCombo ? `+${this.combo}X COMBO!` : '+1 GEM',
      color: isCombo ? '#ffe600' : '#00f3ff',
      speed: 2.2,
      angle: -Math.PI / 2, // flies upward
      life: 0.75
    }));

    // 5. Tactile micro-shake for satisfying hit feedback
    this.screenShake = Math.max(this.screenShake, 4.5);
  }

  checkCollision(p, obj) {
    const pMargin = 4; // Friendly hitbox
    return (
      p.x + pMargin < obj.x + obj.width &&
      p.x + p.width - pMargin > obj.x &&
      p.y + pMargin < obj.y + obj.height &&
      p.y + p.height - pMargin > obj.y
    );
  }

  checkGemCollision(p, gem) {
    const playerCenterX = p.x + p.width / 2;
    const playerCenterY = p.y + p.height / 2;
    const dist = Math.hypot(gem.x - playerCenterX, gem.y - playerCenterY);
    // Generous magnetic pickup radius (40px)
    return dist < 42;
  }

  // --- DRAWING PIPELINE ---
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.ctx.save();
    // Screen shake application
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    // 1. Cyberpunk Sky & Neon Grid
    this.drawBackground();

    // 2. Ground Floor (drawn under objects)
    this.drawGround();

    // 3. Trail Particles
    for (const p of this.trailParticles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
      this.ctx.restore();
    }

    // 4. Obstacles
    for (const obs of this.obstacles) {
      this.drawObstacle(obs);
    }

    // 5. Gems
    for (const gem of this.gems) {
      this.drawGem(gem);
    }

    // 6. Player
    if (this.state === 'PLAYING' || this.state === 'START') {
      this.drawPlayer();
    }

    // 7. Explosion Particles & Crystal Shards (Drawn on TOP of everything!)
    for (const p of this.particles) {
      p.draw(this.ctx);
    }

    this.ctx.restore();
  }

  drawBackground() {
    // Dark Space gradient
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.groundY);
    grad.addColorStop(0, '#090817');
    grad.addColorStop(0.7, '#14122d');
    grad.addColorStop(1, '#221545');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.groundY);

    // Cyber Synthwave Sun / Core
    this.ctx.save();
    const sunGrad = this.ctx.createRadialGradient(200, 180, 20, 200, 180, 120);
    sunGrad.addColorStop(0, 'rgba(255, 0, 127, 0.4)');
    sunGrad.addColorStop(0.5, 'rgba(0, 243, 255, 0.15)');
    sunGrad.addColorStop(1, 'transparent');
    this.ctx.fillStyle = sunGrad;
    this.ctx.beginPath();
    this.ctx.arc(200, 180, 120, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // Distant Neon Skyline
    this.ctx.fillStyle = 'rgba(15, 18, 40, 0.75)';
    this.ctx.fillRect(30, 360, 50, 200);
    this.ctx.fillRect(110, 320, 70, 240);
    this.ctx.fillRect(210, 380, 60, 180);
    this.ctx.fillRect(300, 340, 80, 220);

    // Neon Vertical Horizon Grid
    this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    this.ctx.lineWidth = 1;
    for (let x = -this.bgGridOffset; x < this.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 260);
      this.ctx.lineTo(x, this.groundY);
      this.ctx.stroke();
    }
  }

  drawGround() {
    // Floor gradient & glowing neon border line
    const floorGrad = this.ctx.createLinearGradient(0, this.groundY, 0, this.height);
    floorGrad.addColorStop(0, '#0c0e1a');
    floorGrad.addColorStop(1, '#05060b');
    this.ctx.fillStyle = floorGrad;
    this.ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

    // Glowing Neon Top Line
    this.ctx.save();
    this.ctx.strokeStyle = '#00f3ff';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.groundY);
    this.ctx.lineTo(this.width, this.groundY);
    this.ctx.stroke();
    this.ctx.restore();

    // Floor Grid Perspective
    this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
    this.ctx.lineWidth = 1;
    for (let x = -this.bgGridOffset; x < this.width + 40; x += 35) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.groundY);
      this.ctx.lineTo(x - 25, this.height);
      this.ctx.stroke();
    }
  }

  drawPlayer() {
    const p = this.player;
    this.ctx.save();
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    this.ctx.scale(p.scaleX, p.scaleY);

    // Invincibility Shield Aura
    if (p.shieldTime > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = '#00ff88';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#00ff88';
      this.ctx.shadowBlur = 18;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, p.width * 0.85, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Player Body (Cyber Neon Cube)
    const cubeColor = p.shieldTime > 0 ? '#00ff88' : '#00f3ff';
    this.ctx.fillStyle = '#10162a';
    this.ctx.strokeStyle = cubeColor;
    this.ctx.lineWidth = 2.5;
    this.ctx.shadowColor = cubeColor;
    this.ctx.shadowBlur = 14;

    const hw = p.width / 2;
    const hh = p.height / 2;

    this.ctx.beginPath();
    this.ctx.roundRect(-hw, -hh, p.width, p.height, 8);
    this.ctx.fill();
    this.ctx.stroke();

    // Visor Eye Glow
    this.ctx.fillStyle = '#ff007f';
    this.ctx.shadowColor = '#ff007f';
    this.ctx.shadowBlur = 10;
    this.ctx.fillRect(hw - 14, -4, 10, 8);

    // Core Power Dot
    this.ctx.fillStyle = cubeColor;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawObstacle(obs) {
    this.ctx.save();

    if (obs.type === 'spike') {
      // Futuristic Neon Triangle Spike(s)
      this.ctx.shadowColor = obs.color;
      this.ctx.shadowBlur = 16;
      this.ctx.fillStyle = obs.color;

      const count = obs.width > 30 ? 2 : 1;
      const singleW = obs.width / count;
      for (let i = 0; i < count; i++) {
        const sx = obs.x + i * singleW;
        this.ctx.beginPath();
        this.ctx.moveTo(sx, obs.y + obs.height);
        this.ctx.lineTo(sx + singleW / 2, obs.y);
        this.ctx.lineTo(sx + singleW, obs.y + obs.height);
        this.ctx.closePath();
        this.ctx.fill();

        // Inner white energy spine
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(sx + singleW / 2, obs.y + 4);
        this.ctx.lineTo(sx + singleW / 2, obs.y + obs.height);
        this.ctx.stroke();
      }
    } else if (obs.type === 'saw') {
      // Rotating Cyber Saw Blade
      this.ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
      this.ctx.rotate(obs.rot);
      this.ctx.shadowColor = '#ff7700';
      this.ctx.shadowBlur = 18;
      this.ctx.fillStyle = '#ff7700';

      const r = obs.width / 2;
      const teeth = 8;
      this.ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a1 = (Math.PI * 2 / teeth) * i;
        const a2 = a1 + (Math.PI / teeth);
        this.ctx.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
        this.ctx.lineTo(Math.cos(a2) * (r * 0.65), Math.sin(a2) * (r * 0.65));
      }
      this.ctx.closePath();
      this.ctx.fill();

      // Inner hub & bolt
      this.ctx.fillStyle = '#141424';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#ffe600';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (obs.type === 'laser') {
      // Pulsing Laser Gate (Two metallic posts + electric beam)
      this.ctx.fillStyle = '#1a2236';
      this.ctx.strokeStyle = '#00f3ff';
      this.ctx.lineWidth = 1.5;
      this.ctx.fillRect(obs.x, obs.y, 6, obs.height);
      this.ctx.strokeRect(obs.x, obs.y, 6, obs.height);
      this.ctx.fillRect(obs.x + obs.width - 6, obs.y, 6, obs.height);
      this.ctx.strokeRect(obs.x + obs.width - 6, obs.y, 6, obs.height);

      // Top Emitter bulbs
      this.ctx.fillStyle = '#00f3ff';
      this.ctx.shadowColor = '#00f3ff';
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.arc(obs.x + 3, obs.y + 4, 3.5, 0, Math.PI * 2);
      this.ctx.arc(obs.x + obs.width - 3, obs.y + 4, 3.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Crackling Electric Beam between posts
      this.ctx.strokeStyle = '#00f3ff';
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = '#00f3ff';
      this.ctx.shadowBlur = 16;
      this.ctx.beginPath();
      this.ctx.moveTo(obs.x + 6, obs.y + obs.height * 0.45);
      const midJitter = Math.sin(obs.pulse || 0) * 4;
      this.ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height * 0.45 + midJitter);
      this.ctx.lineTo(obs.x + obs.width - 6, obs.y + obs.height * 0.45);
      this.ctx.stroke();

      // White hot core laser line
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.8;
      this.ctx.stroke();
    } else if (obs.type === 'barrier') {
      // Tall Cyber Barrier Wall
      this.ctx.fillStyle = 'rgba(26, 12, 45, 0.9)';
      this.ctx.strokeStyle = '#b026ff';
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = '#b026ff';
      this.ctx.shadowBlur = 18;

      this.ctx.beginPath();
      this.ctx.roundRect(obs.x, obs.y, obs.width, obs.height, [6, 6, 0, 0]);
      this.ctx.fill();
      this.ctx.stroke();

      // Inner diagonal hazard glow stripes
      this.ctx.strokeStyle = 'rgba(255, 230, 0, 0.7)';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#ffe600';
      this.ctx.shadowBlur = 8;
      for (let y = obs.y + 12; y < obs.y + obs.height - 8; y += 14) {
        this.ctx.beginPath();
        this.ctx.moveTo(obs.x + 4, y);
        this.ctx.lineTo(obs.x + obs.width - 4, y - 6);
        this.ctx.stroke();
      }

      // Top Warning Beacon
      this.ctx.fillStyle = '#ffe600';
      this.ctx.beginPath();
      this.ctx.arc(obs.x + obs.width / 2, obs.y + 4, 3, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (obs.type === 'drone') {
      // Cyber Flying Drone
      this.ctx.fillStyle = '#1c162b';
      this.ctx.strokeStyle = '#ff0055';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#ff0055';
      this.ctx.shadowBlur = 16;

      // Drone Chassis
      this.ctx.beginPath();
      this.ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
      this.ctx.fill();
      this.ctx.stroke();

      // Optic Red Eye
      this.ctx.fillStyle = '#ff0055';
      this.ctx.shadowColor = '#ff0055';
      this.ctx.shadowBlur = 12;
      this.ctx.fillRect(obs.x + obs.width / 2 - 5, obs.y + 8, 10, 8);

      // Warning Laser Line down to ground
      this.ctx.strokeStyle = 'rgba(255, 0, 85, 0.45)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(obs.x + obs.width / 2, obs.y + obs.height);
      this.ctx.lineTo(obs.x + obs.width / 2, this.groundY);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    this.ctx.restore();
  }

  drawGem(gem) {
    this.ctx.save();
    this.ctx.translate(gem.x, gem.y);

    // Smooth floating bob animation
    const bob = Math.sin(Date.now() / 180 + gem.x * 0.1) * 3;
    this.ctx.translate(0, bob);
    this.ctx.rotate(gem.rot);

    const s = gem.size;

    // 1. Intense Outer Aura Glow
    this.ctx.shadowColor = gem.color;
    this.ctx.shadowBlur = 25;

    // 2. Crystal Outer Border & Base
    this.ctx.fillStyle = '#0a1226';
    this.ctx.strokeStyle = gem.color;
    this.ctx.lineWidth = 2.2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -s * 1.3);
    this.ctx.lineTo(s * 0.85, 0);
    this.ctx.lineTo(0, s * 1.3);
    this.ctx.lineTo(-s * 0.85, 0);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // 3. Facets (Light & Shadow for 3D Diamond Look)
    this.ctx.fillStyle = gem.color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -s * 1.3);
    this.ctx.lineTo(s * 0.85, 0);
    this.ctx.lineTo(0, 0);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -s * 1.3);
    this.ctx.lineTo(-s * 0.85, 0);
    this.ctx.lineTo(0, 0);
    this.ctx.closePath();
    this.ctx.fill();

    // 4. Center Sparkling Star/Dot Core
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }
}

// Start on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
  window.cyberGame = new Game();
});
