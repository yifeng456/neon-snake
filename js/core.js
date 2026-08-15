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
      item: state.item ? { x: state.item.x, y: state.item.y } : null,
      itemMoveCounter: state.itemMoveCounter,
      itemTimer: state.itemTimer,
      invisibleSteps: state.invisibleSteps,
      freezeSteps: state.freezeSteps,
      foodFreezeSteps: state.foodFreezeSteps,
      bullets: state.bullets,
      brokenObstacles: state.brokenObstacles.slice(),
      obstacles: state.obstacles.map(function (c) { return { x: c.x, y: c.y }; }),
      score: state.score,
      eaten: state.eaten,
      level: state.level,
      tickMs: state.tickMs,
      phase: state.phase,
      won: state.won
    };
  }

  function addObstacles(state, count) {
    const target = Math.min(cfg.MAX_OBSTACLES, state.obstacles.length + count);
    const toAdd = target - state.obstacles.length;
    if (toAdd <= 0) {
      return 0;
    }
    const snakeSet = new Set(state.snake.map(keyOf));
    const obstacleSet = new Set(state.obstacles.map(keyOf));
    const brokenSet = new Set(state.brokenObstacles);

    // 均匀分布：把棋盘划分为若干区域，每轮每个区域最多放一个新障碍
    const zoneSize = 4;
    const zonesX = Math.floor(cfg.GRID_SIZE / zoneSize);
    const zonesY = Math.floor(cfg.GRID_SIZE / zoneSize);
    const zones = [];
    for (let zy = 0; zy < zonesY; zy++) {
      for (let zx = 0; zx < zonesX; zx++) {
        zones.push({ zx: zx, zy: zy });
      }
    }
    // 打乱区域顺序，保证障碍分散
    for (let i = zones.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = zones[i];
      zones[i] = zones[j];
      zones[j] = tmp;
    }

    const added = [];
    for (let zi = 0; zi < zones.length && added.length < toAdd; zi++) {
      const zone = zones[zi];
      const candidates = [];
      for (let y = zone.zy * zoneSize; y < (zone.zy + 1) * zoneSize; y++) {
        for (let x = zone.zx * zoneSize; x < (zone.zx + 1) * zoneSize; x++) {
          // 不贴墙：留出边界一圈
          if (x < 1 || y < 1 || x >= cfg.GRID_SIZE - 1 || y >= cfg.GRID_SIZE - 1) {
            continue;
          }
          const k = x + ':' + y;
          if (snakeSet.has(k) || obstacleSet.has(k) || brokenSet.has(k)) {
            continue;
          }
          candidates.push({ x: x, y: y });
        }
      }
      if (candidates.length) {
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        obstacleSet.add(keyOf(cell));
        added.push(cell);
      }
    }
    state.obstacles = state.obstacles.concat(added);
    return added.length;
  }

  function emptyCells(state) {
    const occupied = new Set();
    state.snake.forEach(function (c) { occupied.add(keyOf(c)); });
    state.obstacles.forEach(function (c) { occupied.add(keyOf(c)); });
    if (state.item) {
      occupied.add(keyOf(state.item));
    }
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

  function moveAway(state, obj) {
    const head = state.snake[0];
    const occupied = new Set();
    state.snake.forEach(function (c) { occupied.add(keyOf(c)); });
    state.obstacles.forEach(function (c) { occupied.add(keyOf(c)); });
    if (state.food && state.food !== obj) {
      occupied.add(keyOf(state.food));
    }
    if (state.item && state.item !== obj) {
      occupied.add(keyOf(state.item));
    }
    const candidates = [];
    Object.keys(DIRS).forEach(function (name) {
      const d = DIRS[name];
      const x = obj.x + d.x;
      const y = obj.y + d.y;
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
      return obj;
    }
    candidates.sort(function (a, b) { return b.dist - a.dist; });
    const bestDist = candidates[0].dist;
    const best = candidates.filter(function (c) { return c.dist === bestDist; });
    return best[Math.floor(Math.random() * best.length)];
  }

  function moveFood(state) {
    if (!state.food) {
      return null;
    }
    return moveAway(state, state.food);
  }

  function moveItem(state) {
    if (!state.item) {
      return null;
    }
    return moveAway(state, state.item);
  }

  function spawnItem(state) {
    const cells = emptyCells(state).filter(function (c) {
      return !state.food || !same(c, state.food);
    });
    if (!cells.length) {
      return null;
    }
    return cells[Math.floor(Math.random() * cells.length)];
  }

  function shoot(state) {
    if (state.bullets <= 0) {
      return null;
    }
    state.bullets -= 1; // 每次射击消耗一颗（无论是否命中）
    const head = state.snake[0];
    const dir = state.direction;
    let x = head.x + dir.x;
    let y = head.y + dir.y;
    while (inside(x, y)) {
      // 命中障碍物：击碎
      const idx = state.obstacles.findIndex(function (o) {
        return o.x === x && o.y === y;
      });
      if (idx !== -1) {
        const broken = state.obstacles[idx];
        const key = keyOf(broken);
        if (state.brokenObstacles.indexOf(key) === -1) {
          state.brokenObstacles.push(key);
        }
        state.obstacles.splice(idx, 1);
        return { type: 'obstacle', x: broken.x, y: broken.y };
      }
      // 命中食物：食物冻结 1 秒
      if (state.food && state.food.x === x && state.food.y === y) {
        state.foodFreezeSteps = Math.round(cfg.FOOD_FREEZE_MS / state.tickMs);
        return { type: 'food', x: x, y: y };
      }
      x += dir.x;
      y += dir.y;
    }
    return { type: 'miss' };
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

  function foodMoveInterval(snakeLength) {
    const interval = cfg.FOOD_MOVE_BASE - Math.floor((snakeLength - cfg.START_LENGTH) / cfg.FOOD_MOVE_STEP);
    return Math.max(cfg.FOOD_MOVE_MIN, interval);
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

    const invisible = next.invisibleSteps > 0;
    if (invisible) {
      next.invisibleSteps -= 1;
    }
    const frozen = next.freezeSteps > 0;
    if (frozen) {
      next.freezeSteps -= 1;
    }
    const foodFrozen = next.foodFreezeSteps > 0;
    if (foodFrozen) {
      next.foodFreezeSteps -= 1;
    }

    const head = next.snake[0];
    let newHead = {
      x: head.x + next.direction.x,
      y: head.y + next.direction.y
    };

    // 隐身时穿墙：从相反方向出现
    if (invisible && !inside(newHead.x, newHead.y)) {
      newHead.x = (newHead.x + cfg.GRID_SIZE) % cfg.GRID_SIZE;
      newHead.y = (newHead.y + cfg.GRID_SIZE) % cfg.GRID_SIZE;
    }

    const willEat = !!next.food && same(newHead, next.food);
    const willTakeItem = !!next.item && same(newHead, next.item);
    // 隐身时自身也无碰撞体积，可穿过自己身体
    let bodyToCheck;
    if (invisible) {
      bodyToCheck = [];
    } else if (willEat) {
      bodyToCheck = next.snake;
    } else {
      bodyToCheck = next.snake.slice(0, -1);
    }
    // 隐身时可穿过障碍物
    const obstacles = invisible ? [] : next.obstacles;
    const hit = hitPoint(newHead, bodyToCheck, obstacles);
    const events = [];

    if (hit) {
      next.phase = 'ended';
      events.push('gameOver');
      return { state: next, events: events };
    }

    next.snake = willEat
      ? [newHead].concat(next.snake)
      : [newHead].concat(next.snake.slice(0, -1));

    // 拾取道具：随机触发隐身、子弹或冻结
    if (willTakeItem) {
      const roll = Math.random();
      if (roll < 1 / 3) {
        next.invisibleSteps = Math.round(cfg.INVISIBLE_MS / next.tickMs);
        events.push('itemInvisible');
      } else if (roll < 2 / 3) {
        next.bullets += cfg.BULLETS_ON_PICKUP;
        events.push('itemBullets');
      } else {
        next.freezeSteps = Math.round(cfg.FREEZE_MS / next.tickMs);
        events.push('itemFreeze');
      }
      next.item = null;
      next.itemMoveCounter = 0;
    }

    if (willEat) {
      next.score += cfg.POINTS_PER_FOOD;
      next.eaten += 1;
      events.push('ate');

      const newLevel = Math.floor(next.eaten / cfg.FOODS_PER_LEVEL) + 1;
      if (newLevel !== next.level) {
        next.level = newLevel;
        next.tickMs = tickMsForLevel(newLevel);
        // 每级新增几个障碍物（均匀分布、不贴墙、避开蛇与已击碎）
        addObstacles(next, cfg.OBSTACLES_PER_LEVEL);
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
      // 冻结期间食物停止移动
      if (!frozen && !foodFrozen) {
        next.foodMoveCounter += 1;
        if (next.foodMoveCounter >= foodMoveInterval(next.snake.length)) {
          const moved = moveFood(next);
          if (moved) {
            next.food = moved;
          }
          next.foodMoveCounter = 0;
        }
      }
    }

    // 道具移动（速度锁定为关卡一速度）
    if (next.item) {
      next.itemMoveCounter += 1;
      if (next.itemMoveCounter >= cfg.ITEM_MOVE_INTERVAL) {
        const moved = moveItem(next);
        if (moved) {
          next.item = moved;
        }
        next.itemMoveCounter = 0;
      }
    }

    // 道具按时间刷新：得分达到阈值后，每 30 秒出现一次
    if (next.score >= cfg.ITEM_MIN_SCORE) {
      if (next.itemTimer <= 0) {
        next.item = null;
        next.item = spawnItem(next);
        next.itemMoveCounter = 0;
        next.itemTimer = Math.round(cfg.ITEM_SPAWN_MS / next.tickMs);
      } else {
        next.itemTimer -= 1;
      }
    } else {
      next.itemTimer = 0;
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
      item: null,
      itemMoveCounter: 0,
      itemTimer: 0,
      invisibleSteps: 0,
      freezeSteps: 0,
      foodFreezeSteps: 0,
      bullets: 0,
      brokenObstacles: [],
      obstacles: [],
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
    moveItem: moveItem,
    spawnItem: spawnItem,
    shoot: shoot,
    addObstacles: addObstacles,
    checkCollision: checkCollision,
    queueDirection: queueDirection,
    emptyCells: emptyCells,
    tickMsForLevel: tickMsForLevel,
    foodMoveInterval: foodMoveInterval
  });
})();
