(function () {
  'use strict';
  const Snake = window.Snake;
  const cfg = Snake.config;

  let canvas = null;
  let ctx = null;
  let cssSize = 0;
  let dpr = 1;
  let stars = null;
  let effects = [];
  let headPulseT = 0;
  const HEAD_PULSE_MAX = 18;
  let mouthT = 0;
  const MOUTH_MAX = 30; // 张嘴动画约 0.5 秒（60fps 下）

  // 食物主题色（每吃一个循环切换）
  const FOOD_COLORS = [
    { mid: '#ffd640', edge: '#ff7a1a', rgb: '255, 214, 64' },   // 金黄
    { mid: '#00e5ff', edge: '#0088cc', rgb: '0, 229, 255' },    // 青
    { mid: '#ff3fa4', edge: '#c01870', rgb: '255, 63, 164' },   // 洋红
    { mid: '#b6ff2e', edge: '#5fb400', rgb: '182, 255, 46' },   // 荧光绿
    { mid: '#a06bff', edge: '#6a2ee0', rgb: '160, 107, 255' },  // 紫
    { mid: '#ff7a4d', edge: '#e0421a', rgb: '255, 122, 77' }    // 橙红
  ];

  function init(el) {
    canvas = el;
    ctx = canvas.getContext('2d');
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cssSize = Math.max(1, rect.width);
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundRect(x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < 42; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.5 + Math.random() * 1.6,
        v: 0.008 + Math.random() * 0.03,
        tw: Math.random() * Math.PI * 2
      });
    }
  }

  function drawBackground(now) {
    // 深色渐变底
    const bg = ctx.createLinearGradient(0, 0, cssSize, cssSize);
    bg.addColorStop(0, '#05070f');
    bg.addColorStop(0.5, '#0a0f24');
    bg.addColorStop(1, '#120a28');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cssSize, cssSize);

    // 中心呼吸光晕（霓虹）
    const breathe = 0.5 + 0.5 * Math.sin(now / 1300);
    const glow = ctx.createRadialGradient(
      cssSize * 0.5, cssSize * 0.5, 0,
      cssSize * 0.5, cssSize * 0.5, cssSize * 0.72
    );
    glow.addColorStop(0, 'rgba(0, 229, 255, ' + (0.06 + 0.05 * breathe) + ')');
    glow.addColorStop(0.55, 'rgba(255, 63, 164, ' + (0.04 + 0.04 * breathe) + ')');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, cssSize, cssSize);
  }

  function drawStars(now) {
    if (!stars) {
      initStars();
    }
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      let y = s.y - (now * s.v) / 8000;
      y = ((y % 1) + 1) % 1;
      const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(now / 800 + s.tw));
      ctx.fillStyle = 'rgba(150, 225, 255, ' + a + ')';
      ctx.beginPath();
      ctx.arc(s.x * cssSize, y * cssSize, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGrid() {
    const cell = cssSize / cfg.GRID_SIZE;
    ctx.strokeStyle = 'rgba(110, 220, 255, 0.09)';
    ctx.lineWidth = 1;
    for (let i = 1; i < cfg.GRID_SIZE; i++) {
      const p = Math.round(i * cell) + 0.5;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, cssSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(cssSize, p);
      ctx.stroke();
    }

    // 霓虹发光边框
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 229, 255, 0.7)';
    ctx.shadowBlur = 8;
    ctx.strokeRect(1, 1, cssSize - 2, cssSize - 2);
    ctx.shadowBlur = 0;
  }

  function drawObstacles(state, now) {
    const cell = cssSize / cfg.GRID_SIZE;
    state.obstacles.forEach(function (o) {
      const x = o.x * cell;
      const y = o.y * cell;
      const p = 0.5 + 0.5 * Math.sin(now / 550 + (o.x * 0.7 + o.y * 1.3));
      ctx.shadowColor = 'rgba(255, 63, 164, 0.95)';
      ctx.shadowBlur = 10 + 8 * p;
      // 垂直渐变 + 脉冲光晕（非纯色）
      const g = ctx.createLinearGradient(x, y, x, y + cell);
      g.addColorStop(0, 'rgba(255, 90, 190, 0.9)');
      g.addColorStop(0.5, 'rgba(255, 63, 164, 0.75)');
      g.addColorStop(1, 'rgba(150, 18, 105, 0.9)');
      ctx.fillStyle = g;
      roundRect(x + 2, y + 2, cell - 4, cell - 4, 4);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 霓虹内描边
      ctx.strokeStyle = 'rgba(255, 150, 215, 0.9)';
      ctx.lineWidth = 1.2;
      roundRect(x + 2, y + 2, cell - 4, cell - 4, 4);
      ctx.stroke();
    });
  }

  function drawFood(state, now, prevFood, interpT) {
    if (!state.food) {
      return;
    }
    const cell = cssSize / cfg.GRID_SIZE;
    // 平滑插值食物位置
    const fx = prevFood ? prevFood.x + (state.food.x - prevFood.x) * interpT : state.food.x;
    const fy = prevFood ? prevFood.y + (state.food.y - prevFood.y) * interpT : state.food.y;
    const pulse = 1 + 0.12 * Math.sin(now / 180);
    const cx = (fx + 0.5) * cell;
    const cy = (fy + 0.5) * cell;
    const rad = cell * 0.32 * pulse;
    // 每吃一个食物换一种颜色
    const col = FOOD_COLORS[state.eaten % FOOD_COLORS.length];

    // 外层光晕
    ctx.shadowColor = 'rgba(' + col.rgb + ', 0.95)';
    ctx.shadowBlur = 22;

    // 径向渐变球体（白心 -> 主题色 -> 深色边缘）
    const g = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
    g.addColorStop(0, '#fff8e8');
    g.addColorStop(0.35, col.mid);
    g.addColorStop(1, col.edge);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(cx - rad * 0.35, cy - rad * 0.35, rad * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // 旋转光环
    const ringA = 0.45 + 0.35 * Math.sin(now / 200);
    ctx.strokeStyle = 'rgba(' + col.rgb + ', ' + ringA + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 1.7, now / 600, now / 600 + Math.PI * 1.4);
    ctx.stroke();
  }

  function drawSnake(state, prevSnake, interpT) {
    const cell = cssSize / cfg.GRID_SIZE;
    const len = state.snake.length;
    const s = headScale();
    for (let i = len - 1; i >= 0; i--) {
      const seg = state.snake[i];
      const t = len === 1 ? 0 : i / (len - 1);
      const hue = 185 - t * 100;
      const light = i === 0 ? 62 : 46 + t * 12;
      // 平滑插值：在上一位置与当前位置之间连续过渡
      const prev = prevSnake && prevSnake[i];
      const ix = prev ? prev.x + (seg.x - prev.x) * interpT : seg.x;
      const iy = prev ? prev.y + (seg.y - prev.y) * interpT : seg.y;
      const x = ix * cell;
      const y = iy * cell;

      // 蛇头吞咽动画：放大再弹回
      let size = cell - 3;
      let pad = 1.5;
      if (i === 0) {
        size = (cell - 3) * s;
        pad = 1.5 - (size - (cell - 3)) / 2;
      }

      ctx.shadowColor = 'hsla(' + hue + ', 95%, 55%, 0.85)';
      ctx.shadowBlur = i === 0 ? 20 + (s - 1) * 40 : 11;

      // 垂直渐变，模拟霓虹灯管（上亮下暗）
      const g = ctx.createLinearGradient(x, y, x, y + cell);
      g.addColorStop(0, 'hsl(' + hue + ', 100%, ' + Math.min(74, light + 10) + '%)');
      g.addColorStop(0.5, 'hsl(' + hue + ', 95%, ' + light + '%)');
      g.addColorStop(1, 'hsl(' + hue + ', 90%, ' + Math.max(26, light - 15) + '%)');
      ctx.fillStyle = g;
      roundRect(x + pad, y + pad, size, size, 5);
      ctx.fill();

      // 顶部高光条（模拟灯管反光）
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      roundRect(x + 4, y + 3, cell - 8, Math.max(2, cell * 0.16), 2);
      ctx.fill();
    }

    // 蛇头眼睛（跟随插值后的头部位置）
    const head = state.snake[0];
    if (head) {
      const prevHead = prevSnake && prevSnake[0];
      const hix = prevHead ? prevHead.x + (head.x - prevHead.x) * interpT : head.x;
      const hiy = prevHead ? prevHead.y + (head.y - prevHead.y) * interpT : head.y;
      const hx = (hix + 0.5) * cell;
      const hy = (hiy + 0.5) * cell;
      const dx = state.direction.x;
      const dy = state.direction.y;
      const px = -dy;
      const py = dx;
      const fwd = cell * 0.16 * s;
      const side = cell * 0.17 * s;
      ctx.fillStyle = '#05070f';
      ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
      ctx.shadowBlur = 4;
      [1, -1].forEach(function (k) {
        ctx.beginPath();
        ctx.arc(
          hx + dx * fwd + px * side * k,
          hy + dy * fwd + py * side * k,
          cell * 0.08,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // 张嘴吃食动画（吃到食物时嘴巴张开再闭合，约 0.5 秒）
      const m = mouthOpen();
      if (m > 0) {
        const frontD = cell * 0.42 * s;
        const mouthHalf = cell * 0.24 * m * s;
        const mouthLen = cell * 0.32 * m * s;
        const fx = hx + dx * frontD;
        const fy = hy + dy * frontD;
        const ax = hx + dx * (frontD - mouthLen);
        const ay = hy + dy * (frontD - mouthLen);
        ctx.fillStyle = '#05070f';
        ctx.beginPath();
        ctx.moveTo(fx + px * mouthHalf, fy + py * mouthHalf);
        ctx.lineTo(ax, ay);
        ctx.lineTo(fx - px * mouthHalf, fy - py * mouthHalf);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function spawnEatEffect(gx, gy) {
    const cell = cssSize / cfg.GRID_SIZE;
    const cx = (gx + 0.5) * cell;
    const cy = (gy + 0.5) * cell;
    headPulseT = 0; // 触发蛇头吞咽动画
    mouthT = 0; // 触发张嘴动画

    // 粒子火花爆发（金色）
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = cell * (0.1 + Math.random() * 0.18);
      effects.push({
        type: 'spark',
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0,
        maxLife: 26 + Math.floor(Math.random() * 18),
        size: cell * (0.05 + Math.random() * 0.09),
        hue: 40 + Math.floor(Math.random() * 20)
      });
    }
    // 扩散光环
    effects.push({
      type: 'ring',
      x: cx,
      y: cy,
      life: 0,
      maxLife: 24,
      r0: cell * 0.3,
      r1: cell * 1.7
    });
    // 中心爆闪
    effects.push({
      type: 'flash',
      x: cx,
      y: cy,
      life: 0,
      maxLife: 12,
      r0: cell * 0.2,
      r1: cell * 0.9
    });
  }

  function headScale() {
    if (headPulseT >= HEAD_PULSE_MAX) {
      return 1;
    }
    // 阻尼正弦：先膨大，再回弹（略小于 1），最后恢复
    return 1 + 0.7 * Math.sin(0.45 * headPulseT) * Math.exp(-0.22 * headPulseT);
  }

  function mouthOpen() {
    if (mouthT >= MOUTH_MAX) {
      return 0;
    }
    // 正弦开合：0 -> 1 -> 0，总时长约 0.5 秒
    return Math.sin(Math.PI * mouthT / MOUTH_MAX);
  }

  function updateEffects() {
    const cell = cssSize / cfg.GRID_SIZE;
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.life += 1;
      if (e.type === 'spark') {
        e.x += e.vx;
        e.y += e.vy;
        e.vy += cell * 0.015;
        e.vx *= 0.95;
        e.vy *= 0.95;
      }
      if (e.life >= e.maxLife) {
        effects.splice(i, 1);
      }
    }
    headPulseT = Math.min(headPulseT + 1, HEAD_PULSE_MAX);
    mouthT = Math.min(mouthT + 1, MOUTH_MAX);
  }

  function drawEffects() {
    effects.forEach(function (e) {
      const t = e.life / e.maxLife;
      const a = 1 - t;
      if (e.type === 'spark') {
        ctx.fillStyle = 'hsla(' + e.hue + ', 100%, 66%, ' + a + ')';
        ctx.shadowColor = 'hsla(' + e.hue + ', 100%, 60%, ' + a + ')';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * (1 - t * 0.4), 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'ring') {
        const r = e.r0 + (e.r1 - e.r0) * t;
        ctx.strokeStyle = 'rgba(255, 214, 64, ' + (a * 0.9) + ')';
        ctx.lineWidth = 2.5 * (1 - t) + 0.4;
        ctx.shadowColor = 'rgba(255, 214, 64, ' + a + ')';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (e.type === 'flash') {
        const r = e.r0 + (e.r1 - e.r0) * t;
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
        g.addColorStop(0, 'rgba(255, 240, 190, ' + (a * 0.9) + ')');
        g.addColorStop(1, 'rgba(255, 214, 64, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.shadowBlur = 0;
  }

  function draw(state, now, prevSnake, prevFood, interpT) {
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, cssSize, cssSize);
    drawBackground(now);
    drawStars(now);
    drawGrid();
    drawObstacles(state, now);
    drawFood(state, now, prevFood, interpT);
    drawSnake(state, prevSnake, interpT);
    updateEffects();
    drawEffects();
  }

  Snake.render = {
    init: init,
    resize: resize,
    draw: draw,
    spawnEatEffect: spawnEatEffect
  };
})();
