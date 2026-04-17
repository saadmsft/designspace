/* Space Studio — CSV-driven dynamic content */
(() => {
  'use strict';

  /* ---------- CSV parser (handles quoted fields, commas, newlines) ---------- */
  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i + 1];
      if (inQuotes) {
        if (c === '"' && n === '"') { cell += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else { cell += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === ',') { row.push(cell); cell = ''; }
        else if (c === '\n' || c === '\r') {
          if (cell !== '' || row.length) { row.push(cell); rows.push(row); row = []; cell = ''; }
          if (c === '\r' && n === '\n') i++;
        } else { cell += c; }
      }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    if (!rows.length) return [];
    const headers = rows.shift().map(h => h.trim());
    return rows
      .filter(r => r.some(v => v && v.trim() !== ''))
      .map(r => {
        const o = {};
        headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
        return o;
      });
  }

  async function loadCSV(path) {
    try {
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      return parseCSV(await res.text());
    } catch (e) {
      console.warn('Failed to load', path, e);
      return [];
    }
  }

  /* ---------- SVG icon library (monochrome) ---------- */
  const ICONS = {
    blocks:   '<svg viewBox="0 0 52 52"><rect x="8" y="20" width="36" height="24" fill="currentColor"/><rect x="14" y="10" width="24" height="12" fill="currentColor"/></svg>',
    room:     '<svg viewBox="0 0 52 52"><rect x="6" y="10" width="40" height="32" fill="none" stroke="currentColor" stroke-width="2"/><line x1="6" y1="28" x2="46" y2="28" stroke="currentColor" stroke-width="2"/><rect x="14" y="32" width="10" height="10" fill="currentColor"/></svg>',
    chair:    '<svg viewBox="0 0 52 52"><rect x="10" y="14" width="32" height="8" fill="currentColor"/><rect x="10" y="22" width="4" height="22" fill="currentColor"/><rect x="38" y="22" width="4" height="22" fill="currentColor"/></svg>',
    lamp:     '<svg viewBox="0 0 52 52"><circle cx="26" cy="18" r="10" fill="currentColor"/><rect x="24" y="28" width="4" height="18" fill="currentColor"/><rect x="16" y="44" width="20" height="3" fill="currentColor"/></svg>',
    triangle: '<svg viewBox="0 0 52 52"><polygon points="26,8 46,44 6,44" fill="currentColor"/></svg>',
    square:   '<svg viewBox="0 0 52 52"><rect x="8" y="8" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2"/><rect x="16" y="16" width="20" height="20" fill="currentColor"/></svg>',
    table:    '<svg viewBox="0 0 52 52"><rect x="8" y="24" width="36" height="4" fill="currentColor"/><path d="M10 28 L10 44 M42 28 L42 44 M18 28 L18 38 M34 28 L34 38" stroke="currentColor" stroke-width="2" fill="none"/><rect x="14" y="18" width="24" height="6" fill="currentColor"/></svg>',
    speaker:  '<svg viewBox="0 0 52 52"><rect x="10" y="16" width="32" height="20" rx="3" fill="currentColor"/><circle cx="26" cy="26" r="4" fill="#fff"/></svg>',
    tower:    '<svg viewBox="0 0 52 52"><rect x="6" y="32" width="40" height="12" fill="currentColor"/><rect x="14" y="18" width="24" height="14" fill="currentColor"/><rect x="22" y="8" width="8" height="10" fill="currentColor"/></svg>',
    circle:   '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="18" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="26" cy="26" r="8" fill="currentColor"/></svg>',
    arc:      '<svg viewBox="0 0 52 52"><path d="M8 38 Q26 20 44 38 Z" fill="currentColor"/><rect x="10" y="38" width="32" height="4" fill="currentColor"/></svg>',
    diamond:  '<svg viewBox="0 0 52 52"><path d="M26 6 L42 26 L26 46 L10 26 Z" fill="currentColor"/></svg>',
    bars:     '<svg viewBox="0 0 52 52"><rect x="10" y="10" width="8" height="34" fill="currentColor"/><rect x="22" y="18" width="8" height="26" fill="currentColor"/><rect x="34" y="6" width="8" height="38" fill="currentColor"/></svg>',
    loft:     '<svg viewBox="0 0 52 52"><rect x="8" y="22" width="36" height="16" fill="currentColor"/><rect x="12" y="14" width="28" height="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    shelf:    '<svg viewBox="0 0 52 52"><rect x="14" y="8" width="24" height="32" fill="none" stroke="currentColor" stroke-width="2"/><line x1="14" y1="20" x2="38" y2="20" stroke="currentColor" stroke-width="2"/><line x1="14" y1="30" x2="38" y2="30" stroke="currentColor" stroke-width="2"/></svg>',
    phone:    '<svg viewBox="0 0 52 52"><rect x="18" y="10" width="16" height="32" rx="2" fill="currentColor"/><rect x="22" y="14" width="8" height="20" fill="#fff"/></svg>',
    _default: '<svg viewBox="0 0 52 52"><rect x="10" y="10" width="32" height="32" fill="currentColor"/></svg>'
  };
  const iconFor = (key) => ICONS[key] || ICONS._default;

  /* ---------- Escape helper ---------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);

  /* ---------- Renderers ---------- */
  function renderProjects(container, projects) {
    container.innerHTML = projects.map(p => `
      <a href="#" class="project-tile" data-category="${esc(p.category)}">
        <div class="project-tile__icon">${iconFor(p.icon)}</div>
        <div class="project-tile__info">
          <h3>${esc(p.title)}</h3>
          <span class="project-tile__meta">${esc(p.location)}</span>
        </div>
      </a>
    `).join('');
  }

  function renderFeaturedBanner(banner, projects) {
    const featured = projects.find(p => String(p.featured).toLowerCase() === 'true') || projects[0];
    if (!featured || !banner) return;
    const titleEl = banner.querySelector('h1');
    const locEl   = banner.querySelector('p');
    if (titleEl) {
      const parts = featured.title.split(/\s+/);
      titleEl.innerHTML = parts.length > 1
        ? `${esc(parts[0])}<br/>${esc(parts.slice(1).join(' '))}`
        : esc(featured.title);
    }
    if (locEl) locEl.textContent = `A FEATURED PROJECT — ${featured.location}.`;
  }

  function renderServicesRows(container, services) {
    container.innerHTML = services.map(s => {
      const short = s.title.replace(/\s*DESIGN$/i, '');
      return `
        <a href="services.html#${esc(s.id)}" class="service-row">
          <span class="service-row__num">${esc(s.code)} / ${esc(s.id.slice(0,3).toUpperCase())}</span>
          <span class="service-row__title">+${esc(short)}</span>
          <span class="service-row__desc">${esc(s.description1)}</span>
          <span class="service-row__arrow">→</span>
        </a>
      `;
    }).join('');
  }

  function renderServiceDetails(container, services) {
    container.innerHTML = services.map(s => `
      <section class="service-detail" id="${esc(s.id)}">
        <div class="service-detail__media">
          <span class="service-detail__label">${esc(s.subtitle)}</span>
          <div class="placeholder ${esc(s.image)}"></div>
        </div>
        <div class="service-detail__copy">
          <h2>${esc(s.title).replace(/\s/g,'<br/>')}</h2>
          <p>${esc(s.description1)}</p>
          <p>${esc(s.description2)}</p>
          <ul class="service-detail__specs">
            <li><span>SCOPE</span><span>${esc(s.scope)}</span></li>
            <li><span>STAGES</span><span>${esc(s.stages)}</span></li>
            <li><span>TIMELINE</span><span>${esc(s.timeline)}</span></li>
            <li><span>STARTING FEE</span><span>${esc(s.fee)}</span></li>
          </ul>
        </div>
      </section>
    `).join('');
  }

  function renderStats(container, stats) {
    container.innerHTML = stats.map(s => `
      <div class="stat">
        <span class="stat__num">${esc(s.value)}</span>
        <span class="stat__label">${esc(s.label)}</span>
      </div>
    `).join('');
  }

  function renderTeam(container, team) {
    container.innerHTML = team.map(t => `
      <article class="team-card">
        <div class="team-card__photo" style="background:${esc(t.gradient)};"></div>
        <h4>${esc(t.name)}</h4>
        <span>${esc(t.role)}</span>
      </article>
    `).join('');
  }

  function renderAwards(container, awards) {
    container.innerHTML = awards.map(a => `
      <div class="service-row">
        <span class="service-row__num">${esc(a.year)}</span>
        <span class="service-row__title">${esc(a.title)}</span>
        <span class="service-row__desc">${esc(a.description)}</span>
        <span class="service-row__arrow">→</span>
      </div>
    `).join('');
  }

  function renderOffices(container, offices) {
    container.innerHTML = offices.map(o => `
      <div class="service-row">
        <span class="service-row__num">${esc(o.code)}</span>
        <span class="service-row__title">${esc(o.city)}</span>
        <span class="service-row__desc">${esc(o.address)}</span>
        <span class="service-row__arrow">→</span>
      </div>
    `).join('');
  }

  /* ---------- Filter + count setup (after render) ---------- */
  function setupFilters() {
    const filters = document.querySelectorAll('.filter[data-filter]');
    const tiles = document.querySelectorAll('.project-tile');
    const counter = document.getElementById('filterCount');

    function updateCount() {
      if (!counter) return;
      const n = document.querySelectorAll('.project-tile:not(.hidden)').length;
      counter.textContent = `${String(n).padStart(2, '0')} PROJECTS`;
    }
    updateCount();

    filters.forEach(f => {
      f.addEventListener('click', () => {
        filters.forEach(x => x.classList.remove('active'));
        f.classList.add('active');
        const cat = f.dataset.filter;
        tiles.forEach(t => {
          const show = cat === 'all' || t.dataset.category === cat;
          t.classList.toggle('hidden', !show);
        });
        updateCount();
      });
    });
  }

  /* ---------- Page-specific init ---------- */
  async function initIndexPage() {
    const grid = document.getElementById('projectGrid');
    const banner = document.querySelector('.hero__banner');
    const servicesRows = document.getElementById('servicesRows');
    const statsRow = document.getElementById('statsRow');
    if (!grid && !servicesRows && !statsRow) return;

    const [projects, services, stats] = await Promise.all([
      grid ? loadCSV('data/projects.csv') : Promise.resolve([]),
      servicesRows ? loadCSV('data/services.csv') : Promise.resolve([]),
      statsRow ? loadCSV('data/stats.csv') : Promise.resolve([])
    ]);

    if (grid && projects.length) {
      renderProjects(grid, projects);
      renderFeaturedBanner(banner, projects);
      setupFilters();
    }
    if (servicesRows && services.length) renderServicesRows(servicesRows, services);
    if (statsRow && stats.length) renderStats(statsRow, stats);
  }

  async function initServicesPage() {
    const details = document.getElementById('serviceDetails');
    const sel = document.getElementById('service');
    if (!details && !sel) return;
    const services = await loadCSV('data/services.csv');
    if (details && services.length) renderServiceDetails(details, services);
    if (sel && services.length) {
      sel.innerHTML = services.map(s => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('') +
        `<option value="general">GENERAL ENQUIRY</option>`;
    }
  }

  async function initAboutPage() {
    const statsRow = document.getElementById('aboutStats');
    const teamGrid = document.getElementById('teamGrid');
    const awardsList = document.getElementById('awardsList');
    if (!statsRow && !teamGrid && !awardsList) return;

    const [stats, team, awards] = await Promise.all([
      statsRow ? loadCSV('data/stats.csv') : Promise.resolve([]),
      teamGrid ? loadCSV('data/team.csv') : Promise.resolve([]),
      awardsList ? loadCSV('data/awards.csv') : Promise.resolve([])
    ]);
    if (statsRow && stats.length) renderStats(statsRow, stats);
    if (teamGrid && team.length) renderTeam(teamGrid, team);
    if (awardsList && awards.length) renderAwards(awardsList, awards);
  }

  async function initContactPage() {
    const officesList = document.getElementById('officesList');
    if (officesList) {
      const offices = await loadCSV('data/offices.csv');
      if (offices.length) renderOffices(officesList, offices);
    }
  }

  /* ---------- Static UI ---------- */
  function initStaticUI() {
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
  }

  /* ---------- Bootstrap ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    initStaticUI();
    await Promise.all([
      initIndexPage(),
      initServicesPage(),
      initAboutPage(),
      initContactPage()
    ]);
  });
})();
