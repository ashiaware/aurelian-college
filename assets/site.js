// Aurelian College of the Arts: shared behavior for every page.
(function(){
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Header dropdowns and mobile menu ---------- */
  const dds = $$('.dd > button');
  const closeDDs = except => dds.forEach(b => { if (b !== except) { b.setAttribute('aria-expanded', 'false'); $('#' + b.getAttribute('aria-controls')).hidden = true; } });
  dds.forEach(b => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') === 'true';
    closeDDs(b);
    b.setAttribute('aria-expanded', String(!open));
    $('#' + b.getAttribute('aria-controls')).hidden = open;
  }));
  document.addEventListener('click', e => { if (!e.target.closest('.dd')) closeDDs(); });
  const nav = $('#nav'), menuBtn = $('#menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  /* ---------- Overlays (search + request form) ---------- */
  let lastFocus = null;
  function openOverlay(id){
    const ov = $('#' + id); if (!ov) return;
    lastFocus = document.activeElement;
    ov.hidden = false; document.body.style.overflow = 'hidden';
    const f = $('[data-autofocus]', ov) || $('input,select,textarea,button', ov);
    if (f) setTimeout(() => f.focus(), 30);
  }
  function closeOverlay(ov){
    ov.hidden = true; document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('.overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) closeOverlay(ov); });
    ov.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea', ov).filter(x => x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeDDs();
    if (nav && nav.classList.contains('open')) { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
    const ov = $$('.overlay').find(o => !o.hidden); if (ov) closeOverlay(ov);
  });

  /* Site search */
  const sIn = $('#site-search'), sOut = $('#search-results');
  $$('[data-open="search"]').forEach(b => b.addEventListener('click', () => { openOverlay('search-overlay'); renderSearch(); }));
  function renderSearch(){
    if (!sIn) return;
    const q = sIn.value.trim().toLowerCase();
    const idx = window.AURELIAN_INDEX || [];
    const hits = (q ? idx.filter(r => (r.t + ' ' + r.d + ' ' + (r.x || '')).toLowerCase().includes(q)) : idx.filter(r => r.top)).slice(0, 12);
    sOut.replaceChildren();
    if (!hits.length) {
      const li = document.createElement('li'); li.className = 'muted';
      li.textContent = 'Nothing matches “' + sIn.value + '”. Try a major, a House, or “tuition”.';
      sOut.appendChild(li); return;
    }
    hits.forEach(r => {
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = r.u;
      const k = document.createElement('span'); k.className = 'kind'; k.textContent = r.k;
      const t = document.createElement('b'); t.textContent = r.t;
      const d = document.createElement('small'); d.textContent = r.d;
      a.append(k, t, d); li.appendChild(a); sOut.appendChild(li);
    });
    $('#search-status').textContent = q ? hits.length + (hits.length === 1 ? ' result' : ' results') : 'Popular pages';
  }
  if (sIn) sIn.addEventListener('input', renderSearch);
  $$('#search-results').forEach(ul => ul.addEventListener('click', e => { if (e.target.closest('a')) closeOverlay($('#search-overlay')); }));

  /* Request-information form (shared modal) */
  const infoForm = $('#info-form');
  $$('[data-open="info"]').forEach(b => b.addEventListener('click', () => {
    $('#info-title').textContent = b.dataset.title || 'Request information';
    $('#info-intro').textContent = b.dataset.intro || 'Tell us a little about yourself and Admissions will send the details you ask for.';
    const sel = $('#info-interest');
    if (b.dataset.program && sel) sel.value = b.dataset.program;
    $('#info-kind').value = b.dataset.kind || 'info';
    infoForm.hidden = false; $('#info-done').hidden = true;
    openOverlay('info-overlay');
  }));
  function validate(form){
    let first = null;
    $$('[required]', form).forEach(el => {
      const err = $('#' + el.id + '-err');
      let msg = '';
      if (!el.value.trim()) msg = (el.dataset.label || 'This field') + ' is required.';
      else if (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim())) msg = 'Enter an email like name@example.com.';
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
      if (msg && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }
  $$('form[data-validate]').forEach(form => {
    $$('[required]', form).forEach(el => el.addEventListener('blur', () => { if (el.getAttribute('aria-invalid') === 'true') validate(form); }));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate(form)) return;
      const done = $('#' + form.dataset.done);
      const name = (form.querySelector('[name="name"]') || {}).value || '';
      const nm = done && $('[data-name]', done);
      if (nm) nm.textContent = name.trim().split(' ')[0] || 'there';
      form.hidden = true; if (done) { done.hidden = false; const h = $('h3', done); if (h) { h.tabIndex = -1; h.focus(); } }
    });
  });
  $$('[data-reset-form]').forEach(b => b.addEventListener('click', () => {
    const form = $('#' + b.dataset.resetForm); form.reset(); form.hidden = false;
    $$('[aria-invalid]', form).forEach(el => el.setAttribute('aria-invalid', 'false'));
    $$('.err', form).forEach(x => x.textContent = '');
    b.closest('.success').hidden = true;
  }));

  /* ---------- Tabs (generic) ---------- */
  $$('[data-tabs]').forEach(group => {
    const tabs = $$('[role="tab"]', group).filter(t => t.closest('[data-tabs]') === group);
    const select = (t, focus) => {
      tabs.forEach(x => {
        const on = x === t;
        x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        $('#' + x.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    const fromHash = () => { const h = location.hash.slice(1); const t = tabs.find(x => x.dataset.hash === h); if (t) { select(t); group.scrollIntoView({block:'start'}); } };
    fromHash(); window.addEventListener('hashchange', fromHash);
  });

  /* ---------- Filterable card lists ---------- */
  $$('[data-filter]').forEach(root => {
    const list = $('[data-filter-list]', root), cards = $$('.card', list);
    const search = $('[data-filter-search]', root), chips = $$('[data-filter-chip]', root);
    const toggle = $('[data-filter-toggle]', root), count = $('[data-filter-count]', root), empty = $('[data-filter-empty]', root);
    const noun = root.dataset.noun || 'items';
    let group = 'all';
    function apply(){
      const q = (search ? search.value : '').trim().toLowerCase();
      let n = 0;
      cards.forEach(c => {
        const okGroup = group === 'all' || c.dataset.group === group;
        const okText = !q || c.textContent.toLowerCase().includes(q);
        const okToggle = !toggle || !toggle.checked || c.dataset[toggle.dataset.filterToggle] === 'yes';
        c.hidden = !(okGroup && okText && okToggle);
        if (!c.hidden) n++;
      });
      if (count) count.textContent = n === cards.length ? 'Showing all ' + n + ' ' + noun : 'Showing ' + n + ' of ' + cards.length + ' ' + noun;
      if (empty) empty.hidden = n !== 0;
    }
    chips.forEach(c => c.addEventListener('click', () => { group = c.dataset.filterChip; chips.forEach(x => x.setAttribute('aria-pressed', String(x === c))); apply(); }));
    if (search) search.addEventListener('input', apply);
    if (toggle) toggle.addEventListener('change', apply);
    $$('[data-filter-reset]', root).forEach(b => b.addEventListener('click', () => {
      if (search) search.value = ''; if (toggle) toggle.checked = false; group = 'all';
      chips.forEach(x => x.setAttribute('aria-pressed', String(x.dataset.filterChip === 'all'))); apply();
    }));
    // Links elsewhere (for example the college panels) can preselect a chip
    $$('[data-pick-chip]').forEach(a => a.addEventListener('click', () => { const c = chips.find(x => x.dataset.filterChip === a.dataset.pickChip); if (c) c.click(); }));
    const fromHash = () => {
      const h = location.hash.slice(1);
      const c0 = chips.find(x => x.dataset.filterChip === h);
      if (c0) { c0.click(); return; }
      const card = h && document.getElementById(h);
      if (card && card.hidden && list.contains(card)) { $$('[data-filter-reset]', root)[0]?.click(); card.scrollIntoView(); }
    };
    fromHash(); window.addEventListener('hashchange', fromHash);
    apply();
  });

  /* ---------- House crests: point to reveal ---------- */
  const hcs = $$('.hc');
  const showHouse = a => {
    hcs.forEach(x => x.classList.toggle('on', x === a));
    ['name', 'motto', 'trans', 'meta'].forEach(k => { const el = $('#hc-' + k); if (el) el.textContent = a.dataset[k]; });
  };
  hcs.forEach(a => { a.addEventListener('mouseenter', () => showHouse(a)); a.addEventListener('focus', () => showHouse(a)); });
  if (hcs[0]) showHouse(hcs[0]);

  /* ---------- Copy buttons ---------- */
  $$('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const el = $('#' + b.dataset.copy), text = el.textContent, label = b.textContent;
    const done = msg => { b.textContent = msg; setTimeout(() => b.textContent = label, 1800); };
    const select = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected'); };
    try { navigator.clipboard.writeText(text).then(() => done('Copied'), select); } catch (err) { select(); }
  }));

  /* ---------- Application checklist (remembered in this browser) ---------- */
  const cl = $('#checklist');
  if (cl) {
    const boxes = $$('input[type=checkbox]', cl), bar = $('#cl-bar'), lbl = $('#cl-count');
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('aurelian-checklist') || '{}'); } catch (e) {}
    boxes.forEach(b => { if (saved[b.id]) b.checked = true; });
    const upd = () => {
      const n = boxes.filter(b => b.checked).length;
      bar.style.transform = 'scaleX(' + (n / boxes.length) + ')';
      lbl.textContent = n + ' of ' + boxes.length + ' done';
      try { localStorage.setItem('aurelian-checklist', JSON.stringify(Object.fromEntries(boxes.map(b => [b.id, b.checked])))); } catch (e) {}
    };
    boxes.forEach(b => b.addEventListener('change', upd)); upd();
  }

  /* ---------- Muses' House quiz ---------- */
  const quiz = $('#quiz');
  if (quiz) {
    const HOUSES = {
      thalia:['Thalia House','The eye and the hand. Painters, illustrators, photographers, jewelers, potters and glassblowers, fashion designers, art historians, designers, and architects. Look at Fine Arts, Jewelry & Metal Arts, Ceramics & Glass, or Fashion.','thalia'],
      melpomene:['Melpomene House','Drama on stage and screen. Actors, directors, writers, filmmakers, theatre designers, and producers. Look at Acting, Directing, Creative Writing & Playwriting, or Film.','melpomene'],
      terpsichore:['Terpsichore House','Movement. Dancers, Musical Theater performers, and circus artists. Look at Dance, Musical Theater, or Physical Theatre & Circus Arts.','terpsichore'],
      euterpe:['Euterpe House','Sound. Instrumentalists, singers, jazz musicians, and composers. Look at Instrumental Performance, Voice & Opera, Jazz, or Composition.','euterpe']
    };
    quiz.addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#verdict');
      const picks = ['hq1','hq2','hq3','hq4'].map(n => { const r = $('input[name="' + n + '"]:checked', quiz); return r ? r.value : null; });
      v.hidden = false; v.replaceChildren();
      if (picks.includes(null)) { v.textContent = 'Answer all four questions to find your House.'; return; }
      const score = {}; picks.forEach(p => score[p] = (score[p] || 0) + 1);
      let best = picks[3]; Object.keys(score).forEach(k => { if (score[k] > score[best]) best = k; });
      const b = document.createElement('b'); b.textContent = HOUSES[best][0];
      const p = document.createElement('p'); p.textContent = HOUSES[best][1];
      const a = document.createElement('a'); a.className = 'link'; a.href = '#' + HOUSES[best][2]; a.textContent = 'See ' + HOUSES[best][0];
      a.style.color = 'var(--gold)';
      v.append(b, p, a);
    });
  }
})();
