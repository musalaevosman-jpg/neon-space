const canvas = document.getElementById('spaceCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const weaponEl = document.getElementById('weaponLvl');
const hpEl = document.getElementById('hp');
const overlay = document.getElementById('overlay');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const startBtn = document.getElementById('startBtn');

// Генератор космических звуков (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'laser') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'enemyLaser') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.12);
  } else if (type === 'boom') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'powerup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(1000, now + 0.25);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

// Управление клавиатурой и мышкой
const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
  Space: false
};

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') keys.Space = true;
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') keys.Space = false;
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

canvas.addEventListener('mousedown', () => { keys.Space = true; });
canvas.addEventListener('mouseup', () => { keys.Space = false; });

canvas.addEventListener('mousemove', (e) => {
  if (!gameRunning) return;
  const rect = canvas.getBoundingClientRect();
  player.x = e.clientX - rect.left - player.w / 2;
  player.y = e.clientY - rect.top - player.h / 2;
});

let gameRunning = false;
let score = 0;
let spawnTimer;

const player = {
  x: 220,
  y: 540,
  w: 42,
  h: 44,
  speed: 5,
  hp: 100,
  weaponLevel: 1,
  lastShot: 0
};

let stars = [];
let lasers = [];
let enemyLasers = [];
let enemies = [];
let powerups = [];
let particles = [];

// Создаём бегущие звёзды на фоне
for (let i = 0; i < 65; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2.2 + 0.5,
    speed: Math.random() * 2.5 + 0.5,
    color: Math.random() > 0.5 ? '#00f3ff' : '#ffffff'
  });
}

function resetGame() {
  player.x = canvas.width / 2 - player.w / 2;
  player.y = 540;
  player.hp = 100;
  player.weaponLevel = 1;
  score = 0;
  lasers = [];
  enemyLasers = [];
  enemies = [];
  powerups = [];
  particles = [];
  scoreEl.innerText = score;
  weaponEl.innerText = 'LVL 1';
  hpEl.innerText = '100%';
}

function spawnEnemy() {
  if (!gameRunning) return;
  const isHeavy = Math.random() > 0.72; // 28% тяжёлые крейсеры
  const w = isHeavy ? 52 : 36;
  const h = isHeavy ? 46 : 34;

  enemies.push({
    x: 20 + Math.random() * (canvas.width - w - 40),
    y: -60,
    w: w,
    h: h,
    speed: isHeavy ? 1.5 : 2.3 + Math.random() * 1.2,
    hp: isHeavy ? 4 : 2,
    isHeavy: isHeavy,
    color: isHeavy ? '#ff007f' : '#b537f2',
    lastShot: Date.now() + 400 + Math.random() * 900
  });
}

// Рисуем неоновый звездолёт игрока
function drawPlayer(x, y, w, h) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00f3ff';

  // Пламя двигателя
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.moveTo(-6, h / 2 - 4);
  ctx.lineTo(6, h / 2 - 4);
  ctx.lineTo(0, h / 2 + 8 + Math.random() * 8);
  ctx.closePath();
  ctx.fill();

  // Крылья и корпус
  ctx.strokeStyle = '#00f3ff';
  ctx.fillStyle = '#081b26';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2); // Нос
  ctx.lineTo(w / 2, h / 2 - 4); // Правое крыло
  ctx.lineTo(w / 6, h / 2 - 10);
  ctx.lineTo(0, h / 2 - 4);
  ctx.lineTo(-w / 6, h / 2 - 10);
  ctx.lineTo(-w / 2, h / 2 - 4); // Левое крыло
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Кабина пилота
  ctx.fillStyle = '#00f3ff';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// Рисуем вражеский звездолёт
function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
  ctx.shadowBlur = 14;
  ctx.shadowColor = e.color;

  ctx.strokeStyle = e.color;
  ctx.fillStyle = '#1a0622';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(0, e.h / 2); // Нос смотрит вниз
  ctx.lineTo(e.w / 2, -e.h / 2 + 6);
  ctx.lineTo(0, -e.h / 4);
  ctx.lineTo(-e.w / 2, -e.h / 2 + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ядро врага
  ctx.fillStyle = '#ffae00';
  ctx.beginPath();
  ctx.arc(0, 0, e.isHeavy ? 6 : 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function createExplosion(x, y, color, count = 15) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      r: Math.random() * 3.5 + 1.5,
      color: color,
      alpha: 1
    });
  }
}

function shootPlayerLaser() {
  const cx = player.x + player.w / 2;
  const cy = player.y;

  if (player.weaponLevel === 1) {
    lasers.push({ x: cx, y: cy, vx: 0, vy: -10 });
  } else if (player.weaponLevel === 2) {
    lasers.push({ x: cx - 12, y: cy + 6, vx: 0, vy: -10 });
    lasers.push({ x: cx + 12, y: cy + 6, vx: 0, vy: -10 });
  } else {
    lasers.push({ x: cx, y: cy - 4, vx: 0, vy: -11 });
    lasers.push({ x: cx - 14, y: cy + 6, vx: -1.5, vy: -10 });
    lasers.push({ x: cx + 14, y: cy + 6, vx: 1.5, vy: -10 });
  }
  playSound('laser');
}

function update() {
  // Движение звёзд всегда активно
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > canvas.height) {
      s.y = 0;
      s.x = Math.random() * canvas.width;
    }
  });

  if (!gameRunning) return;

  // Движение с клавиатуры
  if (keys.w || keys.ArrowUp) player.y -= player.speed;
  if (keys.s || keys.ArrowDown) player.y += player.speed;
  if (keys.a || keys.ArrowLeft) player.x -= player.speed;
  if (keys.d || keys.ArrowRight) player.x += player.speed;

  // Границы экрана
  player.x = Math.max(10, Math.min(canvas.width - player.w - 10, player.x));
  player.y = Math.max(40, Math.min(canvas.height - player.h - 10, player.y));

  // Стрельба игрока
  const now = Date.now();
  if (keys.Space && now - player.lastShot > 170) {
    shootPlayerLaser();
    player.lastShot = now;
  }

  // Полет лазеров игрока
  for (let i = lasers.length - 1; i >= 0; i--) {
    lasers[i].x += lasers[i].vx;
    lasers[i].y += lasers[i].vy;
    if (lasers[i].y < -20) lasers.splice(i, 1);
  }

  // Полет лазеров врагов
  for (let i = enemyLasers.length - 1; i >= 0; i--) {
    const el = enemyLasers[i];
    el.y += el.vy;

    // Проверка попадания в наш звездолёт
    if (
      el.x > player.x && el.x < player.x + player.w &&
      el.y > player.y && el.y < player.y + player.h
    ) {
      player.hp -= 15;
      hpEl.innerText = `${Math.max(0, player.hp)}%`;
      createExplosion(el.x, el.y, '#00f3ff', 8);
      playSound('boom');
      enemyLasers.splice(i, 1);

      if (player.hp <= 0) {
        endGame();
        return;
      }
      continue;
    }

    if (el.y > canvas.height + 20) enemyLasers.splice(i, 1);
  }

  // Бонусы прокачки оружия
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];
    p.y += 2.2;

    if (
      p.x > player.x - 10 && p.x < player.x + player.w + 10 &&
      p.y > player.y - 10 && p.y < player.y + player.h + 10
    ) {
      playSound('powerup');
      if (player.weaponLevel < 3) {
        player.weaponLevel++;
        weaponEl.innerText = `LVL ${player.weaponLevel}`;
      } else {
        player.hp = Math.min(100, player.hp + 20);
        hpEl.innerText = `${player.hp}%`;
      }
      score += 50;
      scoreEl.innerText = score;
      powerups.splice(i, 1);
      continue;
    }

    if (p.y > canvas.height + 20) powerups.splice(i, 1);
  }

  // Вражеские корабли
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.y += e.speed;

    // Враг стреляет лазером
    if (now > e.lastShot) {
      enemyLasers.push({ x: e.x + e.w / 2, y: e.y + e.h, vy: 5.5 });
      playSound('enemyLaser');
      e.lastShot = now + 1300 + Math.random() * 900;
    }

    // Таран с игроком
    if (
      player.x < e.x + e.w && player.x + player.w > e.x &&
      player.y < e.y + e.h && player.y + player.h > e.y
    ) {
      player.hp -= 25;
      hpEl.innerText = `${Math.max(0, player.hp)}%`;
      createExplosion(e.x + e.w / 2, e.y + e.h / 2, '#ff007f', 20);
      playSound('boom');
      enemies.splice(i, 1);

      if (player.hp <= 0) {
        endGame();
        return;
      }
      continue;
    }

    // Попадание нашего лазера во врага
    for (let j = lasers.length - 1; j >= 0; j--) {
      const l = lasers[j];
      if (l.x > e.x && l.x < e.x + e.w && l.y > e.y && l.y < e.y + e.h) {
        lasers.splice(j, 1);
        e.hp--;
        createExplosion(l.x, l.y, '#00ff88', 5);

        if (e.hp <= 0) {
          createExplosion(e.x + e.w / 2, e.y + e.h / 2, e.color, 22);
          playSound('boom');
          score += e.isHeavy ? 200 : 100;
          scoreEl.innerText = score;

          // Шанс 22% выпадения кристалла прокачки
          if (Math.random() < 0.22) {
            powerups.push({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
          }

          enemies.splice(i, 1);
        }
        break;
      }
    }

    if (e && e.y > canvas.height + 60) enemies.splice(i, 1);
  }

  // Частицы взрывов
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.alpha -= 0.03;
    if (pt.alpha <= 0) particles.splice(i, 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Звёзды
  stars.forEach(s => {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  // Кристаллы прокачки
  powerups.forEach(p => {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00ff88';
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Лазеры игрока
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#00ff88';
  ctx.fillStyle = '#00ff88';
  lasers.forEach(l => {
    ctx.fillRect(l.x - 2, l.y, 4, 16);
  });
  ctx.restore();

  // Лазеры врагов
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ff0055';
  ctx.fillStyle = '#ff0055';
  enemyLasers.forEach(el => {
    ctx.fillRect(el.x - 2.5, el.y, 5, 14);
  });
  ctx.restore();

  // Враги
  enemies.forEach(e => drawEnemy(e));

  // Звездолёт игрока
  if (player.hp > 0 && gameRunning) {
    drawPlayer(player.x, player.y, player.w, player.h);
  }

  // Взрывы
  particles.forEach(pt => {
    ctx.save();
    ctx.globalAlpha = pt.alpha;
    ctx.shadowBlur = 10;
    ctx.shadowColor = pt.color;
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function endGame() {
  gameRunning = false;
  clearInterval(spawnTimer);
  titleEl.innerText = 'КОРАБЛЬ ПОДБИТ';
  subtitleEl.innerText = `ТВОЙ СЧЁТ: ${score}`;
  startBtn.innerText = 'ИГРАТЬ СНОВА';
  overlay.style.display = 'flex';
}

startBtn.addEventListener('click', () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  resetGame();
  overlay.style.display = 'none';
  gameRunning = true;
  clearInterval(spawnTimer);
  spawnTimer = setInterval(spawnEnemy, 950);
});

requestAnimationFrame(loop);