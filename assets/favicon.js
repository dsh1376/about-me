(() => {
  const icon = document.querySelector('link[rel="icon"]');
  const original = icon.getAttribute("href");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const printing = matchMedia("print");
  const image = new Image();
  const frameCount = 48;
  const cycleDuration = 7200;
  let frames = [];
  let timer = null;

  function restore() {
    if (timer !== null) clearInterval(timer);
    timer = null;
    icon.setAttribute("href", original);
    icon.type = "image/svg+xml";
    icon.setAttribute("sizes", "any");
  }

  function sync() {
    restore();
    if (!frames.length || document.hidden || reducedMotion.matches || printing.matches) return;
    let index = 0;
    icon.type = "image/png";
    icon.setAttribute("sizes", "32x32");
    icon.href = frames[index];
    timer = setInterval(() => {
      index = (index + 1) % frames.length;
      icon.href = frames[index];
    }, cycleDuration / frameCount);
  }

  image.addEventListener("load", () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.imageSmoothingEnabled = false;
    frames = Array.from({ length: frameCount }, (_, index) => {
      context.clearRect(0, 0, 32, 32);
      const phase = index / frameCount * Math.PI * 2;
      context.drawImage(image, 0, Math.sin(phase) * 0.8, 32, 32);
      // One short glint per float cycle keeps the small icon legible.
      const glint = Math.max(0, 1 - Math.abs(index - 12) / 4);
      if (glint > 0) {
        context.globalAlpha = glint;
        context.fillStyle = "#f5db9a";
        context.fillRect(28, 2, 1, 5);
        context.fillRect(26, 4, 5, 1);
        context.globalAlpha = 1;
      }
      return canvas.toDataURL("image/png");
    });
    sync();
  }, { once: true });
  image.addEventListener("error", () => console.error("Could not load the Clawd favicon."), { once: true });
  document.addEventListener("visibilitychange", sync);
  reducedMotion.addEventListener("change", sync);
  printing.addEventListener("change", sync);
  addEventListener("pagehide", restore);
  addEventListener("pageshow", sync);
  image.src = original;
})();
