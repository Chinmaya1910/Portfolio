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
  media.addEventListener('pointermove', (event) => {
    if (motionPreference.matches || !pointerPreference.matches || event.pointerType !== 'mouse') return;
    const bounds = media.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    media.style.setProperty('--tilt-x', `${-y * 7}deg`);
    media.style.setProperty('--tilt-y', `${x * 7}deg`);
  });
  media.addEventListener('pointerleave', () => {
    media.style.removeProperty('--tilt-x');
    media.style.removeProperty('--tilt-y');
  });
}

const stage = document.querySelector('[data-scene-stage]');
if (stage && siteScript?.dataset.scene) {
  const poster = stage.querySelector('.scene-poster');
  const actionLabel = stage.querySelector('[data-action-label]');
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
  function loadScene() {
    if (requested || motionPreference.matches) return;
    requested = true;
    const script = document.createElement('script');
    script.src = siteScript.dataset.scene;
    document.head.append(script);
  }

  // Let the local poster paint before fetching the optional renderer.
  const schedule = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(loadScene, { timeout: 1500 });
    else setTimeout(loadScene, 150);
  };
  if (poster.complete) schedule();
  else {
    poster.addEventListener('load', schedule, { once: true });
    poster.addEventListener('error', schedule, { once: true });
  }
  motionPreference.addEventListener('change', loadScene);
}
