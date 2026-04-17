(() => {
  'use strict';

  // Mobile menu
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => {
        toggle.classList.remove('open');
        links.classList.remove('open');
      })
    );
  }

  // Project filters
  const filters = document.querySelectorAll('.filter');
  const tiles = document.querySelectorAll('.project-tile');
  filters.forEach(f => {
    f.addEventListener('click', () => {
      filters.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      const cat = f.dataset.filter;
      tiles.forEach(t => {
        const show = cat === 'all' || t.dataset.category === cat;
        t.classList.toggle('hidden', !show);
      });
      // update counter
      const end = document.getElementById('filterCount');
      if (end) {
        const n = document.querySelectorAll('.project-tile:not(.hidden)').length;
        end.textContent = `${n} PROJECTS`;
      }
    });
  });

  // Contact form
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn.textContent;
      btn.textContent = 'SENT — THANK YOU';
      btn.disabled = true;
      form.reset();
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3500);
    });
  }
})();
