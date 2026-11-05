/*
 * Reading rail adapted from claude.dev, snapshot 2026-10-24.
 * Rail: https://claude.dev/_next/static/chunks/1wedp2-9-x3wj.js
 */
(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
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
})();
