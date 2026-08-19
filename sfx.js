
(function () {
  "use strict";

  var context = null;

  function ensureContext() {
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!context) context = new Ctor();
    if (context.state === "suspended") context.resume();
    return context;
  }

  /** One swept oscillator with a short attack/decay envelope. */
  function tone(ctx, options) {
    var duration = options.duration;
    var gain = options.gain === undefined ? 0.12 : options.gain;
    var start = ctx.currentTime + (options.delay || 0);

    var osc = ctx.createOscillator();
    var amp = ctx.createGain();

    osc.type = options.type || "sine";
    osc.frequency.setValueAtTime(options.from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(options.to, 1), start + duration);

    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + duration * 0.15);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  window.SFX = {
    /** Bright shattering sparkle when a butterfly pops. */
    burst: function () {
      var ctx = ensureContext();
      if (!ctx) return;
      for (var i = 0; i < 5; i += 1) {
        tone(ctx, {
          from: 1400 + i * 480 + Math.random() * 200,
          to: 380,
          duration: 0.3,
          gain: 0.06,
          type: "triangle",
          delay: i * 0.035
        });
      }
    },

    /** Soft rising chime when it flutters back in. */
    respawn: function () {
      var ctx = ensureContext();
      if (!ctx) return;
      tone(ctx, { from: 520, to: 880, duration: 0.32, gain: 0.07 });
      tone(ctx, { from: 780, to: 1320, duration: 0.36, gain: 0.045, delay: 0.06 });
    },

    /** Low rumbling swell on shake, a falling sigh on calm. */
    shake: function (on) {
      var ctx = ensureContext();
      if (!ctx) return;
      if (on) {
        tone(ctx, { from: 90, to: 240, duration: 0.5, gain: 0.1, type: "sawtooth" });
        tone(ctx, { from: 660, to: 1500, duration: 0.4, gain: 0.04, delay: 0.05 });
      } else {
        tone(ctx, { from: 420, to: 150, duration: 0.5, gain: 0.08 });
      }
    }
  };
})();
