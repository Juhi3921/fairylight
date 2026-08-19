
(function () {
  "use strict";

  var STICKERS = [
    { id: "star-1", src: "star.png", size: 120 },
    { id: "star-2", src: "star.png", size: 78 },
    { id: "star-3", src: "star.png", size: 150 },
    { id: "bulb-1", src: "bulb.png", size: 132 },
    { id: "bulb-2", src: "bulb.png", size: 96 },
    { id: "moth-1", src: "moth.png", size: 138 },
    { id: "moth-2", src: "moth.png", size: 92 },
    { id: "flower-1", src: "flower.png", size: 126 },
    { id: "flower-2", src: "flower.png", size: 88 },
    { id: "butterfly-1", src: "butterfly.png", size: 148 },
    { id: "butterfly-2", src: "butterfly-2.png", size: 122 },
    { id: "butterfly-3", src: "butterfly.png", size: 96 },
    { id: "butterfly-4", src: "butterfly-2.png", size: 134 },
    { id: "butterfly-5", src: "butterfly.png", size: 110 },
    { id: "butterfly-6", src: "butterfly-2.png", size: 84 },
    { id: "butterfly-7", src: "butterfly.png", size: 128 }
  ];

  var NOTES = [
    {
      id: "note-drag",
      title: "psst",
      body: ["grab anything.", "throw it. it bounces."],
      width: 208,
      height: 122
    },
    {
      id: "note-butterfly",
      title: "butterflies",
      body: ["tap one to pop it.", "it comes back."],
      width: 214,
      height: 128
    },
    {
      id: "note-shake",
      title: "the button",
      body: ["press once for chaos.", "press again for calm."],
      width: 226,
      height: 132
    }
  ];

  /** Deterministic pseudo-random in [0, 1) so the layout is the same each load. */
  function seeded(seed) {
    var value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function drift(seed, magnitude) {
    return (seeded(seed) - 0.5) * 2 * magnitude;
  }

  var items = [];

  STICKERS.forEach(function (sticker, index) {
    var seed = index + 1;
    items.push({
      id: sticker.id,
      kind: "sticker",
      src: "./assets/" + sticker.src,
      width: sticker.size,
      height: sticker.size,
      shape: "circle",
      // Spawn as a fraction of the viewport so it adapts to any screen size.
      spawn: { x: 0.1 + seeded(seed * 3.1) * 0.8, y: 0.15 + seeded(seed * 7.7) * 0.7 },
      velocity: { x: drift(seed * 1.7, 2.4), y: drift(seed * 2.3, 2.4) },
      spin: drift(seed * 5.9, 0.02)
    });
  });

  NOTES.forEach(function (note, index) {
    var seed = index + 40;
    items.push({
      id: note.id,
      kind: "note",
      title: note.title,
      body: note.body,
      width: note.width,
      height: note.height,
      shape: "rectangle",
      spawn: { x: 0.18 + index * 0.3, y: 0.28 + seeded(seed) * 0.4 },
      velocity: { x: drift(seed * 1.3, 1.5), y: drift(seed * 2.9, 1.5) },
      spin: drift(seed * 4.1, 0.006)
    });
  });

  window.FLOATING_ITEMS = items;
})();
