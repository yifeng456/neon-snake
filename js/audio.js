(function () {
  'use strict';
  const Snake = window.Snake;
  const cfg = Snake.config;

  let ac = null;
  let muted = false;
  try {
    muted = localStorage.getItem(cfg.MUTE_KEY) === '1';
  } catch (e) {
    muted = false;
  }

  let musicTimer = null;
  let musicStep = 0;
  let nextNoteTime = 0;
  let musicRunning = false;
  let musicGain = null;
  let noiseBuf = null;

  const MUSIC_STEP_SEC = 60 / 132 / 2;
  const MUSIC_LOOKAHEAD = 0.2;
  const MUSIC_STEPS = 32;

  // Am, F, C, G: one 8-step bar each, using MIDI note numbers.
  const MUSIC_BARS = [
    {
      bass: [45, 52, 45, 52, 45, 52, 45, 57],
      arp: [57, 60, 64, 69, 64, 60, 57, 64],
      lead: [76, 0, 0, 0, 74, 0, 0, 0]
    },
    {
      bass: [41, 48, 41, 48, 41, 48, 41, 53],
      arp: [53, 57, 60, 65, 60, 57, 53, 60],
      lead: [72, 0, 0, 0, 71, 0, 0, 0]
    },
    {
      bass: [48, 55, 48, 55, 48, 55, 48, 60],
      arp: [55, 60, 64, 67, 64, 60, 55, 64],
      lead: [74, 0, 0, 0, 76, 0, 0, 0]
    },
    {
      bass: [43, 50, 43, 50, 43, 50, 43, 55],
      arp: [55, 59, 62, 67, 62, 59, 55, 62],
      lead: [71, 0, 0, 0, 69, 0, 0, 0]
    }
  ];

  function ensure() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        return null;
      }
      ac = new AC();
      musicGain = ac.createGain();
      musicGain.gain.value = 0;
      musicGain.connect(ac.destination);
    }
    if (ac.state === 'suspended') {
      ac.resume();
    }
    return ac;
  }

  function tone(type, from, to, dur, gain, delay) {
    const a = ensure();
    if (!a) {
      return;
    }
    const t0 = a.currentTime + (delay || 0);
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function musicNote(type, freq, dur, gain, time) {
    const t0 = time;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function musicHat(time) {
    if (!noiseBuf) {
      const len = Math.floor(ac.sampleRate * 0.08);
      noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.035, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(filter);
    filter.connect(g);
    g.connect(musicGain);
    src.start(time);
    src.stop(time + 0.06);
  }

  function scheduleMusicStep(step, time) {
    const bar = MUSIC_BARS[Math.floor(step / 8)];
    const slot = step % 8;
    if (bar.bass[slot]) {
      musicNote('triangle', midiToFreq(bar.bass[slot]), 0.17, 0.22, time);
    }
    if (bar.arp[slot]) {
      musicNote('square', midiToFreq(bar.arp[slot]), 0.11, 0.06, time);
    }
    if (bar.lead[slot]) {
      musicNote('sine', midiToFreq(bar.lead[slot]), 0.24, 0.1, time);
    }
    if (slot % 2 === 1) {
      musicHat(time);
    }
  }

  function scheduleMusic() {
    if (!ac || !musicRunning || muted) {
      return;
    }
    while (nextNoteTime < ac.currentTime + MUSIC_LOOKAHEAD) {
      scheduleMusicStep(musicStep, nextNoteTime);
      nextNoteTime += MUSIC_STEP_SEC;
      musicStep = (musicStep + 1) % MUSIC_STEPS;
    }
  }

  function startMusic() {
    if (muted) {
      return;
    }
    const a = ensure();
    if (!a) {
      return;
    }
    stopMusic();
    musicRunning = true;
    musicStep = 0;
    nextNoteTime = a.currentTime + 0.08;
    musicGain.gain.setTargetAtTime(0.9, a.currentTime, 0.03);
    musicTimer = window.setInterval(scheduleMusic, 90);
  }

  function stopMusic() {
    musicRunning = false;
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
    if (ac && musicGain) {
      musicGain.gain.setTargetAtTime(0, ac.currentTime, 0.03);
    }
  }

  function play(name) {
    if (muted) {
      return;
    }
    switch (name) {
      case 'eat':
        // 吃食反馈：更响亮、清脆，叠加多层上行泛音
        tone('sine', 520, 900, 0.11, 0.34);
        tone('triangle', 780, 1240, 0.09, 0.22, 0.012);
        tone('sine', 1560, 2200, 0.06, 0.12, 0.025);
        break;
      case 'levelUp':
        tone('triangle', 440, 880, 0.12, 0.12);
        tone('triangle', 660, 990, 0.12, 0.12, 0.08);
        break;
      case 'victory':
        tone('triangle', 523, 1046, 0.16, 0.12);
        tone('triangle', 784, 1568, 0.18, 0.12, 0.12);
        break;
      case 'gameOver':
        tone('sawtooth', 320, 70, 0.55, 0.12);
        break;
      case 'click':
        tone('square', 260, 220, 0.06, 0.07);
        break;
      case 'shoot':
        tone('square', 1200, 420, 0.09, 0.2);
        break;
      case 'item':
        tone('triangle', 523, 1046, 0.14, 0.16);
        tone('triangle', 784, 1568, 0.16, 0.12, 0.1);
        break;
      case 'freeze':
        tone('sine', 2093, 1568, 0.18, 0.14);
        tone('sine', 2637, 2093, 0.2, 0.1, 0.06);
        break;
    }
  }

  function isMuted() {
    return muted;
  }

  function setMuted(value) {
    muted = !!value;
    try {
      localStorage.setItem(cfg.MUTE_KEY, muted ? '1' : '0');
    } catch (e) {
      // ignore storage errors
    }
    if (muted) {
      stopMusic();
    }
    return muted;
  }

  Snake.audio = {
    play: play,
    startMusic: startMusic,
    stopMusic: stopMusic,
    isMuted: isMuted,
    setMuted: setMuted
  };
})();
