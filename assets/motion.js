(() => {
  'use strict';

  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const hero = document.querySelector('.hero');
  if (!preference.matches && (!location.hash || location.hash === '#home')) {
    hero?.setAttribute('data-intro', '');
  }

  if ('IntersectionObserver' in window) {
    const reveals = Array.from(document.querySelectorAll('[data-reveal]'));
    const observer = new IntersectionObserver((entries) => {
      if (preference.matches) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute('data-entered', '');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.13, rootMargin: '0px 0px -7% 0px' });

    function trackReveals() {
      observer.disconnect();
      if (preference.matches) return;
      for (const element of reveals) {
        if (!element.hasAttribute('data-entered')) observer.observe(element);
      }
    }

    trackReveals();
    preference.addEventListener('change', trackReveals);
  }

  const header = document.querySelector('.site-header');
  if (!header) return;
  const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'))
    .map((link) => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(({ section }) => section);
  const timeline = document.querySelector('.timeline');
  const milestones = timeline ? Array.from(timeline.children) : [];
  let currentLink = null;
  let frame = null;

  function updateScrollState() {
    frame = null;
    const headerLine = header.offsetHeight + 46;
    let nextLink = null;
    for (const { link, section } of links) {
      if (section.getBoundingClientRect().top <= headerLine) nextLink = link;
    }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 3) {
      nextLink = links.at(-1)?.link ?? null;
    }
    if (currentLink !== nextLink) {
      currentLink?.removeAttribute('aria-current');
      nextLink?.setAttribute('aria-current', 'location');
      currentLink = nextLink;
    }
    header.toggleAttribute('data-scrolled', window.scrollY > 12);

    if (!milestones.length || preference.matches) return;
    const top = timeline.getBoundingClientRect().top;
    const alignment = window.innerHeight * 0.68 - top;
    const offsets = milestones.map((milestone) => milestone.offsetTop);
    const length = offsets.at(-1);
    const progress = Math.min(1, Math.max(0, alignment / Math.max(1, length)));
    timeline.style.setProperty('--timeline-length', `${length}px`);
    timeline.style.setProperty('--timeline-progress', progress.toFixed(4));
    milestones.forEach((milestone, index) => {
      milestone.toggleAttribute('data-passed', alignment >= offsets[index]);
    });
  }

  function scheduleScrollState() {
    if (frame === null) frame = requestAnimationFrame(updateScrollState);
  }

  for (const event of ['scroll', 'resize', 'pageshow', 'hashchange']) {
    window.addEventListener(event, scheduleScrollState, { passive: true });
  }
  preference.addEventListener('change', scheduleScrollState);
  scheduleScrollState();
})();
