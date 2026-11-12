// oneko.js: https://github.com/adryd325/oneko.js
//
// Modified version: click the cat to cycle through its behaviours.
//   1. follow cursor  ->  2. run away from cursor  ->  3. wander freely
//   ->  4. stay put  ->  5. go home (the empty space after the last nav item)
//   ->  back to 1.
//   While wandering, the cat also walks back home from time to time.

(function oneko() {
  const isReducedMotion =
    window.matchMedia(`(prefers-reduced-motion: reduce)`) === true ||
    window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;

  if (isReducedMotion) return;

  const nekoEl = document.createElement("div");
  const labelEl = document.createElement("div");
  let persistPosition = true;

  let nekoPosX = 32;
  let nekoPosY = 32;

  let mousePosX = 0;
  let mousePosY = 0;
  let mouseSeen = false; // true once a real mousemove has happened
  let hovered = false; // true while a mouse pointer is over the cat
  let atHome = false; // true while the cat sits at home, glued to the nav
  let homeEl = null;

  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation = null;
  let idleAnimationFrame = 0;

  // Size of the cat: 1 = original (32px), 2 = double (64px), 3 = triple...
  // Whole numbers keep the pixel art sharp.
  const catScale = 2;
  const half = 16 * catScale; // half the cat's on-screen size

  // Behaviours (click the cat to go to the next one)
  const MODE_FOLLOW = 0;
  const MODE_FLEE = 1;
  const MODE_WANDER = 2;
  const MODE_STAY = 3;
  const MODE_HOME = 4;
  const modeLabels = [
    "following cursor",
    "running away",
    "wandering",
    "staying put",
    "going home",
  ];
  let mode = MODE_FOLLOW;

  let wanderTarget = null;
  let wanderPause = 0;
  let labelTimeout = null;

  const nekoSpeed = 17;
  const followDistance = 12; // how close the cat gets to the cursor point
  const fleeSpeed = 19;
  const fleeRadius = 160; // the cat only runs when the cursor is this close
  const wanderSpeed = 14;

  // "Home" sits in the empty part of the nav bar, right after the element
  // matched by this selector (the last menu item). If something follows that
  // item in the bar (like a small image), home is halfway between the two.
  // :last-of-type (not :last-child) so a trailing <img> doesn't break it.
  const homeSelector = ".menu ul > li:last-of-type";
  const homeBias = 0.7; // 0.5 = middle of the gap, 1 = right against the image
  const homeChance = 0.3; // chance that a wander trip goes home (0 = never)
  const homeRest = 80; // minimum rest at home, in frames (10 frames = 1 s)

  const spriteSets = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [
      [-5, 0],
      [-6, 0],
      [-7, 0],
    ],
    scratchWallN: [
      [0, 0],
      [0, -1],
    ],
    scratchWallS: [
      [-7, -1],
      [-6, -2],
    ],
    scratchWallE: [
      [-2, -2],
      [-2, -3],
    ],
    scratchWallW: [
      [-4, 0],
      [-4, -1],
    ],
    tired: [[-3, -2]],
    sleeping: [
      [-2, 0],
      [-2, -1],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
  };

  function init() {
    let nekoFile = "./oneko.gif"
    const curScript = document.currentScript
    if (curScript && curScript.dataset.cat) {
      nekoFile = curScript.dataset.cat
    }
    if (curScript && curScript.dataset.persistPosition) {
      if (curScript.dataset.persistPosition === "") {
        persistPosition = true;
      } else {
        persistPosition = JSON.parse(curScript.dataset.persistPosition.toLowerCase());
      }
    }

    if (persistPosition) {
      let storedNeko = JSON.parse(window.localStorage.getItem("oneko"));
      if (storedNeko !== null) {
        nekoPosX = storedNeko.nekoPosX;
        nekoPosY = storedNeko.nekoPosY;
        mousePosX = storedNeko.mousePosX;
        mousePosY = storedNeko.mousePosY;
        frameCount = storedNeko.frameCount;
        idleTime = storedNeko.idleTime;
        idleAnimation = storedNeko.idleAnimation;
        idleAnimationFrame = storedNeko.idleAnimationFrame;
        nekoEl.style.backgroundPosition = storedNeko.bgPos;
        if (
          Number.isInteger(storedNeko.mode) &&
          storedNeko.mode >= 0 &&
          storedNeko.mode < modeLabels.length
        ) {
          mode = storedNeko.mode;
        }
      }
    }

    nekoEl.id = "oneko";
    nekoEl.ariaHidden = true;
    nekoEl.style.width = "32px";
    nekoEl.style.height = "32px";
    nekoEl.style.position = "fixed";
    nekoEl.style.pointerEvents = "auto"; // the cat has to be clickable now
    nekoEl.style.cursor = "pointer";
    nekoEl.style.imageRendering = "pixelated";
    nekoEl.style.transform = `scale(${catScale})`; // scales around the centre
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
    nekoEl.style.zIndex = 2147483647;

    nekoEl.style.backgroundImage = `url(${nekoFile})`;

    // Small speech bubble that shows the new behaviour after a click.
    // Sizes are divided by catScale so it stays readable at any cat size.
    labelEl.style.cssText =
      "position:absolute;left:50%;transform:translateX(-50%);" +
      "white-space:nowrap;pointer-events:none;opacity:0;" +
      "transition:opacity .2s;" +
      `padding:${2 / catScale}px ${6 / catScale}px;` +
      `border-radius:${4 / catScale}px;` +
      `font:${11 / catScale}px/1.3 monospace;` +
      "color:#fff;background:rgba(0,0,0,.75);";
    nekoEl.appendChild(labelEl);

    document.body.appendChild(nekoEl);

    document.addEventListener("mousemove", function (event) {
      mouseSeen = true;
      mousePosX = event.clientX;
      mousePosY = event.clientY;
    });

    // While running away or wandering, hold still when a mouse is over the
    // cat so it can always be clicked (mouse only: touch screens never fire
    // a reliable "leave").
    nekoEl.addEventListener("pointerenter", function (event) {
      if (event.pointerType === "mouse") hovered = true;
    });
    nekoEl.addEventListener("pointerleave", function () {
      hovered = false;
    });

    nekoEl.addEventListener("click", function () {
      let next = (mode + 1) % modeLabels.length;
      // skip "go home" on pages that have no nav to sit in
      if (next === MODE_HOME && getHome() === null) {
        next = (next + 1) % modeLabels.length;
      }
      setMode(next);
    });

    // The cat is position:fixed but home scrolls with the page, so keep a
    // resting cat glued to the nav while scrolling or resizing.
    window.addEventListener("scroll", stayPinned, { passive: true, capture: true });
    window.addEventListener("resize", stayPinned);

    if (persistPosition) {
      window.addEventListener("beforeunload", function (event) {
        window.localStorage.setItem("oneko", JSON.stringify({
          nekoPosX: clampX(nekoPosX),
          nekoPosY: clampY(nekoPosY),
          mousePosX: mousePosX,
          mousePosY: mousePosY,
          frameCount: frameCount,
          idleTime: idleTime,
          idleAnimation: idleAnimation,
          idleAnimationFrame: idleAnimationFrame,
          bgPos: nekoEl.style.backgroundPosition,
          mode: mode
        }));
      });
    }

    window.requestAnimationFrame(onAnimationFrame);
  }

  function setMode(newMode) {
    mode = newMode;
    atHome = false;
    wanderTarget = null;
    wanderPause = 0;
    resetIdleAnimation();
    showLabel(modeLabels[mode]);
  }

  function showLabel(text) {
    labelEl.textContent = text;
    // show the bubble below the cat when it is too close to the top edge
    if (nekoPosY < half + 18 * catScale) {
      labelEl.style.top = "36px";
      labelEl.style.bottom = "auto";
    } else {
      labelEl.style.bottom = "36px";
      labelEl.style.top = "auto";
    }
    labelEl.style.opacity = "1";
    clearTimeout(labelTimeout);
    labelTimeout = setTimeout(function () {
      labelEl.style.opacity = "0";
    }, 1200);
  }

  let lastFrameTimestamp;

  function onAnimationFrame(timestamp) {
    // Stops execution if the neko element is removed from DOM
    if (!nekoEl.isConnected) {
      return;
    }
    if (!lastFrameTimestamp) {
      lastFrameTimestamp = timestamp;
    }
    if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      frame();
    }
    window.requestAnimationFrame(onAnimationFrame);
  }

  function setSprite(name, frame) {
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;

    // every ~ 20 seconds
    if (
      idleTime > 10 &&
      Math.floor(Math.random() * 200) == 0 &&
      idleAnimation == null
    ) {
      let avalibleIdleAnimations = ["sleeping", "scratchSelf"];
      if (nekoPosX < half * 2) {
        avalibleIdleAnimations.push("scratchWallW");
      }
      if (nekoPosY < half * 2) {
        avalibleIdleAnimations.push("scratchWallN");
      }
      if (nekoPosX > window.innerWidth - half * 2) {
        avalibleIdleAnimations.push("scratchWallE");
      }
      if (nekoPosY > window.innerHeight - half * 2) {
        avalibleIdleAnimations.push("scratchWallS");
      }
      idleAnimation =
        avalibleIdleAnimations[
          Math.floor(Math.random() * avalibleIdleAnimations.length)
        ];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) {
          resetIdleAnimation();
        }
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) {
          resetIdleAnimation();
        }
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimationFrame += 1;
  }

  function clampX(x) {
    return Math.min(Math.max(half, x), window.innerWidth - half);
  }

  function clampY(y) {
    return Math.min(Math.max(half, y), window.innerHeight - half);
  }

  // Called just before moving: ends any idle animation and, if the cat was
  // idle, plays the "alert" pose for a few frames first.
  // Returns true while the cat is still alerting (i.e. must not move yet).
  function alerting() {
    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      // count down after being alerted before moving
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return true;
    }
    return false;
  }

  // Move one step in the direction of the unit vector (ux, uy).
  // free = true lets the cat walk out of the window (used to go home).
  function walk(ux, uy, speed, free) {
    let direction = "";
    direction += uy < -0.5 ? "N" : "";
    direction += uy > 0.5 ? "S" : "";
    direction += ux < -0.5 ? "W" : "";
    direction += ux > 0.5 ? "E" : "";
    setSprite(direction, frameCount);

    nekoPosX += ux * speed;
    nekoPosY += uy * speed;
    if (!free) {
      nekoPosX = clampX(nekoPosX);
      nekoPosY = clampY(nekoPosY);
    }

    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }

  // Walk towards (targetX, targetY). Returns true once the cat has arrived.
  function chase(targetX, targetY, speed, stopDistance, free) {
    const diffX = targetX - nekoPosX;
    const diffY = targetY - nekoPosY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (distance < speed || distance < stopDistance) {
      idle();
      return true;
    }

    if (alerting()) return false;

    walk(diffX / distance, diffY / distance, speed, free);
    return false;
  }

  // Run away from the cursor when it gets close
  function flee() {
    const diffX = nekoPosX - mousePosX;
    const diffY = nekoPosY - mousePosY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (!mouseSeen || distance > fleeRadius) {
      idle();
      return;
    }

    if (alerting()) return;

    const ux = distance > 0 ? diffX / distance : 1;
    const uy = distance > 0 ? diffY / distance : 0;

    // Straight away from the cursor first; if a wall is in the way, the two
    // sideways options let the cat slide along it instead of getting stuck.
    const candidates = [
      [ux, uy],
      [-uy, ux],
      [uy, -ux],
    ];
    let best = null;
    let bestScore = -Infinity;
    for (const [cx, cy] of candidates) {
      const nx = clampX(nekoPosX + cx * fleeSpeed);
      const ny = clampY(nekoPosY + cy * fleeSpeed);
      const moved = Math.hypot(nx - nekoPosX, ny - nekoPosY);
      if (moved < fleeSpeed * 0.6) continue; // blocked by a wall
      const score = Math.hypot(nx - mousePosX, ny - mousePosY);
      if (score > bestScore) {
        bestScore = score;
        best = [cx, cy];
      }
    }

    if (best) {
      walk(best[0], best[1], fleeSpeed);
    } else {
      idle(); // completely cornered
    }
  }

  // Viewport position of home: the empty part of the nav bar just after its
  // last item. Returns null if the page has no such nav.
  function getHome() {
    if (!homeEl || !homeEl.isConnected) {
      homeEl = document.querySelector(homeSelector);
    }
    if (!homeEl || !homeEl.parentElement) return null;
    const item = homeEl.getBoundingClientRect();
    if (item.width === 0 && item.height === 0) return null; // hidden nav
    const next = homeEl.nextElementSibling;
    if (next) {
      // something sits after the last item: home is between the two
      const after = next.getBoundingClientRect();
      return {
        x: item.right + (after.left - item.right) * homeBias,
        y: item.top + item.height / 2,
      };
    }
    const bar = homeEl.parentElement.getBoundingClientRect();
    const middle = (item.right + bar.right) / 2;
    return {
      x: Math.max(middle, item.right + half), // never sit on top of the link
      y: item.top + item.height / 2,
    };
  }

  function homeInView(h) {
    return (
      h.x >= half &&
      h.x <= window.innerWidth - half &&
      h.y >= half &&
      h.y <= window.innerHeight - half
    );
  }

  function pinTo(h) {
    nekoPosX = h.x;
    nekoPosY = h.y;
    nekoEl.style.left = `${nekoPosX - 16}px`;
    nekoEl.style.top = `${nekoPosY - 16}px`;
  }

  // Keep a cat that is resting at home glued to the nav as the page moves
  function stayPinned() {
    if (!atHome) return;
    const h = getHome();
    if (h) {
      pinTo(h);
    } else {
      atHome = false;
    }
  }

  // If the cat has reached home, sit there. Returns true when it did.
  function settleAtHome(h) {
    if (Math.hypot(h.x - nekoPosX, h.y - nekoPosY) > half) return false;
    atHome = true;
    pinTo(h);
    return true;
  }

  function offscreen(x, y) {
    return (
      x < -half ||
      x > window.innerWidth + half ||
      y < -half ||
      y > window.innerHeight + half
    );
  }

  // Walk towards home. If home is scrolled out of view the cat walks off the
  // screen towards it and settles at home once it is out of sight, instead of
  // stopping at the edge of the window. Returns true once the cat is home.
  function walkHome(h, speed) {
    if (offscreen(nekoPosX, nekoPosY)) {
      atHome = true;
      pinTo(h);
      return true;
    }
    if (chase(h.x, h.y, speed, 0, true)) {
      return settleAtHome(h);
    }
    return false;
  }

  // "Go home" mode: walk home, then stay there
  function goHome() {
    const h = getHome();
    if (h === null || atHome) {
      idle(); // no nav on this page, or already home (stayPinned holds it)
      return;
    }
    walkHome(h, nekoSpeed);
  }

  // Walk to random spots, resting for a few seconds at each one.
  // Sometimes the spot is home, where the cat rests for much longer.
  function wander() {
    if (wanderPause > 0) {
      wanderPause -= 1;
      idle();
      return;
    }

    // A cat resting at home stays there while home is scrolled out of view
    if (atHome && wanderTarget === null) {
      const h = getHome();
      if (h !== null && !homeInView(h)) {
        idle();
        return;
      }
    }

    if (wanderTarget === null) {
      atHome = false; // the cat is leaving home, if it was there
      const h = getHome();
      if (h !== null && homeInView(h) && Math.random() < homeChance) {
        wanderTarget = { home: true, x: h.x, y: h.y };
      } else {
        wanderTarget = {
          home: false,
          x: half + Math.random() * (window.innerWidth - half * 2),
          y: half + Math.random() * (window.innerHeight - half * 2),
        };
      }
    }

    let arrived;
    if (wanderTarget.home) {
      // the nav moves when the page scrolls, so use home's current position
      const h = getHome();
      if (h === null) {
        wanderTarget = null;
        idle();
        return;
      }
      arrived = walkHome(h, wanderSpeed);
    } else {
      // clamp again in case the window was resized since the target was picked
      arrived = chase(
        clampX(wanderTarget.x),
        clampY(wanderTarget.y),
        wanderSpeed,
        0
      );
    }
    if (arrived) {
      let rest = 20 + Math.floor(Math.random() * 60); // ~2 to 8 seconds
      if (wanderTarget.home) {
        rest = homeRest + Math.floor(Math.random() * 120); // ~8 to 20 s
      }
      wanderTarget = null;
      wanderPause = rest;
    }
  }

  function frame() {
    frameCount += 1;
    stayPinned();

    if (mode === MODE_STAY) {
      idle();
      return;
    }

    // While running away or wandering, hold still when the cursor is on the
    // cat so it can be clicked. When following, the cat keeps closing in on
    // the cursor point instead.
    if (hovered && mode !== MODE_FOLLOW) {
      idle();
      return;
    }

    switch (mode) {
      case MODE_FOLLOW:
        chase(mousePosX, mousePosY, nekoSpeed, followDistance);
        break;
      case MODE_FLEE:
        flee();
        break;
      case MODE_WANDER:
        wander();
        break;
      case MODE_HOME:
        goHome();
        break;
    }
  }

  init();
})();