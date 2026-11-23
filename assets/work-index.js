(() => {
  const section = document.querySelector('#projects');
  if (!section) return;

  const toolbar = section.querySelector('.work-toolbar');
  const filters = toolbar.querySelectorAll('[data-domain]');
  const projects = section.querySelectorAll('[data-domains]');
  const count = toolbar.querySelector('.work-count');

  toolbar.addEventListener('click', event => {
    const filter = event.target.closest('button[data-domain]');
    if (!filter) return;

    const domain = filter.dataset.domain;
    let visible = 0;
    for (const project of projects) {
      project.hidden = domain !== 'all' && !project.dataset.domains.split(' ').includes(domain);
      if (!project.hidden) visible++;
    }
    for (const button of filters) {
      button.setAttribute('aria-pressed', String(button === filter));
    }
    count.textContent = visible === 1 ? '1 project' : visible + ' projects';
  });
  toolbar.hidden = false;
})();
