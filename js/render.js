(function () {
  'use strict';
  const Snake = window.Snake;
  const cfg = Snake.config;

  let canvas = null;
  let ctx = null;
  let cssSize = 0;
  let dpr = 1;

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

  function draw(state, now) {
    if (!ctx) {
      return;
    }
    const cell = cssSize / cfg.GRID_SIZE;
    ctx.clearRect(0, 0, cssSize, cssSize);

    const bg = ctx.createLinearGradient(0, 0, cssSize, cssSize);
    bg.addColorStop(0, '#080d1a');
    bg.addColorStop(1, '#0d1226');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cssSize, cssSize);

    ctx.strokeStyle = 'rgba(120, 220, 255, 0.05)';
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

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, cssSize - 2, cssSize - 2);

    state.obstacles.forEach(function (o) {
      const x = o.x * cell;
      const y = o.y * cell;
      ctx.shadowColor = 'rgba(255, 63, 164, 0.9)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff3fa4';
      roundRect(x + 2, y + 2, cell - 4, cell - 4, 4);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    if (state.food) {
      const pulse = 1 + 0.12 * Math.sin(now / 180);
      const cx = (state.food.x + 0.5) * cell;
      const cy = (state.food.y + 0.5) * cell;
      const rad = cell * 0.3 * pulse;
      ctx.shadowColor = 'rgba(255, 214, 64, 0.95)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffd640';
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(cx - rad * 0.3, cy - rad * 0.3, rad * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const len = state.snake.length;
    for (let i = len - 1; i >= 0; i--) {
      const seg = state.snake[i];
      const t = len === 1 ? 0 : i / (len - 1);
      const hue = 185 - t * 100;
      const light = i === 0 ? 60 : 46 + t * 12;
      const x = seg.x * cell;
      const y = seg.y * cell;
      ctx.shadowColor = 'rgba(0, 229, 255, 0.85)';
      ctx.shadowBlur = 9;
      ctx.fillStyle = 'hsl(' + hue + ', 95%, ' + light + '%)';
      roundRect(x + 1.5, y + 1.5, cell - 3, cell - 3, 5);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

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
      ctx.fillStyle = '#071018';
      [1, -1].forEach(function (s) {
        ctx.beginPath();
        ctx.arc(
          hx + dx * fwd + px * side * s,
          hy + dy * fwd + py * side * s,
          cell * 0.07,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    }
  }

  Snake.render = {
    init: init,
    resize: resize,
    draw: draw
  };
})();
