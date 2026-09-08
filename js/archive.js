/* Family Tree — Photo Archive */
(() => {
  'use strict';

  const state = { photos: [], people: [], query: '', gen: '', category: '' };
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  async function loadManifest() {
    try {
      const r = await fetch('data/photos.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('photos.json: ' + r.status);
      state.photos = await r.json();
    } catch (e) {
      console.warn('Photo archive manifest is unavailable', e);
      state.photos = [];
    }
  }

  function waitForPeople(done, tries = 0) {
    if (Array.isArray(window.PEOPLE) && window.PEOPLE.length) {
      state.people = window.PEOPLE;
      done();
      return;
    }
    if (tries > 100) { done(); return; }
    setTimeout(() => waitForPeople(done, tries + 1), 100);
  }

  function personMap() {
    return Object.fromEntries(state.people.map(p => [p.id, p]));
  }

  function initGenerationFilter() {
    const select = $('archive-generation');
    if (!select) return;
    [...new Set(state.people.map(p => p.gen).filter(Boolean))]
      .sort((a,b) => Number(a) - Number(b))
      .forEach(gen => {
        const o = document.createElement('option');
        o.value = gen;
        o.textContent = `Поколение ${gen}`;
        select.appendChild(o);
      });
  }

  function filtered() {
    const map = personMap();
    const q = state.query.trim().toLowerCase();
    return state.photos.filter(photo => {
      const linked = (photo.people || []).map(id => map[id]).filter(Boolean);
      const haystack = [
        photo.title, photo.date, photo.place, photo.description,
        ...linked.flatMap(p => [p.name, p.years, p.place])
      ].join(' ').toLowerCase();

      const queryOK = !q || haystack.includes(q);
      const genOK = !state.gen || linked.some(p => String(p.gen) === String(state.gen));
      const catOK = !state.category || photo.category === state.category;
      return queryOK && genOK && catOK;
    });
  }

  function render() {
    const grid = $('archive-grid');
    const empty = $('archive-empty');
    const stats = $('archive-stats');
    if (!grid) return;

    const map = personMap();
    const list = filtered();

    grid.innerHTML = list.map(photo => {
      const linked = (photo.people || []).map(id => map[id]).filter(Boolean);
      const names = linked.map(p => p.name).join(' · ');
      return `
        <article class="archive-card" data-photo-id="${esc(photo.id)}" tabindex="0"
                 role="button" aria-label="${esc(photo.title || 'Открыть фотографию')}">
          <img src="${esc(photo.file)}" alt="${esc(photo.title || '')}" loading="lazy">
          <div class="archive-card-body">
            <div class="archive-card-title">${esc(photo.title || 'Без названия')}</div>
            ${photo.date ? `<div class="archive-card-meta">${esc(photo.date)}</div>` : ''}
            ${photo.place ? `<div class="archive-card-place">${esc(photo.place)}</div>` : ''}
            ${names ? `<div class="archive-card-place">${esc(names)}</div>` : ''}
            <span class="archive-card-tag">${
              photo.category === 'portrait' ? 'Портрет' :
              photo.category === 'family' ? 'Семья' :
              photo.category === 'documents' ? 'Документ' : 'Другое'
            }</span>
          </div>
        </article>`;
    }).join('');

    stats.textContent = `Показано ${list.length} из ${state.photos.length} фотографий`;
    empty.hidden = list.length !== 0;

    grid.querySelectorAll('.archive-card').forEach(card => {
      const open = () => openPhoto(card.dataset.photoId);
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  function ensureLightbox() {
    if ($('archive-lightbox')) return $('archive-lightbox');
    const el = document.createElement('div');
    el.id = 'archive-lightbox';
    el.className = 'photo-lightbox';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Закрыть">×</button>
      <div class="archive-lightbox-content">
        <img id="archive-lightbox-img" src="" alt="">
        <div id="archive-lightbox-caption"></div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => { if (e.target === el) closePhoto(); });
    el.querySelector('.lightbox-close').addEventListener('click', closePhoto);
    return el;
  }

  function openPhoto(id) {
    const photo = state.photos.find(p => p.id === id);
    if (!photo) return;
    const el = ensureLightbox();
    const img = $('archive-lightbox-img');
    const cap = $('archive-lightbox-caption');
    const map = personMap();
    const linked = (photo.people || []).map(pid => map[pid]).filter(Boolean);

    img.src = photo.file;
    img.alt = photo.title || '';
    cap.innerHTML = `
      <strong>${esc(photo.title || 'Фотография')}</strong>
      ${photo.date ? `<span>${esc(photo.date)}</span>` : ''}
      ${photo.place ? `<span>${esc(photo.place)}</span>` : ''}
      ${linked.length ? `<div class="archive-lightbox-people">
        ${linked.map(p => `<button type="button" class="archive-person-link" data-person="${esc(p.id)}">${esc(p.name)}</button>`).join('')}
      </div>` : ''}`;

    cap.querySelectorAll('[data-person]').forEach(btn => {
      btn.addEventListener('click', () => {
        closePhoto();
        if (typeof window.openPanel === 'function') window.openPanel(btn.dataset.person);
        if (typeof window.selectPerson === 'function') window.selectPerson(btn.dataset.person);
        document.getElementById('family-tree-section')?.scrollIntoView({ behavior:'smooth' });
      });
    });

    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    el.querySelector('.lightbox-close').focus();
  }

  function closePhoto() {
    const el = $('archive-lightbox');
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
    const img = $('archive-lightbox-img');
    if (img) setTimeout(() => { if (!el.classList.contains('open')) img.src = ''; }, 180);
  }

  function init() {
    const search = $('archive-search');
    const gen = $('archive-generation');
    const cat = $('archive-category');

    search?.addEventListener('input', e => { state.query = e.target.value; render(); });
    gen?.addEventListener('change', e => { state.gen = e.target.value; render(); });
    cat?.addEventListener('change', e => { state.category = e.target.value; render(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePhoto(); });

    loadManifest().then(() => waitForPeople(() => {
      initGenerationFilter();
      render();
    }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
