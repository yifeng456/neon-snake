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
    FOOD_MOVE_INTERVAL: 2,
    MAX_QUEUE: 2,
    BEST_KEY: 'snake-neon-best-v1',
    MUTE_KEY: 'snake-neon-muted-v1'
  };
})();
