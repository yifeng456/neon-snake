(function () {
  'use strict';
  const Snake = window.Snake;
  const cfg = Snake.config;

  function $(sel) {
    return document.querySelector(sel);
  }

  const canvas = $('#gameCanvas');
  const els = {
    score: $('#score'),
    level: $('#level'),
    best: $('#best'),
    bullets: $('#bullets'),
    bulletStat: $('#bulletStat'),
    invisibleTime: $('#invisibleTime'),
    invisibleStat: $('#invisibleStat'),
    freezeTime: $('#freezeTime'),
    freezeStat: $('#freezeStat'),
    pauseBtn: $('#pauseBtn'),
    muteBtn: $('#muteBtn'),
    startOverlay: $('#startOverlay'),
    pauseOverlay: $('#pauseOverlay'),
    endOverlay: $('#endOverlay'),
    startBtn: $('#startBtn'),
    resumeBtn: $('#resumeBtn'),
    restartBtn: $('#restartBtn'),
    endTitle: $('#endTitle'),
    finalScore: $('#finalScore'),
    finalBest: $('#finalBest')
  };

  let state = null;
  let phase = 'ready';
  let rafId = 0;
  let last = null;
  let acc = 0;
  let prevSnake = null;
  let prevFood = null;
  let prevItem = null;
  let best = 0;
  let muted = false;

  function show(el) {
    el.classList.remove('hidden');
  }

  function hide(el) {
    el.classList.add('hidden');
  }

  function hideAllOverlays() {
    hide(els.startOverlay);
    hide(els.pauseOverlay);
    hide(els.endOverlay);
  }

  function loadBest() {
    try {
      best = parseInt(localStorage.getItem(cfg.BEST_KEY), 10) || 0;
    } catch (e) {
      best = 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(cfg.BEST_KEY, String(best));
    } catch (e) {
      // ignore storage errors
    }
  }

  function updateHud() {
    els.score.textContent = String(state.score);
    els.level.textContent = String(state.level);
    els.best.textContent = String(best);
  }

  function updatePowerHud() {
    const hasBullets = state.bullets > 0;
    els.bulletStat.classList.toggle('hidden', !hasBullets);
    if (hasBullets) {
      els.bullets.textContent = String(state.bullets);
    }
    const invisible = state.invisibleSteps > 0;
    els.invisibleStat.classList.toggle('hidden', !invisible);
    if (invisible) {
      const secs = Math.max(1, Math.ceil(state.invisibleSteps * state.tickMs / 1000));
      els.invisibleTime.textContent = secs + 's';
    }
    const frozen = state.freezeSteps > 0;
    els.freezeStat.classList.toggle('hidden', !frozen);
    if (frozen) {
      const secs = Math.max(1, Math.ceil(state.freezeSteps * state.tickMs / 1000));
      els.freezeTime.textContent = secs + 's';
    }
  }

  function updatePauseButton() {
    els.pauseBtn.classList.toggle('paused', phase === 'paused');
  }

  function updateMuteButton() {
    els.muteBtn.classList.toggle('muted', muted);
  }

  function finishGame(won) {
    phase = 'ended';
    state.phase = 'ended';
    state.won = won;
    Snake.audio.stopMusic();
    if (state.score > best) {
      best = state.score;
      saveBest();
    }
    els.endTitle.textContent = won ? '通关！' : '游戏结束';
    els.finalScore.textContent = String(state.score);
    els.finalBest.textContent = String(best);
    show(els.endOverlay);
    updateHud();
  }

  function handleEvents(events) {
    events.forEach(function (name) {
      if (name === 'ate') {
        Snake.audio.play('eat');
        updateHud();
        const head = state.snake[0];
        Snake.render.spawnEatEffect(head.x, head.y);
      } else if (name === 'levelUp') {
        Snake.audio.play('levelUp');
        updateHud();
      } else if (name === 'itemInvisible' || name === 'itemBullets') {
        Snake.audio.play('item');
        updatePowerHud();
      } else if (name === 'itemFreeze') {
        Snake.audio.play('freeze');
        updatePowerHud();
        const fhead = state.snake[0];
        Snake.render.spawnFreezeEffect(fhead.x, fhead.y);
      } else if (name === 'gameOver') {
        Snake.audio.play('gameOver');
        finishGame(false);
      } else if (name === 'victory') {
        Snake.audio.play('victory');
        finishGame(true);
      }
    });
  }

  function startGame() {
    state = Snake.createGame();
    state.phase = 'running';
    phase = 'running';
    hideAllOverlays();
    acc = 0;
    last = null;
    prevSnake = null;
    prevFood = null;
    prevItem = null;
    updateHud();
    updatePowerHud();
    Snake.audio.startMusic();
  }

  function pauseGame() {
    if (phase !== 'running') {
      return;
    }
    phase = 'paused';
    state.phase = 'paused';
    acc = 0;
    last = null;
    show(els.pauseOverlay);
    updatePauseButton();
    Snake.audio.stopMusic();
  }

  function resumeGame() {
    if (phase !== 'paused') {
      return;
    }
    phase = 'running';
    state.phase = 'running';
    hide(els.pauseOverlay);
    acc = 0;
    last = null;
    updatePauseButton();
    Snake.audio.startMusic();
  }

  function togglePause() {
    if (phase === 'running') {
      pauseGame();
    } else if (phase === 'paused') {
      resumeGame();
    }
  }

  function toggleMute() {
    muted = Snake.audio.setMuted(!muted);
    updateMuteButton();
    if (!muted && phase === 'running') {
      Snake.audio.startMusic();
    }
  }

  function onDirection(name) {
    if (phase === 'running') {
      Snake.queueDirection(state, Snake.DIRS[name]);
    }
  }

  function onConfirm() {
    if (phase === 'ready' || phase === 'ended') {
      startGame();
    } else if (phase === 'paused') {
      resumeGame();
    }
  }

  function onShoot() {
    if (phase !== 'running') {
      return;
    }
    const head = state.snake[0];
    const result = Snake.shoot(state);
    if (!result) {
      return;
    }
    Snake.audio.play('shoot');
    updatePowerHud();
    if (result.type === 'obstacle') {
      Snake.render.spawnShootEffect(head.x, head.y, result.x, result.y);
    } else if (result.type === 'food') {
      Snake.render.spawnFreezeEffect(result.x, result.y);
    }
  }

  function initMobileControls() {
    const dpadBtns = document.querySelectorAll('.dpad-btn');
    for (let i = 0; i < dpadBtns.length; i++) {
      const btn = dpadBtns[i];
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        onDirection(btn.getAttribute('data-dir'));
      });
    }
    const shootBtn = document.getElementById('shootBtn');
    if (shootBtn) {
      shootBtn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        onShoot();
      });
    }
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    let interpT = 0;
    if (phase === 'running') {
      if (last === null) {
        last = now;
      }
      acc += Math.min(now - last, 250);
      last = now;
      while (phase === 'running' && acc >= state.tickMs) {
        acc -= state.tickMs;
        // 记录本次移动前的蛇身/食物/道具位置，用于平滑插值
        prevSnake = state.snake.map(function (c) {
          return { x: c.x, y: c.y };
        });
        const prevFoodPos = state.food
          ? { x: state.food.x, y: state.food.y }
          : null;
        const prevItemPos = state.item
          ? { x: state.item.x, y: state.item.y }
          : null;
        const result = Snake.step(state);
        state = result.state;
        const ev = result.events;
        const ate = ev.indexOf('ate') !== -1;
        const levelUp = ev.indexOf('levelUp') !== -1;
        const tookItem = ev.indexOf('itemInvisible') !== -1 || ev.indexOf('itemBullets') !== -1 || ev.indexOf('itemFreeze') !== -1;
        // 吃食/拾取道具/升级刷新时，食物与道具直接出现，不做插值
        prevFood = ate ? null : prevFoodPos;
        prevItem = (tookItem || levelUp) ? null : prevItemPos;
        handleEvents(ev);
      }
      interpT = Math.min(1, Math.max(0, acc / state.tickMs));
    } else {
      last = null;
      acc = 0;
      prevSnake = null;
      prevFood = null;
      prevItem = null;
    }
    updatePowerHud();
    Snake.render.draw(state, now, prevSnake, prevFood, prevItem, interpT);
  }

  function init() {
    // 触屏设备显示手机端操作区
    if ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) {
      document.body.classList.add('touch');
    }

    Snake.render.init(canvas);
    Snake.render.resize();
    loadBest();
    muted = Snake.audio.isMuted();
    updateMuteButton();
    updatePauseButton();

    state = Snake.createGame();
    updateHud();

    window.addEventListener('resize', function () {
      Snake.render.resize();
    });

    els.startBtn.addEventListener('click', function () {
      Snake.audio.play('click');
      startGame();
    });
    els.resumeBtn.addEventListener('click', function () {
      Snake.audio.play('click');
      resumeGame();
    });
    els.restartBtn.addEventListener('click', function () {
      Snake.audio.play('click');
      startGame();
    });
    els.pauseBtn.addEventListener('click', function () {
      Snake.audio.play('click');
      togglePause();
    });
    els.muteBtn.addEventListener('click', function () {
      Snake.audio.play('click');
      toggleMute();
    });

    Snake.input.init(canvas, {
      onDirection: onDirection,
      onTogglePause: togglePause,
      onToggleMute: toggleMute,
      onConfirm: onConfirm,
      onShoot: onShoot
    });

    initMobileControls();

    rafId = requestAnimationFrame(frame);
  }

  init();
})();
