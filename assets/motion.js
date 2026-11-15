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

  const copy = document.querySelector('[data-copy-email]');
  const feedback = document.querySelector('[data-copy-feedback]');
  const email = document.querySelector('.email-link');
  if (copy && feedback && email && navigator.clipboard?.writeText) {
    let clearFeedback;
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      clearTimeout(clearFeedback);
      try {
        await navigator.clipboard.writeText(email.getAttribute('href').slice('mailto:'.length));
        copy.textContent = 'Copied';
        feedback.textContent = 'Email address copied.';
      } catch {
        copy.textContent = 'Copy email';
        feedback.textContent = 'Select the email address to copy it.';
      }
      clearFeedback = setTimeout(() => {
        copy.textContent = 'Copy email';
        feedback.textContent = '';
      }, 3200);
    });
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
    const positions = links.map(({ section }) => section.getBoundingClientRect().top);
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 3;
    let current = -1;
    for (let index = 0; index < positions.length; index++) {
      if (positions[index] <= headerLine) current = index;
    }
    if (atEnd) current = links.length - 1;

    const nextLink = links[current]?.link ?? null;
    if (currentLink !== nextLink) {
      currentLink?.removeAttribute('aria-current');
      currentLink?.style.removeProperty('--section-progress');
      nextLink?.setAttribute('aria-current', 'location');
      currentLink = nextLink;
    }
    if (nextLink && !preference.matches) {
      const start = positions[current];
      const end = positions[current + 1] ?? (start + links[current].section.offsetHeight);
      const progress = atEnd ? 1 : Math.min(1, Math.max(0, (headerLine - start) / Math.max(1, end - start)));
      nextLink.style.setProperty('--section-progress', (0.34 + progress * 0.66).toFixed(3));
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
