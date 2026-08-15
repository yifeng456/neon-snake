(function () {
  'use strict';
  window.Snake = window.Snake || {};
  window.Snake.config = {
    GRID_SIZE: 24,
    START_LENGTH: 4,
    BASE_TICK_MS: 150,
    TICK_STEP_MS: 10,
    MIN_TICK_MS: 80,
    FOODS_PER_LEVEL: 3,
    POINTS_PER_FOOD: 10,
    FOOD_MOVE_BASE: 5,
    FOOD_MOVE_MIN: 2,
    FOOD_MOVE_STEP: 3,
    OBSTACLES_PER_LEVEL: 20,
    MAX_OBSTACLES: 120,
    ITEM_MIN_SCORE: 130,
    ITEM_SPAWN_MS: 30000,
    ITEM_MOVE_INTERVAL: 5,
    INVISIBLE_MS: 30000,
    FREEZE_MS: 10000,
    FOOD_FREEZE_MS: 1000,
    BULLETS_ON_PICKUP: 10,
    MAX_QUEUE: 2,
    BEST_KEY: 'snake-neon-best-v1',
    MUTE_KEY: 'snake-neon-muted-v1'
  };
})();
