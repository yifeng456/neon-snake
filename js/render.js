(function () {
  'use strict';
  const Snake = window.Snake;
  const cfg = Snake.config;

  let canvas = null;
  let ctx = null;
  let cssSize = 0;
  let dpr = 1;
  let stars = null;

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

  function drawFood(state, now) {
    if (!state.food) {
      return;
    }
    const cell = cssSize / cfg.GRID_SIZE;
    const pulse = 1 + 0.12 * Math.sin(now / 180);
    const cx = (state.food.x + 0.5) * cell;
    const cy = (state.food.y + 0.5) * cell;
    const rad = cell * 0.32 * pulse;

    // 外层光晕
    ctx.shadowColor = 'rgba(255, 214, 64, 0.95)';
    ctx.shadowBlur = 22;

    // 径向渐变球体（白心 -> 金黄 -> 橙红）
    const g = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.1, cx, cy, rad);
    g.addColorStop(0, '#fff8dc');
    g.addColorStop(0.35, '#ffd640');
    g.addColorStop(1, '#ff7a1a');
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
    ctx.strokeStyle = 'rgba(255, 214, 64, ' + ringA + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rad * 1.7, now / 600, now / 600 + Math.PI * 1.4);
    ctx.stroke();
  }

  function drawSnake(state) {
    const cell = cssSize / cfg.GRID_SIZE;
    const len = state.snake.length;
    for (let i = len - 1; i >= 0; i--) {
      const seg = state.snake[i];
      const t = len === 1 ? 0 : i / (len - 1);
      const hue = 185 - t * 100;
      const light = i === 0 ? 62 : 46 + t * 12;
      const x = seg.x * cell;
      const y = seg.y * cell;

      ctx.shadowColor = 'hsla(' + hue + ', 95%, 55%, 0.85)';
      ctx.shadowBlur = i === 0 ? 20 : 11;

      // 垂直渐变，模拟霓虹灯管（上亮下暗）
      const g = ctx.createLinearGradient(x, y, x, y + cell);
      g.addColorStop(0, 'hsl(' + hue + ', 100%, ' + Math.min(74, light + 10) + '%)');
      g.addColorStop(0.5, 'hsl(' + hue + ', 95%, ' + light + '%)');
      g.addColorStop(1, 'hsl(' + hue + ', 90%, ' + Math.max(26, light - 15) + '%)');
      ctx.fillStyle = g;
      roundRect(x + 1.5, y + 1.5, cell - 3, cell - 3, 5);
      ctx.fill();

      // 顶部高光条（模拟灯管反光）
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      roundRect(x + 4, y + 3, cell - 8, Math.max(2, cell * 0.16), 2);
      ctx.fill();
    }

    // 蛇头眼睛
    const head = state.snake[0];
    if (head) {
      const hx = (head.x + 0.5) * cell;
      const hy = (head.y + 0.5) * cell;
      const dx = state.direction.x;
      const dy = state.direction.y;
      const px = -dy;
      const py = dx;
      const fwd = cell * 0.16;
      const side = cell * 0.17;
      ctx.fillStyle = '#05070f';
      ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
      ctx.shadowBlur = 4;
      [1, -1].forEach(function (s) {
        ctx.beginPath();
        ctx.arc(
          hx + dx * fwd + px * side * s,
          hy + dy * fwd + py * side * s,
          cell * 0.08,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.shadowBlur = 0;
    }
  }

  function draw(state, now) {
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, cssSize, cssSize);
    drawBackground(now);
    drawStars(now);
    drawGrid();
    drawObstacles(state, now);
    drawFood(state, now);
    drawSnake(state);
  }

  Snake.render = {
    init: init,
    resize: resize,
    draw: draw
  };
})();
