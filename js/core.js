(function () {
  'use strict';
  const Snake = window.Snake;
  const cfg = Snake.config;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  function keyOf(cell) {
    return cell.x + ':' + cell.y;
  }

  function inside(x, y) {
    return x >= 0 && y >= 0 && x < cfg.GRID_SIZE && y < cfg.GRID_SIZE;
  }

  function same(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function clone(state) {
    return {
      snake: state.snake.map(function (c) { return { x: c.x, y: c.y }; }),
      direction: { x: state.direction.x, y: state.direction.y },
      queue: state.queue.map(function (d) { return { x: d.x, y: d.y }; }),
      food: state.food ? { x: state.food.x, y: state.food.y } : null,
      foodMoveCounter: state.foodMoveCounter,
      obstacles: state.obstacles.map(function (c) { return { x: c.x, y: c.y }; }),
      score: state.score,
      eaten: state.eaten,
      level: state.level,
      tickMs: state.tickMs,
      phase: state.phase,
      won: state.won
    };
  }

  function buildObstacles(level) {
    const pattern = (level - 1) % 3;
    if (pattern === 0) {
      return [];
    }
    const cells = [];
    function add(x, y) {
      cells.push({ x: x, y: y });
    }
    if (pattern === 1) {
      add(3, 3); add(4, 3); add(3, 4); add(4, 4);
      add(20, 3); add(21, 3); add(20, 4); add(21, 4);
      add(3, 20); add(4, 20); add(3, 21); add(4, 21);
      add(20, 20); add(21, 20); add(20, 21); add(21, 21);
      add(11, 2); add(12, 2); add(11, 21); add(12, 21);
      add(2, 11); add(2, 12); add(21, 11); add(21, 12);
    } else {
      for (let y = 3; y <= 7; y++) add(5, y);
      for (let y = 16; y <= 21; y++) add(18, y);
      for (let y = 18; y <= 20; y++) add(6, y);
      for (let x = 8; x <= 14; x++) add(x, 6);
      for (let x = 9; x <= 15; x++) add(x, 17);
      add(2, 20); add(3, 20); add(2, 21); add(3, 21);
      add(20, 3); add(21, 3); add(20, 4); add(21, 4);
    }
    return cells;
  }

  function emptyCells(state) {
    const occupied = new Set();
    state.snake.forEach(function (c) { occupied.add(keyOf(c)); });
    state.obstacles.forEach(function (c) { occupied.add(keyOf(c)); });
    const cells = [];
    for (let y = 0; y < cfg.GRID_SIZE; y++) {
      for (let x = 0; x < cfg.GRID_SIZE; x++) {
        if (!occupied.has(x + ':' + y)) {
          cells.push({ x: x, y: y });
        }
      }
    }
    return cells;
  }

  function spawnFood(state) {
    const cells = emptyCells(state);
    if (!cells.length) {
      return null;
    }
    return cells[Math.floor(Math.random() * cells.length)];
  }

  function moveFood(state) {
    if (!state.food) {
      return null;
    }
    const head = state.snake[0];
    const occupied = new Set();
    state.snake.forEach(function (c) { occupied.add(keyOf(c)); });
    state.obstacles.forEach(function (c) { occupied.add(keyOf(c)); });
    const candidates = [];
    Object.keys(DIRS).forEach(function (name) {
      const d = DIRS[name];
      const x = state.food.x + d.x;
      const y = state.food.y + d.y;
      if (!inside(x, y) || occupied.has(x + ':' + y)) {
        return;
      }
      candidates.push({
        x: x,
        y: y,
        dist: Math.abs(x - head.x) + Math.abs(y - head.y)
      });
    });
    if (!candidates.length) {
      return state.food;
    }
    candidates.sort(function (a, b) { return b.dist - a.dist; });
    const bestDist = candidates[0].dist;
    const best = candidates.filter(function (c) { return c.dist === bestDist; });
    return best[Math.floor(Math.random() * best.length)];
  }

  function queueDirection(state, dir) {
    const last = state.queue.length
      ? state.queue[state.queue.length - 1]
      : state.direction;
    if (dir.x === last.x && dir.y === last.y) {
      return false;
    }
    if (dir.x === -last.x && dir.y === -last.y) {
      return false;
    }
    if (state.queue.length >= cfg.MAX_QUEUE) {
      return false;
    }
    state.queue.push({ x: dir.x, y: dir.y });
    return true;
  }

  function tickMsForLevel(level) {
    return Math.max(cfg.MIN_TICK_MS, cfg.BASE_TICK_MS - (level - 1) * cfg.TICK_STEP_MS);
  }

  function hitPoint(point, body, obstacles) {
    if (!inside(point.x, point.y)) {
      return 'wall';
    }
    if (obstacles.some(function (o) { return same(o, point); })) {
      return 'obstacle';
    }
    if (body.some(function (c) { return same(c, point); })) {
      return 'self';
    }
    return null;
  }

  function checkCollision(state) {
    return !!hitPoint(state.snake[0], state.snake, state.obstacles);
  }

  function step(state) {
    const next = clone(state);
    if (next.queue.length) {
      next.direction = next.queue.shift();
    }
    const head = next.snake[0];
    const newHead = {
      x: head.x + next.direction.x,
      y: head.y + next.direction.y
    };
    const willEat = !!next.food && same(newHead, next.food);
    const bodyToCheck = willEat ? next.snake : next.snake.slice(0, -1);
    const hit = hitPoint(newHead, bodyToCheck, next.obstacles);
    const events = [];

    if (hit) {
      next.phase = 'ended';
      events.push('gameOver');
      return { state: next, events: events };
    }

    next.snake = willEat
      ? [newHead].concat(next.snake)
      : [newHead].concat(next.snake.slice(0, -1));

    if (willEat) {
      next.score += cfg.POINTS_PER_FOOD;
      next.eaten += 1;
      events.push('ate');

      const newLevel = Math.floor(next.eaten / cfg.FOODS_PER_LEVEL) + 1;
      if (newLevel !== next.level) {
        next.level = newLevel;
        next.tickMs = tickMsForLevel(newLevel);
        const snakeSet = new Set(next.snake.map(keyOf));
        next.obstacles = buildObstacles(newLevel).filter(function (o) {
          return !snakeSet.has(keyOf(o));
        });
        events.push('levelUp');
      }

      const food = spawnFood(next);
      if (!food) {
        next.phase = 'ended';
        next.won = true;
        next.food = null;
        events.push('victory');
      } else {
        next.food = food;
      }
      next.foodMoveCounter = 0;
    } else {
      next.foodMoveCounter += 1;
      if (next.foodMoveCounter >= cfg.FOOD_MOVE_INTERVAL) {
        const moved = moveFood(next);
        if (moved) {
          next.food = moved;
        }
        next.foodMoveCounter = 0;
      }
    }

    return { state: next, events: events };
  }

  function createGame() {
    const centerY = Math.floor(cfg.GRID_SIZE / 2);
    const centerX = Math.floor(cfg.GRID_SIZE / 2);
    const snake = [];
    for (let i = 0; i < cfg.START_LENGTH; i++) {
      snake.push({ x: centerX + 1 - i, y: centerY });
    }
    const state = {
      snake: snake,
      direction: { x: 1, y: 0 },
      queue: [],
      food: null,
      foodMoveCounter: 0,
      obstacles: buildObstacles(1),
      score: 0,
      eaten: 0,
      level: 1,
      tickMs: cfg.BASE_TICK_MS,
      phase: 'ready',
      won: false
    };
    state.food = spawnFood(state);
    return state;
  }

  Object.assign(Snake, {
    DIRS: DIRS,
    createGame: createGame,
    step: step,
    spawnFood: spawnFood,
    moveFood: moveFood,
    buildObstacles: buildObstacles,
    checkCollision: checkCollision,
    queueDirection: queueDirection,
    emptyCells: emptyCells,
    tickMsForLevel: tickMsForLevel
  });
})();
