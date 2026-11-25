const modelUrl = new URL('./assets/field-unit.glb', import.meta.url).href;
const stillUrl = new URL('./assets/field-unit.webp', import.meta.url).href;
const contactTime = 420;
const gestureDelay = 5900;
const gestureInterval = 13000;

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(value, high));
const smooth = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

function layer(stage, canvas, styles) {
  const element = document.createElement('div');
  element.setAttribute('aria-hidden', 'true');
  Object.assign(element.style, {
    position: 'absolute',
    pointerEvents: 'none',
    ...styles,
  });
  stage.insertBefore(element, canvas);
  return element;
}

export function mountRobot(stage, canvas) {
  const poster = stage.querySelector('.robot-poster');
  function showStill() {
    poster.src = stillUrl;
  }
  if (poster.complete && poster.naturalWidth === 0) showStill();
  else poster.addEventListener('error', showStill, { once: true });
  const shadow = layer(stage, poster, {
    left: '19%',
    width: '62%',
    height: '9%',
    top: '77%',
    background: 'radial-gradient(ellipse, rgb(0 0 0 / .52), transparent 71%)',
  });
  Object.assign(canvas.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '1',
    visibility: 'hidden',
    pointerEvents: 'none',
  });

  let renderer;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionPreference.matches;
  let visible = true;
  let frame = 0;
  const started = performance.now();
  let targetX = 0;
  let targetY = 0;
  let targetScroll = 0;
  let x = 0;
  let y = 0;
  let scroll = 0;
  let pointerTravel = 0;
  let pointerFrameTime;

  function easePointer(current, target, amount) {
    const next = current + (target - current) * amount;
    return Math.abs(target - next) < .004 ? target : next;
  }

  function positionOnPointer() {
    const sensitivity = reduced ? .78 : 1;
    stage.style.setProperty('--robot-pointer-x', x * pointerTravel * sensitivity + 'px');
    stage.style.setProperty('--robot-pointer-y', y * pointerTravel * sensitivity * .68 + 'px');
    stage.style.setProperty('--robot-pointer-yaw', x * sensitivity * 12 + 'deg');
    stage.style.setProperty('--robot-pointer-pitch', y * sensitivity * -9 + 'deg');
  }

  function activate() {
    if (frame === 0 && visible && (renderer || x !== targetX || y !== targetY)) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    if (x !== targetX || y !== targetY) {
      const elapsed = pointerFrameTime === undefined ? 1000 / 60 : now - pointerFrameTime;
      const amount = 1 - Math.exp(-elapsed / 86);
      x = easePointer(x, targetX, amount);
      y = easePointer(y, targetY, amount);
      pointerFrameTime = x === targetX && y === targetY ? undefined : now;
      positionOnPointer();
    }
    if (!renderer) {
      activate();
      return;
    }
    const gestureTime = now - started - gestureDelay;
    const elapsed = gestureTime < 0 ? gestureTime : gestureTime % gestureInterval;
    const gesture = reduced ? 0 : smooth(elapsed / contactTime) * (1 - smooth((elapsed - contactTime - 106) / 390));
    const flash = reduced || elapsed < contactTime ? 0 : 1 - smooth((elapsed - contactTime) / 245);
    scroll = reduced ? 0 : scroll + (targetScroll - scroll) * 0.095;
    const phase = (now - started) / 1000;
    const gaze = reduced ? 1.05 : 1.46;
    renderer.draw({ phase, x: x * gaze, y: y * gaze, scroll, gesture, flash, reduced });
    shadow.style.transform = `translateX(${x * 10}px) scale(${1 + scroll * 0.15})`;
    shadow.style.opacity = `${0.83 + Math.sin(phase * 1.6 + Math.PI) * 0.12}`;
    activate();
  }

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    pointerTravel = Math.min(width * .14, 42);
    positionOnPointer();
    if (renderer && width > 0 && height > 0) renderer.resize(width, height);
    refreshScroll();
    activate();
  }

  function refreshScroll() {
    targetScroll = clamp(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
    activate();
  }

  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    targetX = clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1);
    targetY = clamp(event.clientY / window.innerHeight * 2 - 1, -1, 1);
    activate();
  }, { passive: true });

  function releasePointer() {
    targetX = 0;
    targetY = 0;
    activate();
  }

  document.documentElement.addEventListener('pointerleave', releasePointer);
  window.addEventListener('blur', releasePointer);
  window.addEventListener('scroll', refreshScroll, { passive: true });

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) activate();
  }, { rootMargin: '70px' }).observe(stage);

  function showPoster() {
    renderer = undefined;
    cancelAnimationFrame(frame);
    frame = 0;
    poster.hidden = false;
    canvas.style.visibility = 'hidden';
    stage.dataset.robotRenderer = 'pre-rendered';
    activate();
  }

  async function upgrade() {
    try {
      const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
      if (!context) return;
      const { createRenderer } = await import('./assets/field-renderer.js');
      const next = await createRenderer(canvas, context, modelUrl);
      if (context.isContextLost()) return;
      renderer = next;
      resize();
      cancelAnimationFrame(frame);
      draw(performance.now());
      poster.hidden = true;
      canvas.style.visibility = 'visible';
      stage.dataset.robotRenderer = 'webgl';
    } catch {
      showPoster();
    }
  }

  canvas.addEventListener('webglcontextlost', showPoster);
  showPoster();
  resize();
  void upgrade();

  motionPreference.addEventListener('change', event => {
    reduced = event.matches;
    positionOnPointer();
    activate();
  });
}
