(function () {
  'use strict';
  const Snake = window.Snake;

  const DIR_MAP = {
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right'
  };

  function init(canvas, handlers) {
    function onKey(e) {
      if (e.repeat) {
        return;
      }
      const dirName = DIR_MAP[e.code];
      if (dirName) {
        if (handlers.onDirection) {
          handlers.onDirection(dirName);
        }
        e.preventDefault();
        return;
      }
      if (e.code === 'Space' || e.code === 'KeyP') {
        if (handlers.onTogglePause) {
          handlers.onTogglePause();
        }
        e.preventDefault();
        return;
      }
      if (e.code === 'KeyM') {
        if (handlers.onToggleMute) {
          handlers.onToggleMute();
        }
        return;
      }
      if (e.code === 'Enter') {
        if (handlers.onConfirm) {
          handlers.onConfirm();
        }
        e.preventDefault();
      }
    }

    let touchStart = null;

    function onTouchStart(e) {
      if (e.touches.length === 1) {
        touchStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    }

    function onTouchEnd(e) {
      if (!touchStart) {
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
        return;
      }
      const name = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up');
      if (handlers.onDirection) {
        handlers.onDirection(name);
      }
    }

    window.addEventListener('keydown', onKey);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    return {
      destroy: function () {
        window.removeEventListener('keydown', onKey);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchend', onTouchEnd);
      }
    };
  }

  Snake.input = {
    init: init
  };
})();
