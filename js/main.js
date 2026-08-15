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
    updateHud();
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
        // 记录本次移动前的蛇身位置，用于平滑插值
        prevSnake = state.snake.map(function (c) {
          return { x: c.x, y: c.y };
        });
        const result = Snake.step(state);
        state = result.state;
        handleEvents(result.events);
      }
      interpT = Math.min(1, Math.max(0, acc / state.tickMs));
    } else {
      last = null;
      acc = 0;
      prevSnake = null;
    }
    Snake.render.draw(state, now, prevSnake, interpT);
  }

  function init() {
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
      onConfirm: onConfirm
    });

    rafId = requestAnimationFrame(frame);
  }

  init();
})();
