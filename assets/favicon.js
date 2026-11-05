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
      context.drawImage(image, 0, 0, 32, 32);
      // Two staggered wisps rise from the tea without moving the character.
      context.fillStyle = "#a8a69d";
      for (let wisp = 0; wisp < 2; wisp++) {
        const progress = (index / frameCount * 2 + wisp / 2) % 1;
        const x = 24 + wisp * 3;
        const y = Math.round(12 - progress * 8);
        context.globalAlpha = Math.sin(progress * Math.PI) * 0.8;
        context.fillRect(x, y, 1, 3);
        context.fillRect(x + 1, y - 1, 1, 2);
      }
      context.globalAlpha = 1;
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
