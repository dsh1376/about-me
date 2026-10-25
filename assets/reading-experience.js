/*
 * Reading rail and space scene adapted from claude.dev, snapshot 2026-10-24.
 * Rail: https://claude.dev/_next/static/chunks/1wedp2-9-x3wj.js
 * Space field: https://claude.dev/_next/static/chunks/0zmscu3b1ocf1.js
 * Clawd frames: https://claude.dev/_next/static/chunks/3o01xgcny9qbw.js
 * clawd-astronaut.png contains the original 131 frames, decoded without resampling.
 */
(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const printing = matchMedia("print");
  const resume = document.querySelector(".resume");
  const headings = [...resume.querySelectorAll(".section-title")];
  const links = [...document.querySelectorAll(".reading-tree a")];
  const meter = document.querySelector(".reading-progress");
  const fill = document.querySelector(".reading-progress-fill");
  const rest = document.querySelector(".reading-progress-rest");
  const value = document.querySelector(".reading-progress-value");
  const topProgress = document.querySelector(".reading-top-progress");
  const readingTime = document.querySelector(".reading-time");
  const meterMeasure = document.createElement("canvas").getContext("2d");
  let progressCells = 28;
  let readingFrame = null;

  function updateReading() {
    readingFrame = null;
    const end = resume.getBoundingClientRect().bottom + scrollY - innerHeight;
    const progress = Math.max(0, Math.min(1, scrollY / Math.max(1, end)));
    const percent = Math.round(progress * 100);
    const cells = Math.round(progress * progressCells);
    fill.textContent = "▓".repeat(cells);
    rest.textContent = "░".repeat(progressCells - cells);
    value.textContent = `${String(percent).padStart(2, "0")}%`;
    meter.setAttribute("aria-valuenow", percent);
    topProgress.style.transform = `scaleX(${progress})`;

    let current = 0;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top < innerHeight * 0.4) current = index;
    });
    links.forEach((link, index) => {
      if (index === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function scheduleReading() {
    if (readingFrame === null) readingFrame = requestAnimationFrame(updateReading);
  }

  function fitReadingMeter() {
    if (!meter.clientWidth || !meterMeasure) return;
    const style = getComputedStyle(meter);
    meterMeasure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const glyphWidth = Math.max(meterMeasure.measureText("░").width, meterMeasure.measureText("▓").width);
    const available = meter.clientWidth - meterMeasure.measureText("100%").width - parseFloat(style.columnGap);
    const next = Math.max(1, Math.min(28, Math.floor(available / glyphWidth)));
    if (next === progressCells) return;
    progressCells = next;
    scheduleReading();
  }

  function updateReadingTime() {
    const text = resume.textContent;
    const han = text.match(/\p{Script=Han}/gu)?.length || 0;
    const words = text.replace(/\p{Script=Han}/gu, " ").match(/[\p{L}\p{N}]+/gu)?.length || 0;
    const minutes = Math.max(1, Math.ceil(han / 450 + words / 220));
    readingTime.textContent = document.documentElement.lang === "en"
      ? `${minutes} MIN READ`
      : `${minutes} 分钟阅读`;
    scheduleReading();
  }

  addEventListener("scroll", scheduleReading, { passive: true });
  addEventListener("resize", scheduleReading);
  addEventListener("hashchange", scheduleReading);
  links.forEach((link, index) => {
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      headings[index].scrollIntoView({ behavior: event.detail && !reducedMotion.matches ? "smooth" : "instant", block: "start" });
      history.pushState(null, "", link.getAttribute("href"));
      scheduleReading();
    });
  });
  new ResizeObserver(scheduleReading).observe(resume);
  new ResizeObserver(fitReadingMeter).observe(meter);
  new MutationObserver(updateReadingTime).observe(document.documentElement, { attributeFilter: ["lang"] });
  document.fonts.ready.then(scheduleReading);
  document.fonts.ready.then(fitReadingMeter);
  updateReadingTime();
  updateReading();

  const scene = document.querySelector(".space-scene");
  const sky = scene.querySelector(".space-sky");
  const actor = scene.querySelector(".space-clawd");
  const stars = sky.getContext("2d");
  const clawd = actor.getContext("2d");
  if (!stars || !clawd) return;

  const sprite = new Image();
  sprite.src = new URL("clawd-astronaut.png", document.currentScript.src).href;
  sprite.addEventListener("error", () => console.error("Could not load the Clawd astronaut sprite."));
  const seed = Math.random() * 0xffffffff | 0;
  const spacing = 9;
  const pixelSize = 2.7;
  const actorWidth = 40 * pixelSize;
  const actorHeight = 33 * pixelSize;
  const shots = [];
  let width = 0;
  let height = 0;
  let visible = false;
  let frame = null;
  let lastTime = null;
  let started = null;
  let fieldTime = 0;
  let actorX = 0.5;
  let actorY = 0.58;
  let velocityX = 0;
  let velocityY = 0;
  let rotation = 0;
  let pointer = null;
  let dotColor;
  let shotColor;

  function hash(x, y, salt) {
    let result = 0x165667b1 * x + 0x27d4eb2f * y + 69069 * salt | 0;
    result = Math.imul(result ^ result >>> 13, 0x4bf19f61);
    return ((result ^ result >>> 16) >>> 0) / 0x100000000;
  }

  function smooth(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  }

  function noise(x, y, salt, scale) {
    const gx = x / scale;
    const gy = y / scale;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    const fx = smooth(gx - ix);
    const fy = smooth(gy - iy);
    const top = hash(ix, iy, salt) + (hash(ix + 1, iy, salt) - hash(ix, iy, salt)) * fx;
    const bottom = hash(ix, iy + 1, salt) + (hash(ix + 1, iy + 1, salt) - hash(ix, iy + 1, salt)) * fx;
    return top + (bottom - top) * fy;
  }

  function morph(x, y, salt, scale, time) {
    const tick = Math.floor(time);
    const first = noise(x, y, salt ^ Math.imul(tick, 0x9e3779b1), scale);
    return first + (noise(x, y, salt ^ Math.imul(tick + 1, 0x9e3779b1), scale) - first) * smooth(time - tick);
  }

  function dot(x, y, radius, color = dotColor) {
    stars.fillStyle = color;
    stars.beginPath();
    stars.arc(x, y, radius, 0, Math.PI * 2);
    stars.fill();
  }

  function drawStars(delta, progress) {
    stars.clearRect(0, 0, width, height);
    if (progress <= 0) return;
    const low = 0.62 - progress * 0.34 * 0.42;
    const high = low + 0.34 - 0.22 * 0.5;
    const smallRadius = spacing * 0.15;
    const largeRadius = spacing * 0.267;
    const size = Math.min(width, height);
    const moonRadius = Math.min(Math.max(52, 0.115 * size), 0.3 * size);
    const moonX = Math.max(width * 0.14, moonRadius * 1.1);
    const moonY = Math.max(height * 0.3, moonRadius * 1.1);
    const cutoutRadius = 0.92 * moonRadius;
    const planetRadius = Math.min(Math.max(60, 0.15 * size), 0.19 * size);
    const planetX = width * 0.8;
    const planetY = height - planetRadius * 0.66;
    const ringWidth = 1.75 * planetRadius;
    const ringHeight = 0.32 * planetRadius;

    function planet(x, y, column, row) {
      const mx = x - moonX;
      const my = y - moonY;
      const distanceSquared = mx * mx + my * my;
      if (distanceSquared < moonRadius ** 2) {
        const cutoutDistance = Math.hypot(x - (moonX + moonRadius * 0.45), my);
        if (cutoutDistance >= cutoutRadius) {
          return moonRadius - Math.sqrt(distanceSquared) > Math.max(moonRadius * 0.12, spacing * 0.9)
            && cutoutDistance - cutoutRadius > Math.max(cutoutRadius * 0.18, spacing * 0.9) ? 2 : 1;
        }
      }
      if (distanceSquared < (2.2 * moonRadius) ** 2) {
        const distance = Math.sqrt(distanceSquared) / moonRadius;
        if (distance < 1.4 || hash(column, row, 12295 ^ seed) > smooth((distance - 1.4) / 0.8)) return 0;
      }
      const px = x - planetX;
      const py = y - planetY;
      const distance = Math.hypot(px, py);
      const rx = 0.9492354180824408 * px + 0.31456656061611776 * py;
      const ry = -0.31456656061611776 * px + 0.9492354180824408 * py;
      const ringDistance = Math.hypot(rx / ringWidth, ry / ringHeight);
      const inRing = ringDistance > 0.8 && ringDistance < 1.2;
      function ring() {
        const edge = Math.abs(rx) / ringWidth;
        if (edge > 0.9 && hash(column, row, 37191 ^ seed) < (edge - 0.9) / 0.1 * 0.9) return 0;
        return Math.abs(ringDistance - 1) < 0.16 ? 2 : 1;
      }
      if (inRing && ry > 0) {
        const value = ring();
        if (value) return value;
      }
      if (ry > 0 && distance < planetRadius && ringDistance > 0.66 && ringDistance < 1.34) return 0;
      if (distance < planetRadius) {
        const edge = 1 - distance / planetRadius;
        if (edge < 0.05 && hash(column, row, 1812 ^ seed) > (edge / 0.05) ** 1.4) return 0;
        if (planetRadius - distance < Math.max(planetRadius * 0.1, spacing * 0.9)) return 1;
        const light = 0.5 * (-px / planetRadius * 0.28 - py / planetRadius * 0.82) + 0.5
          + (morph(column, row, 2458 ^ seed, 3.1, 0) - 0.5) * 0.35;
        return light < 0.18 ? 0 : light > 0.82 ? 2 : 1;
      }
      if (inRing) {
        const value = ring();
        if (value) return value;
      }
      const halo = Math.min(distance / (1.18 * planetRadius), ringDistance / 1.24);
      return halo < 1.32 && (halo < 1 || hash(column, row, 30634 ^ seed) > smooth((halo - 1) / 0.32)) ? 0 : -1;
    }

    const rect = progress > 0.25 ? actorRect() : null;
    for (let row = 0, y = height % spacing / 2 + spacing / 2; y < height; row++, y += spacing) {
      for (let column = 0, x = width % spacing / 2 + spacing / 2; x < width; column++, x += spacing) {
        const shape = progress > 0.12 ? planet(x, y, column, row) : -1;
        if (shape === 0 || shape < 0 && hash(column, row, 170 ^ seed) > 1.15 * progress * (0.2 + y / height * 0.8)) continue;
        if (rect) {
          const distance = Math.max(
            Math.max(0, rect.left - x, x - rect.left - rect.w),
            Math.max(0, rect.top + 2 * spacing - y, y - rect.top - rect.h)
          ) / spacing;
          if (distance <= 7 && hash(column, row, 3098 ^ seed) > smooth((distance - 1) / 6)) continue;
        }
        if (shape > 0) {
          dot(x, y, shape === 2 ? largeRadius : smallRadius);
          continue;
        }
        const pattern = noise(column, row, 273 ^ seed, 8.4);
        const cloud = morph(column, row, 546 ^ seed, 0.63 * 8.4, fieldTime * 0.5);
        const texture = pattern < 0.38 ? morph(column / 9, row / 1.3, 819 ^ seed, 1, fieldTime)
          : pattern < 0.52 ? morph(column / 1.3, row / 9, 1092 ^ seed, 1, fieldTime)
          : pattern < 0.62 ? morph((column + row) / 7, (column - row) / 1.4, 1365 ^ seed, 1, fieldTime)
          : morph(column, row, 1638 ^ seed, 2.6, fieldTime);
        const density = (0.74 * texture + 0.2 * hash(column, row, 2184 ^ seed)) * (0.12 + 1.15 * cloud ** 1.5);
        const sparkle = hash(column, row, 1911 ^ seed);
        if (density < low) {
          if (sparkle > 0.988) dot(x, y, smallRadius * (0.7 + 25 * (sparkle - 0.988)));
          continue;
        }
        const amount = smooth((density - low) / Math.max(0.0001, high - low));
        let radius = 0.6 + (largeRadius - 0.6) * amount;
        if (sparkle > 0.9985) radius += 1.2 * (0.5 + 0.5 * amount);
        if (radius >= 0.45) dot(x, y, radius);
      }
    }
    for (let index = shots.length - 1; index >= 0; index--) {
      const shot = shots[index];
      shot.time += delta;
      if (shot.time >= shot.life) {
        shots.splice(index, 1);
        continue;
      }
      const fade = Math.min(1, shot.time / (0.25 * shot.life)) * Math.min(1, (shot.life - shot.time) / (0.4 * shot.life));
      const length = Math.hypot(shot.vx, shot.vy);
      let previousX = null;
      let previousY = null;
      for (let tail = 0; tail < 9; tail++) {
        const offsetX = width % spacing / 2 + spacing / 2;
        const offsetY = height % spacing / 2 + spacing / 2;
        const x = offsetX + Math.round((shot.x + shot.vx * shot.time - shot.vx / length * spacing * tail - offsetX) / spacing) * spacing;
        const y = offsetY + Math.round((shot.y + shot.vy * shot.time - shot.vy / length * spacing * tail - offsetY) / spacing) * spacing;
        if (x === previousX && y === previousY) continue;
        previousX = x;
        previousY = y;
        if (x < -20 || x > width + 20 || y < -20 || y > height + 20) continue;
        if (rect && x > rect.left - spacing && x < rect.left + rect.w + spacing
          && y > rect.top - spacing && y < rect.top + rect.h + spacing) continue;
        const radius = (tail === 0 ? 0.267 * spacing : 0.15 * spacing * (1 - tail / 12)) * fade;
        if (radius >= 0.4) dot(x, y, radius, shotColor);
      }
    }
  }

  function actorRect() {
    return { left: actorX * width - actorWidth / 2, top: actorY * height - actorHeight / 2, w: actorWidth, h: actorHeight };
  }

  function drawClawd(elapsed, delta, progress) {
    clawd.clearRect(0, 0, width, height);
    if (!sprite.complete || !sprite.naturalWidth || progress <= 0.25) return;
    if (!reducedMotion.matches) {
      const targetX = (pointer ? Math.max(0.1, Math.min(0.9, pointer.x)) : 0.5)
        + 0.028 * Math.sin(0.45 * elapsed) + 0.018 * Math.sin(0.19 * elapsed + 1.7);
      const targetY = (pointer ? Math.max(0.12, Math.min(0.88, pointer.y)) : 0.58)
        + 0.045 * Math.sin(0.62 * elapsed + 0.8) + 0.03 * Math.sin(0.27 * elapsed + 2.4);
      velocityX += ((targetX - actorX) * 0.12 - 0.8 * velocityX) * delta;
      velocityY += ((targetY - actorY) * 0.12 - 0.8 * velocityY) * delta;
      actorX += velocityX * delta;
      actorY += velocityY * delta;
      rotation += (Math.max(-8, Math.min(8, 55 * velocityX)) - rotation) * (1 - Math.exp(-4 * delta));
    }
    const frameIndex = reducedMotion.matches ? 30 : 30 + Math.floor(elapsed * 12) % (98 - 30);
    clawd.save();
    clawd.translate(actorX * width, actorY * height);
    clawd.rotate(rotation * Math.PI / 180);
    if (!reducedMotion.matches) clawd.translate(0, 4 * Math.sin(1.1 * elapsed));
    clawd.drawImage(sprite, frameIndex * 40, 0, 40, 33, -actorWidth / 2, -actorHeight / 2, actorWidth, actorHeight);
    clawd.restore();
  }

  function draw(now) {
    const delta = lastTime === null || reducedMotion.matches ? 0 : Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    const rect = scene.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - rect.top) / (0.85 * rect.height)));
    if (started === null && progress > 0.25) {
      started = now;
      actor.classList.add("is-visible");
    }
    const elapsed = reducedMotion.matches || started === null ? 0 : (now - started) / 1000;
    if (!reducedMotion.matches) fieldTime += delta * 0.22;
    drawStars(delta, progress);
    drawClawd(elapsed, delta, progress);
  }

  function animate(now) {
    draw(now);
    frame = requestAnimationFrame(animate);
  }

  function syncScene() {
    const running = visible && !document.hidden && !printing.matches && !reducedMotion.matches;
    if (running && frame === null) {
      lastTime = null;
      frame = requestAnimationFrame(animate);
    } else if (!running && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
    }
    if (visible && !printing.matches) draw(performance.now());
  }

  function syncSceneTheme() {
    const style = getComputedStyle(scene);
    dotColor = style.getPropertyValue("--space-dot").trim();
    shotColor = style.getPropertyValue("--space-shot").trim();
    syncScene();
  }

  function resizeScene() {
    width = scene.clientWidth;
    height = scene.clientHeight;
    const scale = Math.min(2, devicePixelRatio || 1);
    [sky, actor].forEach((canvas) => {
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      canvas.getContext("2d").setTransform(scale, 0, 0, scale, 0, 0);
    });
    clawd.imageSmoothingEnabled = false;
    syncScene();
  }

  scene.addEventListener("pointermove", (event) => {
    const rect = scene.getBoundingClientRect();
    pointer = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  }, { passive: true });
  scene.addEventListener("pointerleave", () => { pointer = null; });
  scene.addEventListener("click", (event) => {
    if (reducedMotion.matches) return;
    const rect = scene.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let y = event.clientY - rect.top;
    const speed = 400 + 220 * Math.random();
    let angle = (28 + 27 * Math.random()) * Math.PI / 180;
    let startX = x;
    let direction = Math.random() < 0.5 ? 1 : -1;
    let life = 1.6;
    if (Math.random() < 0.75) {
      startX = direction === 1 ? -40 : width + 40;
      const distance = Math.abs(x - startX);
      if (y - Math.tan(angle) * distance < 10) angle = Math.max(12 * Math.PI / 180, Math.atan((y - 10) / distance));
      y -= Math.tan(angle) * distance;
      life = 2.4;
    }
    shots.push({ x: startX, y, vx: direction * Math.cos(angle) * speed, vy: Math.sin(angle) * speed, time: 0, life });
    if (shots.length > 12) shots.shift();
  });
  addEventListener("scroll", () => {
    if (visible && reducedMotion.matches && !printing.matches) draw(performance.now());
  }, { passive: true });
  sprite.addEventListener("load", syncScene);
  new ResizeObserver(resizeScene).observe(scene);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncScene();
  }).observe(scene);
  document.addEventListener("visibilitychange", syncScene);
  reducedMotion.addEventListener("change", () => {
    shots.length = 0;
    actorX = 0.5;
    actorY = 0.58;
    velocityX = velocityY = rotation = 0;
    syncScene();
  });
  printing.addEventListener("change", syncScene);
  new MutationObserver(syncSceneTheme).observe(document.documentElement, { attributeFilter: ["class"] });
  syncSceneTheme();
  resizeScene();
})();
