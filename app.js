
(function () {
  "use strict";

  var SOUND_STORAGE_KEY = "fairylight:sound";
  var WALL_THICKNESS = 200;
  var SPARKLE_COUNT = 14;
  var TIMESTEP_MS = 1000 / 60;
  var JOLT_INTERVAL_MS = 180;

  var container = document.getElementById("playground");
  var shakeButton = document.getElementById("shake-toggle");
  var soundButton = document.getElementById("sound-toggle");
  if (!container || !shakeButton || !soundButton) return;

  var Engine = Matter.Engine;
  var Bodies = Matter.Bodies;
  var Body = Matter.Body;
  var Composite = Matter.Composite;
  var Events = Matter.Events;

  var items = window.FLOATING_ITEMS;
  var sfx = window.SFX;

  /** id -> { body, node, item } */
  var entities = new Map();
  var shaking = false;
  var soundOn = window.localStorage.getItem(SOUND_STORAGE_KEY) === "on";

  // --- DOM -----------------------------------------------------------------

  function buildNode(item) {
    var node;
    if (item.kind === "sticker") {
      node = document.createElement("img");
      node.src = item.src;
      node.alt = "";
      node.draggable = false;
      node.className = "floaty";
    } else {
      node = document.createElement("div");
      node.className = "floaty note";

      var title = document.createElement("p");
      title.className = "note-title";
      title.textContent = item.title;
      node.appendChild(title);

      item.body.forEach(function (line) {
        var p = document.createElement("p");
        p.className = "note-line";
        p.textContent = line;
        node.appendChild(p);
      });
    }

    node.style.width = item.width + "px";
    node.style.height = item.height + "px";
    return node;
  }

  // --- Physics -------------------------------------------------------------

  function createBody(item, viewport) {
    var options = {
      label: item.id,
      // Almost-elastic, near-frictionless: things keep drifting, but a touch of
      // damping stops collisions from pumping energy into a permanent jitter.
      restitution: 0.82,
      friction: 0,
      frictionAir: 0.004,
      frictionStatic: 0,
      slop: 0.02,
      density: item.kind === "note" ? 0.0016 : 0.001
    };

    var x = item.spawn.x * viewport.width;
    var y = item.spawn.y * viewport.height;

    var body =
      item.shape === "circle"
        ? Bodies.circle(x, y, item.width / 2, options)
        : Bodies.rectangle(x, y, item.width, item.height, options);

    Body.setVelocity(body, item.velocity);
    Body.setAngularVelocity(body, item.spin);
    return body;
  }

  function createWalls(width, height) {
    var half = WALL_THICKNESS / 2;
    var options = { isStatic: true, restitution: 0.9, friction: 0 };
    return [
      Bodies.rectangle(width / 2, -half, width + WALL_THICKNESS * 2, WALL_THICKNESS, options),
      Bodies.rectangle(width / 2, height + half, width + WALL_THICKNESS * 2, WALL_THICKNESS, options),
      Bodies.rectangle(-half, height / 2, WALL_THICKNESS, height + WALL_THICKNESS * 2, options),
      Bodies.rectangle(width + half, height / 2, WALL_THICKNESS, height + WALL_THICKNESS * 2, options)
    ];
  }

  var engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
  var rect = container.getBoundingClientRect();
  var viewport = { width: rect.width, height: rect.height };
  var walls = createWalls(viewport.width, viewport.height);
  Composite.add(engine.world, walls);

  items.forEach(function (item) {
    var node = buildNode(item);
    container.appendChild(node);
    var body = createBody(item, viewport);
    Composite.add(engine.world, body);
    entities.set(item.id, { item: item, node: node, body: body });
  });

  // Dragging / flinging.
  var mouse = Matter.Mouse.create(container);
  // matter-js hijacks wheel events by default, which would block page scroll.
  mouse.element.removeEventListener("wheel", mouse.mousewheel);
  mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);

  Composite.add(
    engine.world,
    Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.16, damping: 0.06, render: { visible: false } }
    })
  );

  /** Copy body state onto the DOM after each physics step. */
  function syncDom() {
    entities.forEach(function (entity) {
      var p = entity.body.position;
      entity.node.style.transform =
        "translate3d(" + p.x + "px, " + p.y + "px, 0) translate(-50%, -50%) rotate(" +
        entity.body.angle + "rad)";
    });
  }
  Events.on(engine, "afterUpdate", syncDom);

  var last = performance.now();
  var lastJolt = 0;

  function step(now) {
    // Clamp the delta so a backgrounded tab doesn't teleport everything.
    var delta = Math.min(now - last, TIMESTEP_MS * 3);
    last = now;

    if (shaking && now - lastJolt > JOLT_INTERVAL_MS) {
      lastJolt = now;
      entities.forEach(function (entity) {
        Body.setVelocity(entity.body, {
          x: (Math.random() - 0.5) * 22,
          y: (Math.random() - 0.5) * 22
        });
        Body.setAngularVelocity(entity.body, (Math.random() - 0.5) * 0.2);
      });
    }

    Engine.update(engine, delta);
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  window.addEventListener("resize", function () {
    var next = container.getBoundingClientRect();
    var scaleX = next.width / viewport.width;
    var scaleY = next.height / viewport.height;
    viewport = { width: next.width, height: next.height };

    Composite.remove(engine.world, walls);
    walls = createWalls(viewport.width, viewport.height);
    Composite.add(engine.world, walls);

    // Keep everything proportionally in view instead of stranding bodies
    // outside the new bounds.
    entities.forEach(function (entity) {
      Body.setPosition(entity.body, {
        x: entity.body.position.x * scaleX,
        y: entity.body.position.y * scaleY
      });
    });
    syncDom();
  });

  // --- Butterfly burst -----------------------------------------------------

  function spawnSparkles(x, y) {
    var layer = document.createElement("div");
    layer.className = "burst";
    layer.style.transform = "translate3d(" + x + "px, " + y + "px, 0)";

    for (var i = 0; i < SPARKLE_COUNT; i += 1) {
      var angle = (i / SPARKLE_COUNT) * Math.PI * 2;
      var distance = 44 + (i % 3) * 22;
      var shard = document.createElement("span");
      shard.className = "sparkle";
      shard.style.setProperty("--sparkle-x", Math.cos(angle) * distance + "px");
      shard.style.setProperty("--sparkle-y", Math.sin(angle) * distance + "px");
      shard.style.animationDelay = (i % 4) * 30 + "ms";
      layer.appendChild(shard);
    }

    container.appendChild(layer);
    window.setTimeout(function () {
      layer.remove();
    }, 900);
  }

  /** Pop a butterfly into sparkles, then let it flutter back in somewhere new. */
  function burst(entity) {
    if (entity.popped) return;
    entity.popped = true;

    spawnSparkles(entity.body.position.x, entity.body.position.y);
    if (soundOn) sfx.burst();

    entity.node.style.opacity = "0";
    Composite.remove(engine.world, entity.body);

    window.setTimeout(function () {
      var bounds = container.getBoundingClientRect();
      Body.setPosition(entity.body, {
        x: (0.15 + Math.random() * 0.7) * bounds.width,
        y: (0.15 + Math.random() * 0.7) * bounds.height
      });
      Body.setVelocity(entity.body, {
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 5
      });
      Body.setAngularVelocity(entity.body, (Math.random() - 0.5) * 0.03);
      Composite.add(engine.world, entity.body);

      entity.node.style.opacity = "1";
      entity.node.classList.add("respawning");
      if (soundOn) sfx.respawn();
      window.setTimeout(function () {
        entity.node.classList.remove("respawning");
        entity.popped = false;
      }, 400);
    }, 700);
  }

  // A click is a press that barely moved — anything else is a drag/fling.
  var press = null;

  entities.forEach(function (entity, id) {
    if (id.indexOf("butterfly") !== 0) return;

    entity.node.addEventListener("pointerdown", function (event) {
      press = { x: event.clientX, y: event.clientY, time: performance.now() };
    });

    entity.node.addEventListener("pointerup", function (event) {
      var start = press;
      press = null;
      if (!start) return;
      var moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (moved < 8 && performance.now() - start.time < 400) burst(entity);
    });
  });

  // --- Controls ------------------------------------------------------------

  function renderSoundButton() {
    soundButton.textContent = soundOn ? "sound on" : "sound off";
    soundButton.setAttribute("aria-pressed", String(soundOn));
    soundButton.title = soundOn ? "Turn sound effects off" : "Turn sound effects on";
  }

  soundButton.addEventListener("click", function () {
    soundOn = !soundOn;
    window.localStorage.setItem(SOUND_STORAGE_KEY, soundOn ? "on" : "off");
    renderSoundButton();
    if (soundOn) sfx.respawn();
  });
  renderSoundButton();

  /** Toggle a continuous snow-globe shake; toggling off calms everything down. */
  shakeButton.addEventListener("click", function () {
    shaking = !shaking;
    shakeButton.textContent = shaking ? "calm the world" : "shake the world";
    shakeButton.setAttribute("aria-pressed", String(shaking));
    if (soundOn) sfx.shake(shaking);

    if (shaking) return;
    // Back to a gentle drift.
    entities.forEach(function (entity) {
      Body.setVelocity(entity.body, {
        x: (Math.random() - 0.5) * 2.4,
        y: (Math.random() - 0.5) * 2.4
      });
      Body.setAngularVelocity(entity.body, (Math.random() - 0.5) * 0.012);
    });
  });
})();
