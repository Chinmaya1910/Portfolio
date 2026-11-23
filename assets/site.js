const siteScript = document.currentScript;
const root = document.documentElement;
const themeToggle = document.querySelector('[data-theme-toggle]');

function showThemeState() {
  const dark = root.dataset.theme === 'dark';
  themeToggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  themeToggle.querySelector('[data-theme-icon]').textContent = dark ? '☀' : '☾';
}

if (themeToggle) {
  showThemeState();
  themeToggle.hidden = false;
  themeToggle.addEventListener('click', () => {
    const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = theme;
    showThemeState();
    try {
      localStorage.setItem('color-theme', theme);
    } catch {
      // The theme can still change for this page.
    }
  });
}

const menu = document.querySelector('.menu-button');
if (menu) {
  const nav = document.getElementById(menu.getAttribute('aria-controls'));
  const mobile = matchMedia('(max-width: 760px)');

  function setMenu(open, returnFocus = false) {
    const focusWasInside = nav.contains(document.activeElement);
    menu.setAttribute('aria-expanded', String(open));
    nav.dataset.open = String(open);
    if (returnFocus || (!open && mobile.matches && focusWasInside)) menu.focus();
  }

  nav.dataset.collapsible = 'true';
  menu.hidden = false;
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link || !mobile.matches || menu.getAttribute('aria-expanded') !== 'true') return;
    setMenu(false);
    if (!link.hash || !link.getAttribute('href').startsWith('#')) return;
    const target = document.getElementById(link.hash.slice(1));
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false, true);
    }
  });
  mobile.addEventListener('change', () => setMenu(false));
}

const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const pointerPreference = matchMedia('(hover: hover) and (pointer: fine)');

for (const media of document.querySelectorAll('[data-tilt]')) {
  let frame = null;
  let pointerX = 0;
  let pointerY = 0;

  function clearTilt() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    media.style.removeProperty('--tilt-x');
    media.style.removeProperty('--tilt-y');
  }

  media.addEventListener('pointermove', (event) => {
    if (motionPreference.matches || !pointerPreference.matches || event.pointerType !== 'mouse') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const bounds = media.getBoundingClientRect();
      const x = (pointerX - bounds.left) / bounds.width - 0.5;
      const y = (pointerY - bounds.top) / bounds.height - 0.5;
      media.style.setProperty('--tilt-x', `${-y * 9}deg`);
      media.style.setProperty('--tilt-y', `${x * 9}deg`);
    });
  });
  media.addEventListener('pointerleave', clearTilt);
  motionPreference.addEventListener('change', clearTilt);
}

const studySwitch = document.querySelector('.study-switch');
if (studySwitch) {
  const figure = studySwitch.closest('figure');
  const studyButtons = Array.from(studySwitch.querySelectorAll('[data-study]'));
  const panels = Array.from(figure.querySelectorAll('[data-study-panel]'));
  studySwitch.addEventListener('click', event => {
    const chosen = event.target.closest('[data-study]');
    if (!chosen) return;
    figure.dataset.activeStudy = chosen.dataset.study;
    studyButtons.forEach(button => button.setAttribute('aria-pressed', String(button === chosen)));
    panels.forEach(panel => { panel.hidden = panel.dataset.studyPanel !== chosen.dataset.study; });
  });
  studySwitch.hidden = false;
}

const stage = document.querySelector('[data-scene-stage]');
if (stage && siteScript?.dataset.scene) {
  const poster = stage.querySelector('.scene-poster');
  const actionLabel = stage.querySelector('[data-action-label]');
  const signatureButton = stage.querySelector('[data-hero-action]');
  const traceButton = stage.querySelector('[data-hero-trace]');
  if (traceButton) {
    traceButton.hidden = false;
    traceButton.addEventListener('click', () => {
      const active = traceButton.getAttribute('aria-pressed') !== 'true';
      traceButton.setAttribute('aria-pressed', String(active));
      stage.dataset.trace = String(active);
      stage.dispatchEvent(new Event('tracechange'));
    });
  }
  if (signatureButton) {
    const fieldPoster = poster.getAttribute('src');
    const label = signatureButton.querySelector('[data-hero-label]');
    const state = stage.querySelector('[data-hero-state]');
    signatureButton.hidden = false;
    signatureButton.addEventListener('click', () => {
      const ordered = stage.dataset.signature !== 'ordered';
      stage.dataset.signature = ordered ? 'ordered' : 'field';
      poster.src = ordered ? poster.dataset.orderedPoster : fieldPoster;
      label.textContent = ordered ? 'Disperse signals' : 'Organize signals';
      state.textContent = ordered ? 'Ordered lattice' : 'Signal field';
      stage.dispatchEvent(new Event('signaturechange'));
    });
  }
  const choices = document.querySelector('[data-scene-choices]');
  const description = document.querySelector('[data-scene-description]');

  if (choices && description && poster && actionLabel) {
    const buttons = choices.querySelectorAll('[data-view]');
    choices.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-view]');
      if (!choice || choice.dataset.view === stage.dataset.view) return;
      for (const button of buttons) {
        button.setAttribute('aria-pressed', String(button === choice));
      }
      stage.dataset.view = choice.dataset.view;
      poster.src = choice.dataset.poster;
      description.textContent = choice.dataset.description;
      actionLabel.textContent = choice.dataset.action;
      stage.dispatchEvent(new Event('scenechange'));
    });
    choices.hidden = false;
  }

  let requested = false;
  let posterSettled = poster.complete;
  let nearStage = !('IntersectionObserver' in window);

  function loadScene() {
    if (requested || motionPreference.matches || !posterSettled || !nearStage) return;
    requested = true;
    const script = document.createElement('script');
    script.src = siteScript.dataset.scene;
    document.head.append(script);
  }

  // Let the first poster paint before fetching the optional renderer.
  function scheduleScene() {
    if (requested || motionPreference.matches || !posterSettled || !nearStage) return;
    if ('requestIdleCallback' in window) requestIdleCallback(loadScene, { timeout: 1200 });
    else setTimeout(loadScene, 120);
  }

  if (!posterSettled) {
    const settlePoster = () => {
      posterSettled = true;
      scheduleScene();
    };
    poster.addEventListener('load', settlePoster, { once: true });
    poster.addEventListener('error', settlePoster, { once: true });
  }
  if (!nearStage) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      nearStage = true;
      observer.disconnect();
      scheduleScene();
    }, { rootMargin: '120px' });
    observer.observe(stage);
  }
  motionPreference.addEventListener('change', scheduleScene);
  scheduleScene();
}
