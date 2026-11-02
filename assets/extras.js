// Aurelian: motion, campus map, roommate board, welcome letter, application, net price calculator, giving demo.
(function(){
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ---------- Guest passes (shared by Campus life and MyAurelian) ---------- */
  const GUEST = {
    key: 'aurelian-guests',
    exams: [['2026-11-30', '2026-12-04'], ['2027-03-15', '2027-03-19'], ['2027-06-07', '2027-06-10']],
    list() { try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { return []; } },
    save(l) { try { localStorage.setItem(this.key, JSON.stringify(l)); } catch (e) {} },
    D(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
    iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
    nightsOf(p) { const out = []; if (p.kind !== 'night') return out; for (let i = 0; i < p.n; i++) { const d = this.D(p.d); d.setDate(d.getDate() + i); out.push(this.iso(d)); } return out; },
    weekKey(s) { const d = this.D(s); const w = new Date(d); w.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return this.iso(w); },
    check(p) {
      if (!p.host) return ['gp-host', 'Add your name.'];
      if (!p.guest) return ['gp-guest', 'Add your guest’s name, as it appears on their photo ID.'];
      if (!p.d) return ['gp-date', 'Pick a date.'];
      p.c = p.c || 1;
      if (p.kind === 'day' && p.c > 3) return ['gp-count', 'You can sign in up to 3 day visitors at a time.'];
      if (p.kind === 'night' && p.c > 1) return ['gp-count', 'Only 1 overnight guest per student, per night. Your other visitors can come as day visitors until 11pm.'];
      if (p.kind === 'night') {
        if (!p.agree) return ['gp-agree', 'Every roommate has to agree before an overnight guest can stay.'];
        const nights = this.nightsOf(p);
        const clash = nights.find(n => this.exams.some(([a, b]) => n >= a && n <= b));
        if (clash) return ['gp-date', 'No overnight guests during jury week. Try a date outside ' + this.exams.map(([a, b]) => { const A = this.D(a), B = this.D(b), o = {month: 'short', day: 'numeric'}; return A.toLocaleDateString('en-US', o) + '–' + (A.getMonth() === B.getMonth() ? B.getDate() : B.toLocaleDateString('en-US', o)); }).join(', ') + '.'];
        const used = {};
        this.list().filter(x => x.host.toLowerCase() === p.host.toLowerCase()).forEach(x => this.nightsOf(x).forEach(n => { const w = this.weekKey(n); used[w] = (used[w] || 0) + 1; }));
        const add = {}; nights.forEach(n => { const w = this.weekKey(n); add[w] = (add[w] || 0) + 1; });
        const over = Object.keys(add).find(w => (used[w] || 0) + add[w] > 3);
        if (over) return ['gp-nights', 'That would be more than 3 guest nights in one week (' + (used[over] || 0) + ' already booked that week).'];
      }
      return null;
    },
    add(p) { const l = this.list(); p.id = 'AUR-' + String(Math.floor(1000 + Math.random() * 9000)); l.push(p); this.save(l); return p; },
    remove(id) { this.save(this.list().filter(x => x.id !== id)); },
    when(p) {
      const f = s => this.D(s).toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
      if (p.kind === 'day') return f(p.d) + ', 8am to 11pm';
      const end = this.D(p.d); end.setDate(end.getDate() + p.n);
      return f(p.d) + ' to ' + f(this.iso(end)) + ' (' + p.n + (p.n > 1 ? ' nights' : ' night') + ')';
    },
    card(p) {
      const e = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
      let seed = 0; for (const ch of p.id + p.guest) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
      let cells = ''; for (let i = 0; i < 49; i++) { seed = (seed * 1103515245 + 12345) >>> 0; cells += '<i' + ((seed >> 16) & 1 ? ' class="on"' : '') + '></i>'; }
      return '<article class="gpass"><div class="gpass-top"><span>Aurelian guest pass</span><b>' + e(p.id) + '</b></div><div class="gpass-body"><div><p class="gpass-name">' + e(p.guest) + ((p.c || 1) > 1 ? ' <span class="gpass-plus">+' + ((p.c || 1) - 1) + ((p.c || 1) > 2 ? ' guests' : ' guest') + '</span>' : '') + '</p><p>Guest of ' + e(p.host) + '</p><p>' + e(this.when(p)) + '</p>' +
        (p.minor ? '<p class="gpass-note">Bring the parent or guardian form.</p>' : '') + '<p class="gpass-note">Show this number and a photo ID at the Porter’s Lodge.</p></div><div class="gpass-code" aria-hidden="true">' + cells + '</div></div></article>';
    }
  };
  const store = {
    get(k){ try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
    set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- Card spotlight that follows the pointer ---------- */
  document.addEventListener('pointermove', e => {
    const c = e.target.closest && e.target.closest('.card,.event');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  /* ---------- Reveal on scroll (only things below the fold) ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    const els = $$('main .card, main .event, main .section-head, main .arch, main .steps-row li, main .stat, main .house-panel, main .bars, main .table-wrap, main .acc, main .promise-mini li, main .map-wrap');
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, sibs = [...el.parentElement.children].filter(x => x.classList.contains('rv'));
      el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 70 + 'ms';
      el.classList.add('in'); io.unobserve(el);
      setTimeout(() => { el.classList.remove('rv', 'in'); el.style.transitionDelay = ''; }, 1300);
    }), {rootMargin: '0px 0px -8% 0px'});
    els.forEach(el => {
      if (el.getBoundingClientRect().top > innerHeight * 0.92) { el.classList.add('rv'); io.observe(el); }
    });
    setTimeout(() => $$('.rv:not(.in)').forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); }), 1200);
  }

  /* ---------- Count-up numbers ---------- */
  const counters = $$('[data-count]');
  if (counters.length && !reduce && 'IntersectionObserver' in window) {
    const run = el => {
      const end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1400;
      const step = t => { const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3)));
        el.textContent = pre + v.toLocaleString('en-US') + suf; if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), {threshold: .4});
    counters.forEach(c => io.observe(c));
  }

  /* ---------- Bars grow when seen ---------- */
  $$('.bars .fill').forEach(f => { if (reduce || !('IntersectionObserver' in window)) return; f.style.transform = 'scaleX(0)';
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { f.style.transform = ''; io.disconnect(); } }); io.observe(f); });

  /* ---------- Campus map ---------- */
  const MAP = window.AURELIAN_MAP;
  if (MAP) {
    const info = $('.map-info');
    const select = (key, push) => {
      const b = MAP[key]; if (!b) return;
      $$('.bldg').forEach(g => g.classList.toggle('on', g.dataset.b === key));
      $('#mi-cat').textContent = b.cat; $('#mi-name').textContent = b.name;
      $('#mi-desc').textContent = b.desc; $('#mi-hours').textContent = b.hours;
      info.classList.remove('flash'); void info.offsetWidth; info.classList.add('flash');
      if (push) history.replaceState(null, '', '#' + key);
    };
    $$('.bldg').forEach(g => {
      g.addEventListener('click', () => select(g.dataset.b, true));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(g.dataset.b, true); } });
    });
    $$('.map-item').forEach(b => b.addEventListener('click', () => { select(b.dataset.b, true); $('.map-wrap').scrollIntoView({block: 'center'}); }));
    const chips = $$('[data-mapcat]');
    chips.forEach(c => c.addEventListener('click', () => {
      chips.forEach(x => x.setAttribute('aria-pressed', String(x === c)));
      const cat = c.dataset.mapcat;
      $$('.bldg').forEach(g => g.classList.toggle('dim', cat !== 'all' && !g.classList.contains('c-' + cat)));
    }));
    const fromHash = () => { const h = location.hash.slice(1); if (MAP[h]) select(h); };
    fromHash(); window.addEventListener('hashchange', fromHash);
    if (!MAP[location.hash.slice(1)]) select('gate');
  }

  /* ---------- Roommate Board ---------- */
  const rmList = $('#rm-list');
  if (rmList) {
    const HOUSE_OF = window.AURELIAN_HOUSE_OF || {};
    const fHouse = $('#rm-house'), fPlan = $('#rm-plan'), fSleep = $('#rm-sleep');
    const members = $('#rm-members'), title = $('#grp-title'), note = $('#rm-group-note'), live = $('#rm-live');
    let group = [];
    const cap = () => fPlan.value === 'Ensemble' ? 4 : 1;
    const renderGroup = () => {
      members.replaceChildren();
      const you = document.createElement('li'); you.innerHTML = '<b>You</b>'; members.appendChild(you);
      group.forEach(g => {
        const li = document.createElement('li'); const s = document.createElement('span'); s.textContent = g.name + ' · accepted';
        const x = document.createElement('button'); x.type = 'button'; x.textContent = 'Remove'; x.setAttribute('aria-label', 'Remove ' + g.name);
        x.addEventListener('click', () => { group = group.filter(y => y.id !== g.id); renderGroup(); apply(); live.textContent = g.name + ' removed.'; });
        li.append(s, x); members.appendChild(li);
      });
      const size = group.length + 1, total = cap() + 1;
      title.textContent = (fPlan.value === 'Ensemble' ? 'Ensemble, ' : 'Duet, ') + size + ' of ' + total;
      note.textContent = size === total ? 'Your group is full and locked. Your Head of House will confirm your room in July.'
        : 'Invite ' + (total - size) + ' more from your House. A group locks when everyone accepts.';
    };
    const apply = () => {
      let n = 0;
      $$('.rm', rmList).forEach(c => {
        const ok = c.dataset.house === fHouse.value && c.dataset.plan === fPlan.value && (!fSleep.value || c.dataset.sleep === fSleep.value);
        c.hidden = !ok; if (ok) n++;
        const inv = $('.rm-invite', c); if (!inv) return;
        const picked = group.some(g => g.id === c.id);
        c.classList.toggle('picked', picked);
        inv.disabled = picked || group.length >= cap();
        inv.textContent = picked ? 'In your group' : group.length >= cap() ? 'Group full' : (fPlan.value === 'Ensemble' ? 'Invite to my group' : 'Ask to room together');
      });
      $('#rm-count').textContent = n + (n === 1 ? ' person' : ' people') + ' looking';
      $('#rm-empty').hidden = n !== 0;
    };
    [fHouse, fSleep].forEach(s => s.addEventListener('change', () => { if (s === fHouse) { group = []; renderGroup(); } apply(); }));
    fPlan.addEventListener('change', () => { group = []; renderGroup(); apply(); });
    rmList.addEventListener('click', e => {
      const inv = e.target.closest('.rm-invite'), rep = e.target.closest('.rm-report');
      if (inv && !inv.disabled) {
        group.push({id: inv.dataset.id, name: inv.dataset.name});
        live.textContent = inv.dataset.name + ' accepted your invitation.';
        renderGroup(); apply();
      }
      if (rep) { rep.textContent = 'Reported to the Head of House'; rep.disabled = true; }
    });
    // Your own profile (saved only in this browser)
    const form = $('#rm-form');
    const addMine = p => {
      $$('.rm.mine', rmList).forEach(x => x.remove());
      const P = window.AURELIAN_PROGRAMS || {};
      const art = $('#rm-' + 'list');
      const c = document.createElement('article'); c.className = 'card rm mine'; c.id = 'rm-mine';
      c.dataset.house = HOUSE_OF[p.major] || 'thalia'; c.dataset.plan = fPlan.value; c.dataset.sleep = '';
      const b = document.createElement('div'); b.className = 'body';
      const tag = document.createElement('span'); tag.className = 'tag gold'; tag.textContent = 'Your profile';
      const h = document.createElement('h3'); h.textContent = p.name;
      const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = ($('#rm-major option[value="' + p.major + '"]') || {}).textContent || '';
      const ab = document.createElement('p'); ab.textContent = p.about;
      b.append(tag, h, sub, ab); c.appendChild(b); rmList.prepend(c);
      fHouse.value = c.dataset.house; c.dataset.sleep = fSleep.value; apply();
    };
    const saved = store.get('aurelian-roommate-profile');
    if (saved) addMine(saved);
    if (form) form.addEventListener('submit', () => {
      const p = {name: $('#rm-name').value.trim(), major: $('#rm-major').value, about: $('#rm-about').value.trim()};
      if (!p.name || !p.about) return;
      store.set('aurelian-roommate-profile', p); addMine(p);
    });
    renderGroup(); apply();
  }

  /* ---------- Welcome letter + application (shared helpers) ---------- */
  const W = window.AURELIAN_WELCOME, PR = window.AURELIAN_PROGRAMS;
  const firstNum = s => +(String(s).match(/\$([\d,]+)/) || [0, '0'])[1].replace(/,/g, '');
  const advisorFor = (prog, from, term) => (from === 'intl' || term === 'transfer') ? Object.assign({img: 'intl'}, W.intl) : Object.assign({img: PR[prog].hk}, W.adv[PR[prog].hk]);
  const reqText = (prog) => ({audition: 'Audition', portfolio: 'Portfolio', writing: 'Writing sample'})[W.req[prog]];
  const estimate = (prog, cap, sticker, firstgen) => {
    const named = W.sch[prog], namedAmt = named ? firstNum(W.schAmt[named]) : 0, fg = firstgen ? 2000 : 0;
    const known = cap !== -2, share = cap >= 0 ? Math.min(sticker, cap) : sticker;
    const promise = cap >= 0 ? sticker - share : 0;
    const high = Math.max(0, share - fg), low = Math.max(0, share - 8000 - namedAmt - fg);
    const lines = [['Full price', money(sticker) + ' a year']];
    if (promise) lines.push(['Aurelian Promise grant', '-' + money(promise)]);
    lines.push(['Merit scholarship', '$2,000 to $8,000, decided at your ' + reqText(prog).toLowerCase()]);
    if (named) lines.push([named, 'Up to ' + W.schAmt[named] + ', no extra forms']);
    if (firstgen) lines.push(['Aurel First-Generation Scholarship', '-$2,000 a year, plus a $1,500 Starter Grant']);
    lines.push(['Work-study', 'Up to $3,000 a year from a campus job']);
    return {lines, low, high, known, cap, promise};
  };
  const priceText = est => est.low === est.high ? money(est.low) : money(est.low) + ' to ' + money(est.high);
  const storeGet = k => store.get(k) || {};

  /* ---------- Welcome letter ---------- */
  const env = $('#envelope');
  if (env && W) {
    const form = $('#letter-form'), seal = $('#seal'), hint = $('#seal-hint'), paper = $('#letter-paper'), stage = $('.envelope-stage');
    const set = (k, v) => $$('[data-l="' + k + '"]', paper).forEach(el => el.textContent = v);
    const val = id => $('#' + id).value;
    const saved = storeGet('aurelian-welcome');
    ['name', 'prog', 'from', 'term', 'home', 'income'].forEach(k => { if (saved[k] != null && $('#lt-' + k)) $('#lt-' + k).value = saved[k]; });
    if (saved.first) $('#lt-first').checked = true;
    const fill = () => {
      const d = {name: val('lt-name').trim(), prog: val('lt-prog'), from: val('lt-from'), term: val('lt-term'), home: val('lt-home'), income: val('lt-income'), first: $('#lt-first').checked};
      store.set('aurelian-welcome', d);
      const p = PR[d.prog], adv = advisorFor(d.prog, d.from, d.term), sticker = +d.home, cap = +d.income;
      const art = p.n.replace(/^(BFA|BA|BM|BS|MFA) /, '');
      set('date', new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}));
      set('name', d.name); set('art', art);
      set('intro', 'At Aurelian, every art has a home. ' + art + ' belongs to ' + p.h + ', the House of ' + p.a.toLowerCase() + '. ' +
        (sticker === 23100 ? 'Even commuting, you would have a locker and day room in the ' + p.w + ', a seat at the ' + p.h.split(' ')[0] + ' table, and a vote in your House.'
          : 'You would live in the ' + p.w + ' of Ashcombe Hall, beside the studios you train in every morning, and every studio is open to you around the clock.') +
        ' Your degree comes from the College of ' + p.c + '.');
      const advImg = $('[data-adv-img]', paper); if (advImg) { advImg.src = 'assets/img/people/adv-' + adv.img + '.webp'; advImg.alt = 'Portrait of ' + adv.n; } set('advName', adv.n); set('advTitle', adv.t);
      set('advAbout', adv.a); set('advEmail', adv.e); set('advPhone', adv.p);
      const est = estimate(d.prog, cap, sticker, d.first);
      const dl = $('[data-l="aidLines"]', paper); dl.replaceChildren();
      est.lines.forEach(([a, b]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = a; dd.textContent = b; dl.append(dt, dd); });
      set('price', priceText(est));
      set('pricenote', 'a year, ' + (sticker === 23100 ? 'commuting' : 'living on campus') + ', including everything your program needs');
      set('aidNote', cap === -2 ? 'This assumes no need-based aid. Tell your advisor your family income for a much closer number: under $75,000, tuition is free.'
        : cap === 0 ? 'At your family income, Aurelian is free: you would also get a $1,200 personal allowance and a laptop.'
        : cap === 3500 ? 'At your family income, tuition is free and you get a laptop. Work-study can cover the rest.'
        : 'Your price can only go down from here: merit and named scholarships are added on top of the Promise.');
      const ol = $('[data-l="steps"]', paper); ol.replaceChildren();
      const steps = [
        ['Start your application', 'It\'s free and takes about 30 minutes. Apply by January 15. I\'ve filled in what you told me.'],
        [reqText(d.prog), W.prep[d.prog]],
        [d.from === 'intl' ? 'Send your aid form' : 'File the FAFSA by February 15', d.from === 'intl' ? 'International students send the Aurelian aid form instead; I\'ll send you the link.' : 'It decides your Promise grant. Use Aurelian\'s school code.'],
        ['Talk to me any time', 'Email ' + adv.e + ' or call ' + adv.p + '. I reply within two working days.']];
      steps.forEach(([a, b]) => { const li = document.createElement('li'), s = document.createElement('b'), t = document.createElement('span'); s.textContent = a; t.textContent = b; li.append(s, t); ol.appendChild(li); });
      set('sig', adv.n); set('sigTitle', adv.t);
      $('#letter-call').dataset.title = 'Talk to ' + adv.n.split(' ')[0];
      $('#letter-call').dataset.intro = adv.n + ' will reply within two working days to set up a 20-minute call.';
      $('#letter-call').dataset.program = d.prog;
    };
    const state = s => {
      env.dataset.state = s;
      if (s === 'open') {
        const H = paper.scrollHeight, E = env.offsetHeight, lift = H - 0.79 * E;
        env.style.setProperty('--lift', (-lift) + 'px');
        stage.style.paddingTop = Math.max(24, H - 0.85 * E + 16) + 'px';
      } else { stage.style.paddingTop = ''; }
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const nm = $('#lt-name'), err = $('#lt-name-err');
      if (!nm.value.trim()) { err.textContent = 'Type your first name for the letter.'; nm.setAttribute('aria-invalid', 'true'); nm.focus(); return; }
      err.textContent = ''; nm.setAttribute('aria-invalid', 'false');
      fill(); state('sealed'); seal.disabled = false; $('#letter-actions').hidden = true;
      hint.textContent = 'Your letter is ready. Press the wax seal to open it.';
      seal.focus();
    });
    seal.addEventListener('click', () => {
      state('open'); seal.disabled = true;
      hint.textContent = 'Welcome, ' + $('#lt-name').value.trim() + '.';
      $('#letter-actions').hidden = false;
      setTimeout(() => { paper.focus({preventScroll: true}); stage.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}); }, reduce ? 0 : 1100);
    });
    $('#letter-print').addEventListener('click', () => window.print());
    $('#letter-again').addEventListener('click', () => { state('closed'); seal.disabled = true; $('#letter-actions').hidden = true; hint.textContent = 'Fill in your first name, then write your letter.'; $('#lt-name').focus(); });
    window.addEventListener('resize', () => { if (env.dataset.state === 'open') state('open'); });
  }

  /* ---------- Application ---------- */
  const app = $('#app-form');
  if (app && W) {
    const steps = $$('.app-step', app), dots = $$('.app-progress li'), back = $('#ap-back'), next = $('#ap-next'), submit = $('#ap-submit'), savedEl = $('#ap-saved');
    let cur = 0;
    const fields = $$('input,select,textarea', app).filter(x => x.name);
    const read = () => Object.fromEntries(fields.map(f => [f.name, f.type === 'checkbox' ? f.checked : f.value]));
    const save = () => { store.set('aurelian-app', {step: cur, data: read()}); savedEl.textContent = 'Saved'; };
    // prefill: saved application first, otherwise the welcome letter
    const sv = store.get('aurelian-app'), wl = storeGet('aurelian-welcome');
    if (sv && sv.data) { fields.forEach(f => { const v = sv.data[f.name]; if (v == null) return; if (f.type === 'checkbox') f.checked = v; else f.value = v; }); }
    else if (wl.name) {
      $('#ap-first').value = wl.name; if (wl.prog) $('#ap-prog').value = wl.prog; if (wl.from) $('#ap-from').value = wl.from;
      if (wl.term) $('#ap-term').value = wl.term; if (wl.home) $('#ap-home').value = wl.home; if (wl.income) $('#ap-income').value = wl.income;
      $('#ap-first-gen').checked = !!wl.first; savedEl.textContent = 'Filled in from your welcome letter';
    }
    const words = () => ($('#ap-statement').value.trim().match(/\S+/g) || []).length;
    const sync = () => {
      const d = read(), p = PR[d.prog], adv = advisorFor(d.prog, d.from, d.term), aidc = W.aid[p.hk];
      $('#sa-img').src = 'assets/img/people/adv-' + adv.img + '.webp'; $('#sa-img').alt = 'Portrait of ' + adv.n; $('#sa-name').textContent = adv.n; $('#sa-title').textContent = adv.t;
      $('#sa-about').textContent = adv.a; $('#sa-email').textContent = adv.e + ' · ' + adv.p;
      $('#sa-call').dataset.title = 'Ask ' + adv.n.split(' ')[0] + ' a question'; $('#sa-call').dataset.program = d.prog;
      $('#sc-name').textContent = aidc.n; $('#sc-email').textContent = aidc.e;
      $('#ap-house').textContent = 'You would join ' + p.h + ', the House of ' + p.a.toLowerCase() + ', and live in the ' + p.w + '.';
      $('#ap-home-note').textContent = p.r === 'four' ? 'This program lives on campus all four years.' : p.r === 'first' ? 'This program lives on campus in first year.' : 'You can live on campus or commute.';
      const homeSel = $('#ap-home'); homeSel.querySelector('[value="23100"]').disabled = p.r !== 'none' && d.term !== 'transfer'; if (homeSel.selectedOptions[0].disabled) homeSel.value = '33200';
      const req = W.req[d.prog];
      $('#ap-req').textContent = reqText(d.prog) + ': ' + W.prep[d.prog];
      $('#ap-aud-wrap').hidden = req !== 'audition'; $('#ap-aud').required = req === 'audition';
      $('#ap-link-wrap').hidden = req === 'audition';
      const n = words(); $('#ap-count').textContent = n + ' / 500 words';
      const est = estimate(d.prog, +d.income, +$('#ap-home').value, d.firstgen);
      const box = $('#ap-aid'); box.replaceChildren();
      const h = document.createElement('p'); h.className = 'eyebrow'; h.textContent = 'Your estimate';
      const b = document.createElement('b'); b.className = 'app-aid-price'; b.textContent = priceText(est) + ' a year';
      const dl = document.createElement('dl'); dl.className = 'aid-lines';
      est.lines.forEach(([x, y]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = x; dd.textContent = y; dl.append(dt, dd); });
      box.append(h, b, dl);
    };
    const err = (el, msg) => { const e = $('#' + el.id + '-err'); if (e) e.textContent = msg; el.setAttribute('aria-invalid', msg ? 'true' : 'false'); };
    const check = i => {
      let first = null;
      $$('[required]', steps[i]).forEach(el => {
        if (el.closest('[hidden]')) return;
        let msg = '';
        if (el.type === 'checkbox' ? !el.checked : !el.value.trim()) msg = (el.dataset.label || 'This') + ' is required.';
        else if (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim())) msg = 'Enter an email like name@example.com.';
        else if (el.id === 'ap-statement' && words() > 500) msg = 'Keep your statement to 500 words or fewer.';
        else if (el.id === 'ap-statement' && words() < 25) msg = 'Write at least a few sentences (25 words or more).';
        err(el, msg); if (msg && !first) first = el;
      });
      if (first) first.focus();
      return !first;
    };
    const review = () => {
      const d = read(), dl = $('#ap-review'); dl.replaceChildren();
      const rows = [['Name', d.first + ' ' + d.last], ['Email', d.email], ['School', d.school + ', class of ' + d.grad], ['Program', PR[d.prog].n],
        ['Second choice', d.second ? PR[d.second].n : 'None'], ['House', PR[d.prog].h], ['Starting', $('#ap-term').selectedOptions[0].text],
        ['Living', $('#ap-home').selectedOptions[0].text], [reqText(d.prog), W.req[d.prog] === 'audition' ? d.audition : (d.link || 'You can add this later')],
        ['Statement', words() + ' words'], ['FAFSA', $('#ap-fafsa').selectedOptions[0].text], ['Scholarships', d.merit ? 'Consider me for merit and named scholarships' : 'Not requested']];
      rows.forEach(([a, b]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = a; dd.textContent = b; dl.append(dt, dd); });
    };
    const go = i => {
      cur = i; steps.forEach((s, k) => s.hidden = k !== i);
      dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('done', k < i); if (k === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
      back.hidden = i === 0; next.hidden = i === steps.length - 1; submit.hidden = i !== steps.length - 1;
      if (i === steps.length - 1) review();
      const lg = $('legend', steps[i]); if (lg) { lg.tabIndex = -1; lg.focus({preventScroll: true}); }
      app.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'});
      save();
    };
    next.addEventListener('click', () => { if (check(cur)) go(cur + 1); });
    back.addEventListener('click', () => go(cur - 1));
    app.addEventListener('input', () => { sync(); save(); });
    app.addEventListener('change', () => { sync(); save(); });
    app.addEventListener('submit', e => {
      e.preventDefault();
      if (!check(cur)) return;
      const d = read(), p = PR[d.prog], adv = advisorFor(d.prog, d.from, d.term);
      app.hidden = true; $('.app-progress').hidden = true;
      const done = $('#ap-done'); done.hidden = false;
      $('[data-l="doneName"]', done).textContent = d.first;
      $('[data-l="doneText"]', done).textContent = 'Your application for ' + p.n + ' is in. ' + adv.n + ', your admissions advisor, will email you within two working days.';
      const ol = $('[data-l="doneSteps"]', done); ol.replaceChildren();
      [[reqText(d.prog), W.req[d.prog] === 'audition' ? (d.audition || 'Choose a date with your advisor') + '.' : 'Upload it by February 27.'],
       [d.from === 'intl' ? 'Aid form' : 'FAFSA', 'By February 15, so your Promise grant is ready in your letter.'],
       ['Your decision', 'March 31, with your price and scholarships in the same letter.']].forEach(([a, b]) => {
        const li = document.createElement('li'), s = document.createElement('b'), t = document.createElement('span'); s.textContent = a; t.textContent = b; li.append(s, t); ol.appendChild(li); });
      store.set('aurelian-app', {step: 0, data: d, submitted: true});
      done.focus();
    });
    sync();
    go(sv && sv.step && !sv.submitted ? Math.min(sv.step, steps.length - 1) : 0);
    savedEl.textContent = wl.name && !(sv && sv.data) ? 'Filled in from your welcome letter' : savedEl.textContent;
  }

  /* ---------- Net price calculator ---------- */
  const calc = $('#calc');
  if (calc) {
    const TIERS = [[40000, 0], [75000, 3500], [110000, 9000], [150000, 16000]];
    const inc = $('#calc-income'), home = $('#calc-home'), mer = $('#calc-merit'), payEl = $('#calc-pay');
    const upd = () => {
      const income = +inc.value, sticker = +home.value, merit = +mer.value;
      $('#calc-income-out').textContent = money(income) + (income >= 250000 ? '+' : '');
      const t = TIERS.find(x => income < x[0]); const cap = t ? t[1] : null;
      const extra = Math.max(0, sticker - 33200);
      const familyShare = cap === null ? sticker : Math.min(sticker, cap + extra);
      const grant = sticker - familyShare, meritUsed = Math.min(merit, familyShare), pay = familyShare - meritUsed;
      $('#calc-full').textContent = money(sticker);
      $('#calc-grant').textContent = grant ? '-' + money(grant) : '$0';
      $('#calc-mer').textContent = meritUsed ? '-' + money(meritUsed) : '$0';
      payEl.textContent = money(pay); $('#calc-four').textContent = money(pay * 4) + ' over four years, price-locked';
      payEl.classList.remove('bump'); void payEl.offsetWidth; payEl.classList.add('bump'); setTimeout(() => payEl.classList.remove('bump'), 200);
      $('#calc-note').textContent = cap === 0 ? 'Free: tuition, housing, meals, and supplies, plus a $1,200 personal allowance and a laptop.'
        : cap === 3500 ? 'Tuition and fees are free at this income, and you get a laptop. Work-study can cover the rest.'
        : cap !== null ? 'The Aurelian Promise caps what your family pays. Work-study can pay up to $3,000 of it.'
        : 'Above $150,000, merit scholarships, payment plans, and the four-year price lock apply.';
    };
    [inc, home, mer].forEach(el => el.addEventListener('input', upd)); upd();
  }

  /* ---------- Giving demo ---------- */
  const give = window.AURELIAN_GIVE;
  if (give) {
    const chips = $$('[data-give]');
    chips.forEach(c => c.addEventListener('click', () => {
      chips.forEach(x => x.setAttribute('aria-pressed', String(x === c)));
      $('#give-impact').textContent = give[c.dataset.give];
    }));
  }

  /* ---------- Announcement banner (dismiss, remembered) ---------- */
  const ann = $('#announce');
  if (ann) {
    let off = false; try { off = sessionStorage.getItem('aurelian-announce') === 'off'; } catch (e) {}
    if (off) ann.hidden = true;
    $('.announce-x', ann).addEventListener('click', () => { ann.hidden = true; try { sessionStorage.setItem('aurelian-announce', 'off'); } catch (e) {} });
  }
  /* ---------- Student tools that are outside this site ---------- */
  $$('[data-demo]').forEach(b => b.addEventListener('click', () => {
    $('.demo-note', b).textContent = 'Opening MyAurelian…';
  }));

  /* ---------- School calendar ---------- */
  const CAL = window.AURELIAN_CAL;
  if (CAL) {
    const days = $('#cal-days'), title = $('#cal-month'), list = $('#cal-list');
    const D = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const evs = CAL.map(x => ({...x, sd: D(x.s), ed: D(x.e)}));
    const today = new Date(2026, 9, 26);
    let view = new Date(today.getFullYear(), today.getMonth(), 1), sel = today, cat = 'all';
    const on = d => evs.filter(x => d >= x.sd && d <= x.ed && (cat === 'all' || x.k === cat));
    const inTerm = d => evs.some(x => x.k === 'term' && d >= x.sd && d <= x.ed);
    const fmt = d => d.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
    const showDay = d => {
      sel = d; $('#cal-day-label').textContent = key(d) === key(today) ? 'Today' : 'Selected day';
      $('#cal-day-title').textContent = fmt(d);
      list.replaceChildren();
      const items = on(d).filter(x => x.k !== 'term');
      const term = evs.find(x => x.k === 'term' && d >= x.sd && d <= x.ed);
      if (term) { const li = document.createElement('li'); li.className = 'cal-term'; li.textContent = term.t + ' (week ' + (Math.floor((d - term.sd) / 6048e5) + 1) + ')'; list.appendChild(li); }
      if (!items.length) { const li = document.createElement('li'); li.className = 'muted'; li.textContent = 'Nothing scheduled.'; list.appendChild(li); }
      items.forEach(x => { const li = document.createElement('li'), b = document.createElement('b'), s = document.createElement('span');
        li.className = 'cal-' + x.k; b.textContent = x.t; s.textContent = x.s === x.e ? '' : D(x.s).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) + ' to ' + D(x.e).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
        if (x.v) s.textContent = (s.textContent ? s.textContent + ' · ' : '') + x.v;
        if (x.u) { const lk = document.createElement('a'); lk.className = 'cal-more'; lk.href = x.u; lk.textContent = x.ul || 'Details'; s.append(document.createTextNode(' '), lk); }
        if (x.img) { const im = document.createElement('img'); im.src = x.img; im.alt = x.alt || ''; im.width = 560; im.height = 350; im.loading = 'lazy'; im.className = 'cal-photo'; const tx = document.createElement('div'); tx.className = 'cal-txt'; tx.append(b, s); li.classList.add('has-photo'); li.append(im, tx); }
        else li.append(b, s);
        list.appendChild(li); });
      $$('.cal-day', days).forEach(c => c.setAttribute('aria-selected', String(c.dataset.d === key(d))));
    };
    const render = () => {
      title.textContent = view.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
      days.replaceChildren();
      const first = new Date(view.getFullYear(), view.getMonth(), 1), start = new Date(first); start.setDate(1 - first.getDay());
      for (let w = 0; w < 6; w++) {
        const row = document.createElement('div'); row.setAttribute('role', 'row'); row.className = 'cal-row';
        for (let i = 0; i < 7; i++) {
          const d = new Date(start); d.setDate(start.getDate() + w * 7 + i);
          const b = document.createElement('button'); b.type = 'button'; b.className = 'cal-day'; b.dataset.d = key(d); b.setAttribute('role', 'gridcell');
          if (d.getMonth() !== view.getMonth()) b.classList.add('out');
          if (inTerm(d)) b.classList.add('term');
          if (key(d) === key(today)) b.classList.add('today');
          const n = document.createElement('span'); n.className = 'n'; n.textContent = d.getDate(); b.appendChild(n);
          const items = on(d).filter(x => x.k !== 'term');
          items.slice(0, 2).forEach(x => { const t = document.createElement('span'); t.className = 'ev cal-' + x.k; t.textContent = x.t; b.appendChild(t); });
          if (items.length > 2) { const m = document.createElement('span'); m.className = 'more'; m.textContent = '+' + (items.length - 2) + ' more'; b.appendChild(m); }
          b.setAttribute('aria-label', fmt(d) + (items.length ? ', ' + items.map(x => x.t).join(', ') : ''));
          b.tabIndex = key(d) === key(sel) ? 0 : -1;
          b.addEventListener('click', () => showDay(d));
          b.addEventListener('keydown', ev => {
            const step = {ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7}[ev.key]; if (!step) return;
            ev.preventDefault(); const nd = new Date(d); nd.setDate(d.getDate() + step);
            if (nd.getMonth() !== view.getMonth()) { view = new Date(nd.getFullYear(), nd.getMonth(), 1); }
            sel = nd; render(); showDay(nd); const c = $('.cal-day[data-d="' + key(nd) + '"]', days); if (c) c.focus();
          });
          row.appendChild(b);
        }
        days.appendChild(row);
      }
      showDay(sel);
    };
    $('#cal-prev').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
    $('#cal-next').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
    $('#cal-today').addEventListener('click', () => { view = new Date(today.getFullYear(), today.getMonth(), 1); sel = today; render(); });
    $$('[data-calcat]').forEach(c => c.addEventListener('click', () => { cat = c.dataset.calcat; $$('[data-calcat]').forEach(x => x.setAttribute('aria-pressed', String(x === c))); render(); }));
    $('#cal-ics').addEventListener('click', () => {
      const z = s => s.replace(/-/g, ''), nx = s => { const d = D(s); d.setDate(d.getDate() + 1); return key(d).replace(/-/g, ''); };
      const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aurelian College of the Arts//Calendar//EN'];
      evs.filter(x => x.k !== 'term').forEach((x, i) => lines.push('BEGIN:VEVENT', 'UID:aurelian-' + i + '@aurelianarts.edu', 'DTSTAMP:20261026T120000Z', 'DTSTART;VALUE=DATE:' + z(x.s), 'DTEND;VALUE=DATE:' + nx(x.e), 'SUMMARY:' + x.t, 'END:VEVENT'));
      lines.push('END:VCALENDAR');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], {type: 'text/calendar'})); a.download = 'aurelian-2026-27.ics';
      document.body.appendChild(a); a.click(); a.remove();
    });
    render();
    const calGo = (s, scroll) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
      const d = D(s); view = new Date(d.getFullYear(), d.getMonth(), 1); sel = d; cat = 'all';
      $$('[data-calcat]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.calcat === 'all')));
      render();
      if (scroll) { const sec = $('#calendar'); if (sec) sec.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}); }
      const c = $('.cal-day[data-d="' + s + '"]', days); if (c) c.focus({preventScroll: true});
      return true;
    };
    try { const qd = new URLSearchParams(location.search).get('d'); if (qd) setTimeout(() => calGo(qd, true), 60); } catch (e) {}
    document.addEventListener('click', ev => {
      const a = ev.target.closest('[data-cal-go]'); if (!a) return;
      if (calGo(a.dataset.calGo, true)) { ev.preventDefault(); try { history.replaceState(null, '', '?d=' + a.dataset.calGo + '#calendar'); } catch (e) {} }
    });
  }

  /* ---------- Find your House (major decides it) ---------- */
  const FIND = window.AURELIAN_FIND;
  if (FIND) {
    const sel = $('#hf-major'), out = $('#hf-out');
    sel.addEventListener('change', () => {
      const p = FIND.p[sel.value];
      if (!p) { out.innerHTML = '<p class="muted">Pick a major to see the House you\'d join, where you\'d live, and who\'d look after you.</p>'; return; }
      const h = FIND.h[p.hk];
      const wrap = document.createElement('div'); wrap.className = 'find-res pop';
      const img = document.createElement('img'); img.src = 'assets/img/house-' + p.hk + '.webp'; img.alt = h.name + ' crest'; img.width = 180; img.height = 232;
      const box = document.createElement('div');
      const eb = document.createElement('p'); eb.className = 'eyebrow'; eb.textContent = 'Your House';
      const t = document.createElement('h3'); t.textContent = h.name;
      const m = document.createElement('p'); m.className = 'muted'; m.textContent = 'The House of ' + h.art.toLowerCase() + '. "' + h.motto + '": ' + h.trans + '.';
      const dl = document.createElement('dl'); dl.className = 'kv';
      [['You\'d live in', h.wing + ', Ashcombe Hall'], ['Common room', h.room], ['Head of House', h.head], ['Admissions advisor', h.adv], ['House Captain', h.cap]].forEach(([a, b]) => {
        const dt = document.createElement('dt'); dt.textContent = a; const dd = document.createElement('dd'); dd.textContent = b; dl.append(dt, dd); });
      const a = document.createElement('a'); a.className = 'link'; a.href = 'houses.html#' + p.hk; a.textContent = 'Meet ' + h.name;
      a.addEventListener('click', () => { const tab = $('#tab-' + p.hk); if (tab) { tab.click(); } });
      box.append(eb, t, m, dl, a); wrap.append(img, box); out.replaceChildren(wrap);
    });
  }

  /* ---------- Room galleries ---------- */
  $$('[data-gal]').forEach(g => {
    const main = $('.room-main', g), cap = $('.room-cap', g);
    $$('.room-thumb', g).forEach(b => b.addEventListener('click', () => {
      main.src = b.dataset.src; main.alt = b.dataset.alt;
      cap.firstChild.textContent = b.dataset.cap;
      main.classList.remove('swap'); void main.offsetWidth; if (!reduce) main.classList.add('swap');
      $$('.room-thumb', g).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    }));
  });

  /* ---------- Manhattan routes ---------- */
  const ROUTES = window.AURELIAN_ROUTES;
  if (ROUTES) {
    const show = k => {
      $$('.region .route').forEach(r => r.classList.toggle('on', r.id === 'route-' + k));
      $$('[data-route]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.route === k)));
      $('#route-title').textContent = ROUTES[k].t; $('#route-desc').textContent = ROUTES[k].d;
    };
    $$('[data-route]').forEach(c => c.addEventListener('click', () => show(c.dataset.route)));
    show('broadway');
  }

  /* ---------- Table search (Sources) ---------- */
  $$('[data-filter-input]').forEach(inp => {
    const rows = $$('#' + inp.dataset.filterInput + ' [data-row], #' + inp.dataset.filterInput + ' tbody tr');
    inp.addEventListener('input', () => { const q = inp.value.trim().toLowerCase(); rows.forEach(r => { r.hidden = q && !r.textContent.toLowerCase().includes(q); }); });
  });

  /* ---------- MyAurelian: spellbook sign-in for students and faculty, then the portal ---------- */
  const SI = window.AURELIAN_SI;
  if (SI) {
    const store = {
      get(k, d) { try { const v = localStorage.getItem('aurelian-pt-' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
      set(k, v) { try { localStorage.setItem('aurelian-pt-' + k, JSON.stringify(v)); } catch (e) {} }
    };
    const ses = {
      get() { try { return JSON.parse(sessionStorage.getItem('aurelian-pt-user') || 'null'); } catch (e) { return null; } },
      set(v) { try { v ? sessionStorage.setItem('aurelian-pt-user', JSON.stringify(v)) : sessionStorage.removeItem('aurelian-pt-user'); } catch (e) {} }
    };
    const esc = s => String(s).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);
    const live = msg => { const l = $('#pt-live'); l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); };
    const tabs = $$('.si-tab'), gate = $('#si-gate'), dash = $('#si-dash');
    const book = $('#spellbook'), back = $('.cover-back'), pageR = $('.bpage-r');
    const MODE = {
      student: {title: 'The Book of Aurelian', sub: 'For students', name: 'College email or student ID', kick: 'Speak, and enter',
        rules: ['It opens only for members of the College.', 'Never share your incantation, not even with your House.', 'Close the book when you leave a shared computer.']},
      staff: {title: 'The Fellows’ Register', sub: 'For faculty & staff', name: 'Your staff email or ID', kick: 'Sign the register',
        rules: ['Only Fellows and staff may write in this book.', 'Student records stay inside the College.', 'Close the book before you leave the studio.']}
    };
    let mode = 'student';
    const setOpen = open => {
      book.classList.toggle('open', open);
      pageR.inert = !open; $('#book-open').setAttribute('aria-expanded', String(open)); $('#book-open').tabIndex = open ? -1 : 0;
      back.setAttribute('aria-hidden', String(!open));
    };
    const setMode = m => {
      mode = m; const M = MODE[m];
      book.dataset.mode = m; setOpen(false);
      $('#cover-title').textContent = M.title; $('#cover-sub').textContent = M.sub;
      $('#sp-name-l').textContent = M.name; $('#sp-kicker').textContent = M.kick;
      $('#book-rules').innerHTML = M.rules.map(r => '<li>' + esc(r) + '</li>').join('');
      $$('[data-for]', book).forEach(f => { f.hidden = f.dataset.for !== m; });
      $('#si-panel').setAttribute('aria-labelledby', 'tab-' + m);
      ['#sp-name-err', '#sp-pass-err'].forEach(s => { $(s).textContent = ''; });
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => {
        tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
        setMode(t.dataset.mode);
      });
      t.addEventListener('keydown', ev => { if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); const n = tabs[(i + (ev.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; n.click(); n.focus(); } });
    });
    setOpen(false);
    $('#book-open').addEventListener('click', () => { setOpen(true); setTimeout(() => $('#sp-name').focus(), reduce ? 0 : 900); });
    $('#sp-forgot').addEventListener('click', ev => { ev.preventDefault(); $('#sp-pass-err').textContent = mode === 'staff' ? 'IT can reset it: (555) 014-1900, day or night.' : 'The Porter\'s Lodge can reset it: (555) 014-0001, any hour.'; });

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
    const fmt = s => new Date(s + 'T12:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
    const upcoming = SI.cal.filter(x => new Date(x.s + 'T12:00') >= new Date(now.toDateString())).slice(0, 4);
    const card = (title, inner, cls) => '<article class="dash-card' + (cls ? ' ' + cls : '') + '"><h3>' + title + '</h3>' + inner + '</article>';
    const list = items => items.length ? '<ul>' + items.map(([a, b]) => '<li><span>' + a + '</span><small>' + b + '</small></li>').join('') + '</ul>' : '<p class="muted">Nothing here yet.</p>';
    const todayISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    let user = null;

    // Section renderers
    const S = {};
    const msgsKey = () => 'msgs-' + user.role;
    const getMsgs = () => store.get(msgsKey(), SI.msgs[user.role].map((m, i) => Object.assign({id: 'm' + i, read: false, box: 'in'}, m)));
    const getBk = () => store.get('bk-' + user.role, user.role === 'student'
      ? [{id: 'b0', r: 'Practice room 14 (piano)', d: todayISO, t: '21:00', h: 2}]
      : [{id: 'b0', r: 'Long Gallery', d: todayISO, t: '13:00', h: 2}]);
    const tm = t => { const [h, m] = t.split(':').map(Number); return ((h + 11) % 12 + 1) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm'); };
    const bkLine = b => [esc(b.r), fmt(b.d) + ', ' + tm(b.t) + ' for ' + b.h + (b.h > 1 ? ' hours' : ' hour')];

    const ord = n => n + (['th', 'st', 'nd', 'rd'][((n % 100) - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
    const cupBars = compact => {
      const all = Object.entries(SI.cupAll).sort((a, b) => b[1].pts - a[1].pts), max = all[0][1].pts;
      const rank = all.findIndex(([k]) => k === user.hk) + 1, mine = SI.cupAll[user.hk], next = all[rank - 2], behind = all[rank];
      const lead = rank === 1 ? mine.n.split(' ')[0] + ' is 1st, ' + (mine.pts - behind[1].pts) + ' points ahead of ' + behind[1].n.split(' ')[0] + '.' : mine.n.split(' ')[0] + ' is ' + ord(rank) + ', ' + (next[1].pts - mine.pts) + ' points behind ' + next[1].n.split(' ')[0] + '.';
      return '<p class="cup-lead">' + esc(lead) + '</p><ol class="cup-bars' + (compact ? ' compact' : '') + '">' + all.map(([k, v], i) =>
        '<li class="' + (k === user.hk ? 'mine' : '') + '"><span class="cup-n">' + ord(i + 1) + '</span><img src="assets/img/house-' + k + '.webp" alt="" width="180" height="232"><span class="cup-h">' + esc(v.n.split(' ')[0]) + (k === user.hk ? ' <small>your House</small>' : '') + '</span><span class="cup-track"><span style="width:' + Math.round(v.pts / max * 100) + '%"></span></span><b>' + v.pts + '</b></li>').join('') + '</ol>';
    };
    const person = (lbl, p, extra) => '<div class="hp-person"><img src="' + esc(p.img) + '" alt="" width="240" height="240"><div><p class="hp-label">' + esc(lbl) + '</p><h3>' + esc(p.n) + '</h3>' + (extra || '') + '</div></div>';
    S.house = () => {
      const H = SI.hd[user.hk], h = SI.houses[user.hk];
      const mine = H.awards.reduce((n, a) => n + a.p, 0);
      const evs = H.ev.map(e => '<li><a href="events.html?d=' + e.d + '#calendar"><span class="hu-date"><small>' + new Date(e.d + 'T12:00').toLocaleDateString('en-US', {month: 'short'}).toUpperCase() + '</small><b>' + new Date(e.d + 'T12:00').getDate() + '</b></span><span class="hu-txt"><b>' + esc(e.t) + '</b><small>' + esc(e.v) + '</small></span></a></li>').join('');
      return '<div class="pt-head"><h2>' + esc(h.name) + '</h2><p class="muted">' + esc(h.wing) + ' · ' + esc(H.colors) + '</p></div>' +
        '<div class="pt-two"><div class="card"><div class="body"><h3>The Muses’ Cup</h3>' + cupBars(false) + '<p class="hint">Updated every Friday at Formal Dinner. <a href="houses.html#cup">How points work</a></p></div></div>' +
        (user.role === 'student' ? '<div class="card"><div class="body"><h3>Your points this term</h3><p class="dash-big">' + mine + '</p><ul class="pt-list">' + H.awards.map(a => '<li><span><b>+' + a.p + ' · ' + esc(a.t) + '</b><small>' + esc(a.d) + ', from ' + esc(a.by) + '</small></span></li>').join('') + '</ul></div></div></div>' : '<div class="card"><div class="body"><h3>Your role</h3><p>' + esc(FA.role) + '</p><p class="muted">You lead a weekly tutorial group of eight Melpomene students and sit at the High Table at Formal Dinner.</p></div></div></div>') +
        '<h3 class="pt-sub">Your House team</h3><div class="pt-people">' +
          person('Head of House', H.head, '<a href="mailto:' + esc(H.head.e) + '">' + esc(H.head.e) + '</a>') + person('House Captain', H.cap) + person('Your Floor Prefect', H.floor, '<a href="hallboard.html">On the Hall Board</a>') + person('Welfare Prefect', H.welfare, '<span class="muted">A confidential first stop</span>') + '</div>' +
        '<div class="pt-two"><div class="card"><div class="body"><h3>Coming up in ' + esc(h.name.split(' ')[0]) + '</h3><ul class="hu-list">' + evs + '</ul><a class="link" href="events.html#calendar">Full calendar</a></div></div>' +
        '<div class="card"><div class="body"><h3>Your room</h3><p>' + esc((user.room || h.wing + ', Ashcombe Hall')) + '</p><p class="muted">Common room: ' + esc(H.room) + '</p><p class="muted">Signature event: <a href="events.html?d=' + H.sigd + '#calendar">' + esc(H.sig) + '</a></p><a class="link" href="hallboard.html">Open the Hall Board</a></div></div></div>';
    };
    S.today = () => {
      const unread = getMsgs().filter(m => m.box === 'in' && !m.read).length;
      const bks = getBk().slice(0, 2).map(bkLine);
      if (user.role === 'student') {
        const h = SI.houses[user.hk];
        const cs = SI.courses[user.hk];
        return '<div class="dash-grid">' +
          card('Today', list(cs.slice(0, 3).map(c => [esc(c.t), esc(c.m.split(' ').slice(-1)[0]) + ' · ' + esc(c.r)]))) +
          card('The Muses\u2019 Cup', cupBars(true) + '<button class="btn btn-line btn-sm" type="button" data-go="house">See your House</button>', 'cup-card') +
          card('Your bookings', list(bks) + '<button class="btn btn-line btn-sm" type="button" data-go="book">Book a studio</button>') +
          card('Money', '<p class="dash-big">$0</p><p class="muted">Due this term. Your Promise grant and work-study cover the rest.</p><button class="link" type="button" data-go="money">See the details</button>') +
          card('Coming up', list(upcoming.map(x => [esc(x.t), fmt(x.s)]))) +
          card('Messages', '<p class="dash-big">' + unread + '</p><p class="muted">' + (unread === 1 ? 'Unread message' : 'Unread messages') + '</p><button class="btn btn-line btn-sm" type="button" data-go="msgs">Open your messages</button>') + '</div>';
      }
      const g = store.get('grades', {});
      const todo = SI.teach.reduce((n, c) => n + c.roster.filter(s => !(g[c.c] && g[c.c][s] && g[c.c][s].c)).length, 0);
      const ap = store.get('approvals', {});
      const pending = SI.advisees.filter(a => !ap[a.n]).length;
      return '<div class="dash-grid">' +
        card('Today', list(SI.teach.map(c => [esc(c.t), esc(c.m) + ' · ' + esc(c.r)]))) +
        card('Midterm comments', '<p class="dash-big">' + todo + '</p><p class="muted">Students still need a comment. Due November 6.</p><button class="btn btn-line btn-sm" type="button" data-go="classes">Write comments</button>') +
        card('Advisee requests', '<p class="dash-big">' + pending + '</p><p class="muted">Waiting for your signature.</p><button class="link" type="button" data-go="advisees">Review requests</button>') +
        card('Room bookings', list(bks) + '<button class="btn btn-line btn-sm" type="button" data-go="book">Book a room</button>') +
        card('Coming up', list(upcoming.map(x => [esc(x.t), fmt(x.s)]))) +
        card('Messages', '<p class="dash-big">' + unread + '</p><p class="muted">' + (unread === 1 ? 'Unread message' : 'Unread messages') + '</p><button class="btn btn-line btn-sm" type="button" data-go="msgs">Open your messages</button>') + '</div>';
    };

    S.classes = () => {
      if (user.role === 'student') {
        const cs = SI.courses[user.hk];
        const total = cs.reduce((n, c) => n + c.cr, 0);
        return '<div class="pt-head"><h2>Your classes</h2><p class="muted">Autumn term · ' + total + ' credits</p></div><div class="pt-courses">' + cs.map(c =>
          '<article class="pt-course"><p class="pt-code">' + esc(c.c) + ' · ' + c.cr + ' credits</p><h3>' + esc(c.t) + '</h3><dl class="kv"><dt>Fellow</dt><dd>' + esc(c.f) + '</dd><dt>Meets</dt><dd>' + esc(c.m) + '</dd><dt>Where</dt><dd>' + esc(c.r) + '</dd></dl>' +
          '<details><summary>Midterm comment</summary><p>' + esc(c.mc) + '</p></details></article>').join('') + '</div>';
      }
      const sel = store.get('cls', 0); const c = SI.teach[sel] || SI.teach[0];
      const g = store.get('grades', {}); const cg = g[c.c] || {};
      const opts = ['', 'Excellent', 'Good', 'Satisfactory', 'Needs attention'];
      return '<div class="pt-head"><h2>Your classes</h2><div class="field pt-inline"><label for="pt-cls">Class</label><select id="pt-cls">' + SI.teach.map((t, i) => '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + esc(t.c + ' ' + t.t) + '</option>').join('') + '</select></div></div>' +
        '<p class="muted">' + esc(c.m) + ' · ' + esc(c.r) + ' · ' + c.roster.length + ' students. Midterm comments are due November 6.</p>' +
        '<form id="pt-grades" class="pt-grades" novalidate><ul class="roster" aria-label="Class roster">' +
        c.roster.map((s, i) => { const v = cg[s] || {}; return '<li class="roster-row"><p class="roster-name">' + esc(s) + '</p><div class="field"><label for="g' + i + '">Progress</label><select id="g' + i + '" data-s="' + esc(s) + '" data-k="g">' + opts.map(o => '<option' + (v.g === o ? ' selected' : '') + ' value="' + o + '">' + (o || 'Choose') + '</option>').join('') + '</select></div>' +
          '<div class="field"><label for="c' + i + '">Comment</label><input id="c' + i + '" data-s="' + esc(s) + '" data-k="c" value="' + esc(v.c || '') + '" maxlength="200" placeholder="One or two sentences"></div></li>'; }).join('') +
        '</ul><div class="row"><button class="btn btn-gold" type="submit">Save comments</button><span class="muted" id="pt-gstat"></span></div></form>';
    };

    S.advisees = () => {
      const ap = store.get('approvals', {});
      return '<div class="pt-head"><h2>Your advisees</h2><p class="muted">Requests that need your signature.</p></div><div class="pt-courses">' + SI.advisees.map(a => {
        const st = ap[a.n];
        return '<article class="pt-course"><p class="pt-code">' + esc(a.p) + '</p><h3>' + esc(a.n) + '</h3><p>' + esc(a.req) + '</p>' +
          (st ? '<p class="pt-status ' + st + '">' + (st === 'ok' ? 'Signed' : 'Sent back with a note') + '</p><button class="link" type="button" data-undo="' + esc(a.n) + '">Undo</button>'
              : '<div class="row"><button class="btn btn-ink btn-sm" type="button" data-sign="' + esc(a.n) + '">Sign</button><button class="btn btn-line btn-sm" type="button" data-decline="' + esc(a.n) + '">Ask to talk first</button></div>') + '</article>';
      }).join('') + '</div>';
    };

    S.book = () => {
      const bks = getBk();
      const rooms = SI.rooms[user.role];
      return '<div class="pt-head"><h2>' + (user.role === 'student' ? 'Book a studio' : 'Book a room') + '</h2><p class="muted">Bookings open two weeks ahead. Up to 3 hours at a time.</p></div><div class="pt-two">' +
        '<form id="pt-bk" class="pt-form card" novalidate><div class="body">' +
        '<div class="field"><label for="bk-r">Space</label><select id="bk-r">' + rooms.map(r => '<option>' + esc(r) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="bk-d">Date</label><input id="bk-d" type="date" value="' + todayISO + '" min="' + todayISO + '"><p class="err" id="bk-d-err" aria-live="polite"></p></div>' +
        '<div class="pt-row"><div class="field"><label for="bk-t">Start</label><input id="bk-t" type="time" value="18:00" step="1800"></div><div class="field"><label for="bk-h">Hours</label><select id="bk-h"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select></div></div>' +
        '<p class="err" id="bk-err" aria-live="polite"></p><button class="btn btn-gold" type="submit">Book it</button></div></form>' +
        '<div class="card"><div class="body"><h3>Your bookings</h3>' + (bks.length ? '<ul class="pt-list">' + bks.map(b => { const [a, t] = bkLine(b); return '<li><span><b>' + a + '</b><small>' + t + '</small></span><button class="link" type="button" data-cancel="' + b.id + '">Cancel</button></li>'; }).join('') + '</ul>' : '<p class="muted">No bookings yet.</p>') + '</div></div></div>';
    };

    S.money = () => {
      const claims = store.get('claims', []);
      const used = claims.reduce((n, c) => n + c.a, 0);
      return '<div class="pt-head"><h2>Money</h2><p class="muted">Autumn term account</p></div><div class="pt-two">' +
        '<div class="card"><div class="body"><dl class="bill">' +
        '<div><dt>Tuition, room, and meals</dt><dd>$16,600</dd></div><div class="bill-credit"><dt>Aurelian Promise grant</dt><dd>−$15,100</dd></div><div class="bill-credit"><dt>Work-study (box office)</dt><dd>−$1,500</dd></div>' +
        '<div class="bill-total"><dt>You owe this term</dt><dd>$0</dd></div></dl><a class="link" href="tuition.html#how-aid">How your aid works</a></div></div>' +
        '<form id="pt-claim" class="pt-form card" novalidate><div class="body"><h3>Travel Grant</h3><p class="muted"><b>$' + (5000 - used).toLocaleString() + '</b> left of $5,000 this year.</p>' +
        '<div class="field"><label for="cl-w">What for</label><select id="cl-w"><option>Flight home for winter break</option><option>Flight back in January</option><option>Train or bus</option><option>Checked bags</option></select></div>' +
        '<div class="field"><label for="cl-a">Amount in dollars</label><input id="cl-a" inputmode="decimal" placeholder="e.g. 320"><p class="err" id="cl-err" aria-live="polite"></p></div>' +
        '<button class="btn btn-ink" type="submit">Claim it back</button>' +
        (claims.length ? '<ul class="pt-list">' + claims.map(c => '<li><span><b>' + esc(c.w) + '</b><small>$' + c.a.toLocaleString() + ' · paid within a week</small></span></li>').join('') + '</ul>' : '') + '</div></form></div>';
    };

    S.guests = () => {
      const mine = GUEST.list().filter(x => x.host.toLowerCase().split(' ')[0] === user.who.toLowerCase().split(' ')[0]);
      return '<div class="pt-head"><h2>Guests</h2><p class="muted">Register guests by 9pm. They sign in at the Porter’s Lodge with a photo ID.</p></div><div class="pt-two">' +
        '<form id="pt-gp" class="pt-form card" novalidate><div class="body"><h3>Register a guest</h3>' +
        '<div class="field"><label for="pg-guest">Guest’s name</label><input id="pg-guest"></div>' +
        '<div class="field"><label for="pg-kind">Type of visit</label><select id="pg-kind"><option value="day">Day visit, 8am to 11pm</option><option value="night">Overnight</option></select></div>' +
        '<div class="field"><label for="pg-c">How many guests</label><select id="pg-c"><option value="1">1 guest</option><option value="2">2 guests</option><option value="3">3 guests</option></select><p class="hint">Up to 3 day visitors at a time, or 1 overnight guest a night.</p></div>' +
        '<div class="pt-row"><div class="field"><label for="pg-date">Date</label><input id="pg-date" type="date" value="' + todayISO + '"></div><div class="field"><label for="pg-n">Nights</label><select id="pg-n"><option>1</option><option>2</option><option>3</option></select></div></div>' +
        '<label class="check"><input type="checkbox" id="pg-agree"><span>My roommates agree (overnight)</span></label><label class="check"><input type="checkbox" id="pg-minor"><span>My guest is under 18</span></label>' +
        '<p class="err" id="pg-err" aria-live="polite"></p><button class="btn btn-gold" type="submit">Get a guest pass</button></div></form>' +
        '<div class="card"><div class="body"><h3>Your guest passes</h3>' + (mine.length ? mine.map(p => GUEST.card(p) + '<button class="link" type="button" data-gp-cancel="' + esc(p.id) + '">Cancel ' + esc(p.id) + '</button>').join('') : '<p class="muted">No guests registered yet.</p>') + '</div></div></div>';
    };

    let openMsg = null;
    S.msgs = () => {
      const ms = getMsgs();
      const m = ms.find(x => x.id === openMsg);
      return '<div class="pt-head"><h2>Messages</h2><button class="btn btn-line btn-sm" type="button" id="pt-new">Write a message</button></div><div class="pt-mail">' +
        '<ul class="pt-inbox">' + ms.slice().reverse().map(x => '<li><button type="button" class="pt-mi' + (x.read || x.box === 'out' ? '' : ' unread') + (x.id === openMsg ? ' on' : '') + '" data-msg="' + x.id + '"><b>' + (x.box === 'out' ? 'To: ' : '') + esc(x.f) + '</b><span>' + esc(x.s) + '</span></button></li>').join('') + '</ul>' +
        '<div class="pt-read card"><div class="body">' + (m ? '<p class="pt-code">' + (m.box === 'out' ? 'To ' : 'From ') + esc(m.f) + '</p><h3>' + esc(m.s) + '</h3><p>' + esc(m.b) + '</p>' : '<p class="muted">Pick a message to read it.</p>') + '</div></div></div>' +
        '<form id="pt-compose" class="pt-form card" hidden novalidate><div class="body"><h3>New message</h3>' +
        '<div class="field"><label for="ms-to">To</label><select id="ms-to">' + SI.contacts[user.role].map(c => '<option>' + esc(c) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="ms-s">Subject</label><input id="ms-s" maxlength="80"></div>' +
        '<div class="field"><label for="ms-b">Message</label><textarea id="ms-b" rows="4" maxlength="600"></textarea><p class="err" id="ms-err" aria-live="polite"></p></div>' +
        '<div class="row"><button class="btn btn-gold" type="submit">Send</button><button class="btn btn-line" type="button" id="ms-x">Cancel</button></div></div></form>';
    };

    /* ----- MyAurelian student account: a full portal ----- */
    const ME = SI.me;
    const usd = n => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const pane = (title, inner, cls, act) => '<section class="pp' + (cls ? ' ' + cls : '') + '"><div class="pp-h"><h3>' + title + '</h3>' + (act || '') + '</div>' + inner + '</section>';
    const pill = (t, k) => '<span class="pill' + (k ? ' pill-' + k : '') + '">' + esc(t) + '</span>';
    const gradeK = g => /^A/.test(g) ? 'good' : /^B/.test(g) ? 'ok' : g === 'P' ? 'good' : 'warn';
    const hrs = x => { const h = Math.floor(x), m = Math.round((x - h) * 60); return ((h + 11) % 12 + 1) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm'); };
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const bill = () => {
      const paid = store.get('paid', []);
      const lines = ME.bill.lines.concat(paid.map(p => [p.t, -p.a]));
      return {lines, bal: Math.round(lines.reduce((n, l) => n + l[1], 0) * 100) / 100, paid};
    };
    const plan = () => store.get('plan', ME.reg.cart.map(c => c[0]));
    const CATALOG = ME.reg.cart.concat([['FLM 370', 'Cinematography for Dance', 'Prof. Marisol Vega', 'Fri 1:00pm', 3, 9], ['HUM 230', 'Film Theory', 'Prof. Celeste Moreau', 'Mon 2:00pm', 3, 14], ['CW 220', 'Writing for Television', 'Prof. Wren Calloway', 'Wed 1:00pm', 3, 7], ['DES 210', 'Motion Graphics', 'Prof. Priya Raman', 'Tue 10:00am', 3, 5], ['QRT 300', 'Third Quartet', 'Four Houses', 'Fri 2:00pm', 2, 20]]);
    const dow = (() => { const d = (new Date().getDay() + 6) % 7; return d > 4 ? 0 : d; })();

    const stuToday = () => {
      const b = bill(), done = ME.credits, now = ME.inprog;
      const todo = ME.todo.map((t, i) => '<li><label class="todo"><input type="checkbox" data-todo="' + i + '"' + (store.get('todo', {})[i] ? ' checked' : '') + '><span>' + esc(t.t) + '</span></label><small>' + esc(t.d) + '</small>' + (t.go ? '<button class="link" type="button" data-go="' + t.go + '">Open</button>' : '') + '</li>').join('');
      const today = ME.sched.filter(s => s.d === dow).sort((a, c) => a.s - c.s).map(s => '<li class="tl-' + s.k + '"><b>' + hrs(s.s) + '</b><span>' + esc(s.t) + '<small>' + esc(s.w) + '</small></span></li>').join('');
      const cg = ME.courses.map(c => '<li><button type="button" class="row-btn" data-go="classes"><span><b>' + esc(c.c) + '</b> ' + esc(c.t) + '</span>' + pill(c.g, gradeK(c.g)) + '</button></li>').join('');
      return '<div class="kpis">' +
        '<button class="kpi" type="button" data-go="grades"><span>Cumulative GPA</span><b>' + ME.gpa + '</b><small>Dean&#39;s List, Spring and Summer</small></button>' +
        '<button class="kpi" type="button" data-go="progress"><span>Credits</span><b>' + done + ' <i>/ ' + ME.total + '</i></b><small>' + now + ' more in progress</small></button>' +
        '<button class="kpi" type="button" data-go="billing"><span>Balance</span><b>' + usd(b.bal) + '</b><small>' + (b.bal > 0 ? 'Due ' + esc(ME.bill.due) : 'Paid in full') + '</small></button>' +
        '<button class="kpi" type="button" data-go="housing"><span>Meal swipes</span><b>' + ME.meal.swipes + '</b><small>' + usd(ME.meal.dollars) + ' dining dollars</small></button></div>' +
        '<div class="pp-cols"><div>' +
          pane('To do', '<ul class="todo-list">' + todo + '</ul>') +
          pane(DAYS[dow] + '&#39;s schedule', today ? '<ul class="day-list">' + today + '</ul>' : '<p class="muted">Nothing scheduled.</p>', '', '<button class="link" type="button" data-go="schedule">Full week</button>') +
          pane('Your courses this term', '<ul class="row-list">' + cg + '</ul>', '', '<button class="link" type="button" data-go="classes">All courses</button>') +
        '</div><div>' +
          pane('The Muses’ Cup', cupBars(true), 'pp-cup', '<button class="link" type="button" data-go="house">My House</button>') +
          pane('Notifications', '<ul class="note-list">' + ME.notifs.map(n => '<li><span>' + esc(n.t) + '</span><small>' + esc(n.d) + '</small></li>').join('') + '</ul>') +
          pane('Quick links', '<div class="pt-quick">' + [['Pay your bill', 'billing'], ['Register for Spring', 'register'], ['Book a studio', 'book'], ['Get a guest pass', 'guests'], ['Your student ID', 'card'], ['Book office hours', 'advising']].map(q => '<button class="btn btn-line btn-sm" type="button" data-go="' + q[1] + '">' + q[0] + '</button>').join('') + '<a class="btn btn-line btn-sm" href="tutoring.html#book">Book tutoring</a></div>') +
        '</div></div>';
    };

    const stuSchedule = () => {
      const SRC = user.role === 'student' ? ME : SI.fac;
      const top = 8, bot = 23, rows = bot - top;
      const blocks = SRC.sched.map(s => '<div class="wk-ev wk-' + s.k + '" style="grid-column:' + (s.d + 2) + ';grid-row:' + (Math.round((s.s - top) * 2) + 2) + ' / span ' + Math.max(1, Math.round((s.e - s.s) * 2)) + '"><b>' + esc(s.t) + '</b><small>' + hrs(s.s) + '–' + hrs(s.e) + ' · ' + esc(s.w) + '</small></div>').join('');
      const hours = Array.from({length: rows}, (_, i) => '<span class="wk-hr" style="grid-row:' + (i * 2 + 2) + ' / span 2">' + hrs(top + i) + '</span>').join('');
      const heads = DAYS.map((d, i) => '<span class="wk-day' + (i === dow ? ' on' : '') + '" style="grid-column:' + (i + 2) + '">' + d.slice(0, 3) + '</span>').join('');
      const list = DAYS.map((d, i) => '<li><b>' + d + '</b><ul>' + SRC.sched.filter(s => s.d === i).map(s => '<li>' + hrs(s.s) + ' – ' + esc(s.t) + ' <small>' + esc(s.w) + '</small></li>').join('') + '</ul></li>').join('');
      const legend = (user.role === 'student' ? [['class', 'Classes'], ['work', 'Work-study'], ['house', 'House'], ['quartet', 'Quartet'], ['meet', 'Appointments']] : [['class', 'Teaching'], ['meet', 'Office hours'], ['work', 'Meetings'], ['house', 'House']]).map(l => '<span><i class="wk-' + l[0] + '"></i>' + l[1] + '</span>').join('');
      return '<div class="pt-head"><h2>Weekly schedule</h2><button class="btn btn-line btn-sm" type="button" id="wk-ics">Download to my calendar</button></div>' +
        pane('Autumn 2026 · week 5', '<div class="wk-legend">' + legend + '</div><div class="wk-scroll"><div class="wk" style="grid-template-rows:32px repeat(' + rows * 2 + ',22px)">' + heads + hours + blocks + '</div></div><ul class="wk-list">' + list + '</ul>');
    };

    const stuCourses = () => {
      const cards = ME.courses.map(c => {
        const done = c.a.filter(a => a.s === 'Graded' || a.s === 'Submitted').length;
        const items = c.a.map(a => '<li><span><b>' + esc(a.t) + '</b><small>Due ' + esc(a.d) + '</small></span>' + (a.g ? pill(a.g, gradeK(a.g)) : pill(a.s, a.s === 'Due tomorrow' ? 'warn' : a.s === 'Submitted' ? 'good' : '')) + '</li>').join('');
        return '<article class="course"><div class="course-top"><div><p class="course-code">' + esc(c.c) + ' · ' + c.cr + ' credits</p><h3>' + esc(c.t) + '</h3></div><div class="course-grade"><small>Current grade</small><b>' + esc(c.g) + '</b></div></div>' +
          '<dl class="course-meta"><div><dt>Professor</dt><dd>' + esc(c.p) + '</dd></div><div><dt>Meets</dt><dd>' + esc(c.m) + '</dd></div><div><dt>Room</dt><dd>' + esc(c.r) + '</dd></div></dl>' +
          '<div class="meter" role="img" aria-label="' + done + ' of ' + c.a.length + ' assignments done"><span style="width:' + Math.round(done / c.a.length * 100) + '%"></span></div><p class="hint">' + done + ' of ' + c.a.length + ' assignments done</p>' +
          '<details class="course-hw"><summary>Assignments</summary><ul class="hw">' + items + '</ul></details>' +
          '<div class="row"><button class="btn btn-line btn-sm" type="button" data-go="msgs">Message ' + esc(c.p.replace('Prof. ', 'Prof. ').split(' ').slice(0, 1).join(' ') + ' ' + c.p.split(' ').slice(-1)) + '</button><a class="btn btn-line btn-sm" href="tutoring.html#book">Get tutoring</a></div></article>';
      }).join('');
      return '<div class="pt-head"><h2>Courses</h2><p class="muted">Autumn 2026 · ' + ME.inprog + ' credits · midterm grades posted</p></div><div class="course-grid">' + cards + '</div>' +
        pane('Also this term', '<ul class="row-list"><li><span><b>QRT 300 · Quartet</b> with Terpsichore, Euterpe, and Thalia</span>' + pill('Fridays 2pm', '') + '</li><li><span><b>Floor Prefect</b> · North Cloister floor 2</span>' + pill('Leadership', 'good') + '</li><li><span><b>Work-study</b> · ' + esc(ME.job.t) + '</span>' + pill(ME.job.hrs, '') + '</li></ul>');
    };

    const stuGrades = () => {
      const sel = store.get('gterm', ME.hist.length - 1);
      const t = ME.hist[sel];
      const chips = ME.hist.map((h, i) => '<button class="chip" type="button" data-gterm="' + i + '" aria-pressed="' + (i === sel) + '">' + esc(h.t) + '</button>').join('');
      const max = 4, W = 420, H = 140, bw = W / ME.hist.length;
      const bars = ME.hist.map((h, i) => { const v = parseFloat(h.gpa), bh = (v - 3) / (max - 3) * (H - 30); return '<g><rect x="' + (i * bw + 10) + '" y="' + (H - 20 - bh) + '" width="' + (bw - 20) + '" height="' + bh + '" rx="4" class="' + (i === sel ? 'on' : '') + '"/><text x="' + (i * bw + bw / 2) + '" y="' + (H - 24 - bh) + '" text-anchor="middle">' + h.gpa + '</text><text x="' + (i * bw + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="ax">' + esc(h.t.replace(' 20', ' ’')) + '</text></g>'; }).join('');
      const rows = t.c.map(c => '<li><span><b>' + esc(c.c) + '</b> ' + esc(c.t) + '<small>' + c.cr + ' credits</small></span>' + pill(c.g, gradeK(c.g)) + '</li>').join('');
      const reqs = store.get('transcripts', []);
      return '<div class="pt-head"><h2>Grades &amp; transcript</h2><p class="muted">Cumulative GPA ' + ME.gpa + ' · ' + ME.credits + ' credits earned</p></div>' +
        '<div class="pp-cols"><div>' + pane('Term GPA', '<svg class="gpa-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Term GPA from ' + ME.hist[0].gpa + ' to ' + ME.hist[ME.hist.length - 1].gpa + '">' + bars + '</svg>') +
        pane('Final grades', '<div class="chips">' + chips + '</div><p class="gterm">' + esc(t.t) + ' · term GPA <b>' + t.gpa + '</b></p><ul class="row-list">' + rows + '</ul>') + '</div><div>' +
        pane('In progress: Autumn 2026', '<ul class="row-list">' + ME.courses.map(c => '<li><span><b>' + esc(c.c) + '</b> ' + esc(c.t) + '<small>Midterm grade</small></span>' + pill(c.g, gradeK(c.g)) + '</li>').join('') + '</ul><p class="hint">Final grades post on December 14.</p>') +
        pane('Official transcript', '<p class="muted">The Registrar emails a secure PDF within one working day. Paper copies are mailed in three.</p><div class="row"><button class="btn btn-ink btn-sm" type="button" data-transcript="PDF">Request a PDF</button><button class="btn btn-line btn-sm" type="button" data-transcript="Paper">Mail a paper copy</button></div>' + (reqs.length ? '<ul class="row-list">' + reqs.map(r => '<li><span><b>' + esc(r.k) + ' transcript</b><small>Requested ' + esc(r.d) + '</small></span>' + pill('Processing', 'ok') + '</li>').join('') + '</ul>' : '')) +
        '</div></div>';
    };

    const stuProgress = () => {
      const tot = ME.audit.reduce((n, a) => n + a.need, 0), done = ME.audit.reduce((n, a) => n + a.done, 0), now = ME.audit.reduce((n, a) => n + a.now, 0);
      const rows = ME.audit.map(a => '<li><div class="aud-top"><b>' + esc(a.n) + '</b><span>' + a.done + (a.now ? ' + ' + a.now : '') + ' of ' + a.need + ' credits</span></div><div class="aud-bar"><span class="d" style="width:' + (a.done / a.need * 100) + '%"></span><span class="n" style="width:' + (a.now / a.need * 100) + '%"></span></div>' + (a.done + a.now >= a.need ? pill('On track to complete', 'good') : '') + '</li>').join('');
      const pct = Math.round(done / tot * 100), pct2 = Math.round((done + now) / tot * 100);
      return '<div class="pt-head"><h2>Degree progress</h2><p class="muted">' + esc(ME.major) + ' · ' + esc(ME.minor) + '</p></div>' +
        '<div class="pp-cols"><div>' + pane('Overall', '<div class="aud-ring" style="--p:' + pct + ';--q:' + pct2 + '"><div><b>' + pct + '%</b><small>' + done + ' of ' + tot + ' credits</small></div></div><ul class="aud-legend"><li><i class="d"></i>Completed (' + done + ')</li><li><i class="n"></i>In progress (' + now + ')</li><li><i></i>Still to take (' + (tot - done - now) + ')</li></ul><p class="muted">On track to graduate in <b>May 2028</b>.</p>') + '</div><div>' +
        pane('Requirements', '<ul class="aud-list">' + rows + '</ul>') +
        pane('Still ahead', '<ul class="row-list"><li><span><b>Senior Capstone film</b><small>Fourth year, with your Quartet&#39;s help</small></span>' + pill('Not started', '') + '</li><li><span><b>Two more Quartets</b><small>Spring 2027 and Autumn 2027</small></span>' + pill('Planned', 'ok') + '</li><li><span><b>Minor: 2 more courses</b><small>CW 310 is in your Spring plan</small></span>' + pill('Planned', 'ok') + '</li></ul>') +
        '</div></div>';
    };

    const stuRegister = () => {
      const p = plan(), q = (store.get('regq', '') || '').toLowerCase();
      const inPlan = CATALOG.filter(c => p.includes(c[0]));
      const cr = inPlan.reduce((n, c) => n + c[4], 0);
      const cat = CATALOG.filter(c => !q || (c.join(' ')).toLowerCase().includes(q));
      const line = (c, inp) => '<li><span><b>' + esc(c[0]) + '</b> ' + esc(c[1]) + '<small>' + esc(c[2]) + ' · ' + esc(c[3]) + ' · ' + c[4] + ' credits</small></span>' + pill(c[5] + ' seats left', c[5] < 5 ? 'warn' : 'ok') + '<button class="btn btn-sm ' + (inp ? 'btn-line' : 'btn-ink') + '" type="button" data-plan="' + esc(c[0]) + '">' + (inp ? 'Remove' : 'Add') + '</button></li>';
      return '<div class="pt-head"><h2>Registration</h2><p class="muted">' + esc(ME.reg.term) + '</p></div>' +
        '<div class="reg-banner"><div><p class="hp-label">Your registration time</p><b>' + esc(ME.reg.opens) + '</b><small>Third-years register on day two. No holds on your account.</small></div>' + pill('No holds', 'good') + '</div>' +
        '<div class="pp-cols"><div>' + pane('Your Spring plan', inPlan.length ? '<ul class="row-list reg">' + inPlan.map(c => line(c, true)).join('') + '</ul>' : '<p class="muted">Your plan is empty.</p>', '', '<span class="pill' + (cr > 14 ? ' pill-warn' : ' pill-good') + '">' + cr + ' credits</span>') +
        '<p class="hint">Full-time is 10 to 14 credits a term. When your window opens, your plan registers in one click.</p></div><div>' +
        pane('Find classes', '<div class="field"><label for="reg-q">Search by course, professor, or day</label><input id="reg-q" type="search" value="' + esc(q) + '" placeholder="e.g. Ferrer, editing, Friday"></div><ul class="row-list reg">' + cat.filter(c => !p.includes(c[0])).map(c => line(c, false)).join('') + '</ul>') +
        '</div></div>';
    };

    const stuBilling = () => {
      const b = bill();
      const lines = b.lines.filter(l => l[1] !== 0).map(l => '<li class="' + (l[1] < 0 ? 'cr' : '') + '"><span>' + esc(l[0]) + '</span><b>' + usd(l[1]) + '</b></li>').join('');
      const hist = b.paid.map(p => [p.d, p.t, usd(-p.a)]).concat(ME.bill.history.map(h => [h[0], h[1], h[2]])).map(h => '<li><span><b>' + esc(h[1]) + '</b><small>' + esc(h[0]) + '</small></span><b>' + esc(h[2]) + '</b></li>').join('');
      return '<div class="pt-head"><h2>Account &amp; billing</h2><p class="muted">Student account ' + esc(ME.id) + '</p></div>' +
        '<div class="bal ' + (b.bal > 0 ? 'due' : 'ok') + '"><div><p class="hp-label">' + (b.bal > 0 ? 'Amount due ' + esc(ME.bill.due) : 'Your account') + '</p><b>' + usd(b.bal) + '</b><small>' + (b.bal > 0 ? 'Pay by bank transfer at no cost, or split it into a monthly plan.' : 'Paid in full. Thank you.') + '</small></div>' +
        (b.bal > 0 ? '<div class="row"><button class="btn btn-gold" type="button" data-pay="full">Pay ' + usd(b.bal) + '</button><button class="btn btn-line" type="button" data-pay="plan">Pay monthly: 3 × ' + usd(b.bal / 3) + '</button></div>' : '') + '</div>' +
        '<div class="pp-cols"><div>' + pane(esc(ME.bill.term) + ' statement', '<ul class="stmt">' + lines + '<li class="tot"><span>Balance</span><b>' + usd(b.bal) + '</b></li></ul>') + '</div><div>' +
        pane('Activity', '<ul class="row-list">' + hist + '</ul>') +
        pane('Good to know', '<ul class="ticks"><li>Your price is locked for four years.</li><li>Health insurance is included; no waiver needed.</li><li>Refunds for overpayments go to your bank in 5 working days.</li></ul><a class="link" href="tuition.html">Tuition and fees</a>') +
        '</div></div>';
    };

    const stuAid = () => {
      const claims = store.get('claims', []);
      const used = claims.reduce((n, c) => n + c.a, 0);
      return '<div class="pt-head"><h2>Financial aid</h2><p class="muted">' + esc(ME.aid.year) + ' award</p></div>' +
        '<div class="pp-cols"><div>' + pane('Your award', '<ul class="stmt">' + '<li><span>Cost of attendance</span><b>' + esc(ME.aid.cost) + '</b></li>' + ME.aid.lines.map(l => '<li class="cr"><span>' + esc(l[0]) + '<small>' + esc(l[2]) + '</small></span><b>−' + esc(l[1]) + '</b></li>').join('') + '<li class="tot"><span>Your family pays</span><b>' + esc(ME.aid.family) + '</b></li></ul>') +
          pane('Work-study', '<p><b>' + esc(ME.job.t) + '</b> · ' + esc(ME.job.pay) + '</p><div class="meter"><span style="width:61%"></span></div><p class="hint">' + esc(ME.job.earned) + ' earned of ' + esc(ME.job.cap) + '. Paid every other Friday.</p>') + '</div><div>' +
          pane('Checklist', '<ul class="check-list"><li class="ok">2026–27 FAFSA received</li><li class="ok">Verification complete</li><li class="ok">Award accepted</li><li class="ok">Work-study job confirmed</li><li>' + esc(ME.aid.fafsa) + '</li></ul>') +
          pane('Travel Grant', '<form id="pt-claim" class="pt-form" novalidate><p class="muted"><b>$' + (5000 - used).toLocaleString() + '</b> left of $5,000 this year.</p><div class="field"><label for="cl-w">What for</label><select id="cl-w"><option>Flight home for winter break</option><option>Flight back in January</option><option>Train or bus</option><option>Checked bags</option></select></div><div class="field"><label for="cl-a">Amount in dollars</label><input id="cl-a" inputmode="decimal" placeholder="e.g. 320"><p class="err" id="cl-err" aria-live="polite"></p></div><button class="btn btn-ink" type="submit">Claim it back</button>' +
            (claims.length ? '<ul class="pt-list">' + claims.map(c => '<li><span><b>' + esc(c.w) + '</b><small>$' + c.a.toLocaleString() + ' · paid within a week</small></span></li>').join('') + '</ul>' : '') + '</form>') +
        '</div></div>';
    };

    const stuHousing = () => {
      const reqs = store.get('fix', []), renewed = store.get('renewed', false);
      const m = ME.meal;
      return '<div class="pt-head"><h2>Housing &amp; meals</h2><p class="muted">Ashcombe Hall · ' + esc(SI.houses[ME.hk].name) + '</p></div>' +
        '<div class="pp-cols"><div>' + pane('Your room', '<p class="room-big">' + esc(ME.room) + '</p><div class="pt-people">' + person('Roommate', {n: ME.roommate.n, img: ME.roommate.img}, '<span class="muted">' + esc(ME.roommate.d) + '</span>') + person('Your RA', {n: ME.ra.n, img: ME.ra.img}, '<span class="muted">' + esc(ME.ra.d) + '</span>') + '</div>' +
          '<div class="renew ' + (renewed ? 'done' : '') + '"><span><b>2027–28 housing</b><small>' + (renewed ? 'Renewed: same Duet, same roommate.' : 'Keep your Duet for next year. Renew by November 20.') + '</small></span>' + (renewed ? pill('Renewed', 'good') : '<button class="btn btn-ink btn-sm" type="button" id="renew">Renew my room</button>') + '</div>') +
          pane('Mail and packages', '<ul class="row-list"><li><span><b>1 package</b><small>Arrived yesterday · Porter&#39;s Lodge, open 24 hours</small></span>' + pill('Ready', 'good') + '</li></ul>') + '</div><div>' +
          pane('Meal plan: ' + esc(m.plan), '<div class="meal"><div><span>Swipes left</span><b>' + m.swipes + '</b><div class="meter"><span style="width:' + Math.round(m.swipes / m.swipes_total * 100) + '%"></span></div><small>of ' + m.swipes_total + ' this term</small></div><div><span>Dining dollars</span><b>' + usd(m.dollars) + '</b><div class="meter"><span style="width:' + Math.round(m.dollars / m.dollars_total * 100) + '%"></span></div><small>of ' + usd(m.dollars_total) + '</small></div></div><ul class="row-list"><li><span>The Refectory · dinner<small>Yesterday, 6:41pm</small></span><b>1 swipe</b></li><li><span>Stage Door Café · latte<small>Yesterday, 10:12am</small></span><b>$4.75</b></li><li><span>The Refectory · lunch<small>Oct 25, 12:30pm</small></span><b>1 swipe</b></li></ul>') +
          pane('Request a repair', '<form id="fix-form" class="pt-form" novalidate><div class="field"><label for="fix-k">What needs fixing?</label><select id="fix-k"><option>Heating or air</option><option>Plumbing</option><option>Electrical or lights</option><option>Door, lock, or window</option><option>Furniture</option><option>Something else</option></select></div><div class="field"><label for="fix-d">Tell us more</label><input id="fix-d" placeholder="e.g. the radiator knocks at night"><p class="err" id="fix-err" aria-live="polite"></p></div><button class="btn btn-ink btn-sm" type="submit">Send request</button></form>' +
            (reqs.length ? '<ul class="row-list">' + reqs.map(r => '<li><span><b>' + esc(r.k) + '</b><small>' + esc(r.d) + ' · sent ' + esc(r.at) + '</small></span>' + pill('Received', 'ok') + '</li>').join('') + '</ul>' : '')) +
        '</div></div>';
    };

    const stuAdvising = () => {
      const mine = store.get('appts', []);
      let tut = []; try { tut = JSON.parse(localStorage.getItem('aurelian-tutoring') || '[]'); } catch (e) {}
      const all = ME.appts.map(a => [a.t, a.d, a.w]).concat(mine.map(a => [a.t, a.d, a.w])).concat(tut.map(t => ['Tutoring', t.s, t.w]));
      const slots = ['Tue, Nov 3, 3:00pm', 'Tue, Nov 3, 3:30pm', 'Tue, Nov 3, 4:30pm', 'Tue, Nov 10, 3:00pm'];
      const A = ME.advisor;
      return '<div class="pt-head"><h2>Advising &amp; appointments</h2></div><div class="pp-cols"><div>' +
        pane('Your advisor', '<div class="pt-people one">' + person('Faculty advisor', {n: A.n, img: A.img}, '<a href="mailto:' + esc(A.e) + '">' + esc(A.e) + '</a>') + '</div><p class="muted">Office hours: ' + esc(A.hours) + '</p><p class="hp-label">Book office hours</p><div class="chips" id="adv-slots">' + slots.map(s => '<button class="chip" type="button" data-slot="' + esc(s) + '"' + (mine.some(m => m.d === s) ? ' disabled' : '') + '>' + esc(s) + '</button>').join('') + '</div>') +
        pane('Upcoming', all.length ? '<ul class="row-list">' + all.map(a => '<li><span><b>' + esc(a[0]) + '</b><small>' + esc(a[1]) + ' · ' + esc(a[2]) + '</small></span>' + pill('Booked', 'good') + '</li>').join('') + '</ul>' : '<p class="muted">Nothing booked.</p>') + '</div><div>' +
        pane('More support', '<ul class="support"><li><a href="tutoring.html"><b>Tutoring</b><small>Free help in English and every subject</small></a></li><li><a href="staff.html"><b>Wellbeing Centre</b><small>Counselors, walk-ins every afternoon from 2pm</small></a></li><li><a href="accessibility.html"><b>Accessibility Services</b><small>Accommodations for classes, juries, and housing</small></a></li><li><a href="careers.html"><b>The Stage Door Office</b><small>Internships, reels, and jobs</small></a></li><li><a href="career-guide.html"><b>How to get an internship</b><small>Step by step, for Film</small></a></li></ul>') +
        '</div></div>';
    };

    const stuLibrary = () => {
      const ren = store.get('renew', {});
      return '<div class="pt-head"><h2>Library &amp; equipment</h2><p class="muted">The Library is open 8am to midnight; the equipment cage until 10pm.</p></div><div class="pp-cols"><div>' +
        pane('On loan', '<ul class="row-list">' + ME.loans.map((l, i) => '<li><span><b>' + esc(l.t) + '</b><small>' + (ren[i] ? 'Renewed · due in 2 weeks' : esc(l.d)) + '</small></span>' + (ren[i] ? pill('Renewed', 'good') : '<button class="btn btn-line btn-sm" type="button" data-renew="' + i + '">Renew</button>') + '</li>').join('') + '</ul>') + '</div><div>' +
        pane('Your account', '<ul class="stmt"><li><span>Printing balance</span><b>$8.40</b></li><li><span>Fines</span><b>$0.00</b></li><li><span>Holds ready for pickup</span><b>1</b></li></ul><p class="hint">Hold ready: <i>The Five C&#39;s of Cinematography</i>, at the front desk until Nov 2.</p>') +
        '</div></div>';
    };

    const stuCard = () => {
      let bars = ''; let x = 0; for (const ch of (ME.id + '*' + ME.id).split('')) { const w = (ch.charCodeAt(0) % 3) + 1; bars += '<rect x="' + x + '" y="0" width="' + w + '" height="40"/>'; x += w + ((ch.charCodeAt(0) % 2) + 1); }
      const lost = store.get('lost', false);
      return '<div class="pt-head"><h2>Student ID</h2><p class="muted">Show this at the Porter&#39;s Lodge, the Refectory, the Library, and every studio door.</p></div><div class="pp-cols"><div>' +
        '<div class="idcard" data-house="' + ME.hk + '"><div class="id-top"><img src="assets/img/crest-sm.webp" alt="" width="160" height="134"><span><b>Aurelian College of the Arts</b><small>Student</small></span><img class="id-house" src="assets/img/house-' + ME.hk + '.webp" alt="" width="180" height="232"></div>' +
        '<div class="id-body"><img class="id-photo" src="' + esc(ME.img) + '" alt="" width="240" height="240"><div><p class="id-name">' + esc(ME.name) + '</p><p>' + esc(SI.houses[ME.hk].name) + '</p><p>' + esc(ME.major) + '</p><p class="id-no">ID ' + esc(ME.id) + '</p><p class="id-valid">Valid through June 2027</p></div></div>' +
        '<svg class="id-bar" viewBox="0 0 ' + x + ' 40" preserveAspectRatio="none" aria-hidden="true">' + bars + '</svg></div></div><div>' +
        pane('What your card opens', '<ul class="ticks"><li>Ashcombe Hall and the North Cloister, 24 hours</li><li>Studios, the Soundstage, and the equipment cage</li><li>The Refectory and your meal plan</li><li>The Library and printing</li><li>Free entry to every Aurelian performance</li></ul>') +
        pane('Lost your card?', lost ? '<p><b>Card frozen.</b> Pick up a new one at the Porter&#39;s Lodge; the first replacement is free.</p>' : '<p class="muted">We freeze it right away so no one else can use it.</p><button class="btn btn-line btn-sm" type="button" id="lost-card">Report it lost</button>') +
        '</div></div>';
    };

    const stuProfile = () => {
      const pr = store.get('profile', {phone: ME.phone, pref: ME.first, emerg: ME.emergency});
      const nt = store.get('notify', {grades: true, billing: true, house: true, text: false});
      const tog = (k, l) => '<label class="tog"><input type="checkbox" data-notify="' + k + '"' + (nt[k] ? ' checked' : '') + '><span>' + l + '</span></label>';
      return '<div class="pt-head"><h2>Profile &amp; settings</h2></div><div class="pp-cols"><div>' +
        pane('About you', '<dl class="pdl"><div><dt>Legal name</dt><dd>' + esc(ME.name) + '</dd></div><div><dt>Student ID</dt><dd>' + esc(ME.id) + '</dd></div><div><dt>College email</dt><dd>' + esc(ME.email) + '</dd></div><div><dt>Pronouns</dt><dd>' + esc(ME.pronouns) + '</dd></div><div><dt>Program</dt><dd>' + esc(ME.major) + '<br>' + esc(ME.minor) + '</dd></div><div><dt>House</dt><dd>' + esc(SI.houses[ME.hk].name) + ' · ' + esc(ME.role) + '</dd></div><div><dt>Class</dt><dd>' + esc(ME.klass) + '</dd></div><div><dt>Home address</dt><dd>' + esc(ME.address) + '</dd></div></dl>') + '</div><div>' +
        pane('Contact details', '<form id="prof-form" class="pt-form" novalidate><div class="field"><label for="pf-pref">Preferred first name</label><input id="pf-pref" value="' + esc(pr.pref) + '"></div><div class="field"><label for="pf-phone">Mobile phone</label><input id="pf-phone" type="tel" value="' + esc(pr.phone) + '"></div><div class="field"><label for="pf-em">Emergency contact</label><input id="pf-em" value="' + esc(pr.emerg) + '"></div><button class="btn btn-ink btn-sm" type="submit">Save changes</button><p class="hint" id="pf-ok" aria-live="polite"></p></form>') +
        pane('Notifications', '<div class="togs">' + tog('grades', 'Email me when a grade posts') + tog('billing', 'Email me about bills and aid') + tog('house', 'House and Hall Board news') + tog('text', 'Text me emergency alerts and package arrivals') + '</div>') +
        '</div></div>';
    };

    const STU = {today: stuToday, schedule: stuSchedule, classes: stuCourses, grades: stuGrades, progress: stuProgress, register: stuRegister, billing: stuBilling, aid: stuAid, housing: stuHousing, advising: stuAdvising, library: stuLibrary, card: stuCard, profile: stuProfile};
    Object.keys(STU).forEach(k => { const base = S[k]; S[k] = () => (user && user.role === 'student') ? STU[k]() : (base ? base() : ''); });

    const wireStudent = main => {
      wireMap(main);
      $$('[data-todo]', main).forEach(c => c.addEventListener('change', () => { const t = store.get('todo', {}); t[c.dataset.todo] = c.checked; store.set('todo', t); }));
      $$('[data-gterm]', main).forEach(b => b.addEventListener('click', () => { store.set('gterm', +b.dataset.gterm); render('grades'); }));
      $$('[data-transcript]', main).forEach(b => b.addEventListener('click', () => { const r = store.get('transcripts', []); r.push({k: b.dataset.transcript, d: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}); store.set('transcripts', r); render('grades'); live('Transcript requested'); }));
      $$('[data-plan]', main).forEach(b => b.addEventListener('click', () => { const p = plan(), c = b.dataset.plan; store.set('plan', p.includes(c) ? p.filter(x => x !== c) : p.concat(c)); render('register'); live(p.includes(c) ? c + ' removed' : c + ' added to your plan'); }));
      const rq = $('#reg-q', main); if (rq) rq.addEventListener('input', () => { store.set('regq', rq.value); clearTimeout(rq.t); rq.t = setTimeout(() => { render('register'); const n = $('#reg-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
      $$('[data-pay]', main).forEach(b => b.addEventListener('click', () => {
        const bb = bill(), full = b.dataset.pay === 'full', a = full ? bb.bal : Math.round(bb.bal / 3 * 100) / 100;
        const p = store.get('paid', []); p.push({t: full ? 'Payment, thank you' : 'Payment plan, first of three', a, d: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}); store.set('paid', p);
        render('billing'); live('Payment of ' + usd(a) + ' received');
      }));
      const ff = $('#fix-form', main); if (ff) ff.addEventListener('submit', ev => { ev.preventDefault(); const d = $('#fix-d').value.trim(); if (!d) { $('#fix-err').textContent = 'Tell Facilities what is wrong.'; $('#fix-d').focus(); return; } const r = store.get('fix', []); r.unshift({k: $('#fix-k').value, d, at: new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}); store.set('fix', r); render('housing'); live('Repair request sent to Facilities'); });
      const rn = $('#renew', main); if (rn) rn.addEventListener('click', () => { store.set('renewed', true); render('housing'); live('Room renewed for next year'); });
      $$('[data-slot]', main).forEach(b => b.addEventListener('click', () => { const a = store.get('appts', []); a.push({t: 'Office hours with ' + ME.advisor.n, d: b.dataset.slot, w: 'The Soundstage office'}); store.set('appts', a); render('advising'); live('Booked ' + b.dataset.slot); }));
      $$('[data-renew]', main).forEach(b => b.addEventListener('click', () => { const r = store.get('renew', {}); r[b.dataset.renew] = 1; store.set('renew', r); render('library'); live('Renewed for two weeks'); }));
      const lc = $('#lost-card', main); if (lc) lc.addEventListener('click', () => { store.set('lost', true); render('card'); live('Card frozen'); });
      const pf = $('#prof-form', main); if (pf) pf.addEventListener('submit', ev => { ev.preventDefault(); store.set('profile', {pref: $('#pf-pref').value.trim(), phone: $('#pf-phone').value.trim(), emerg: $('#pf-em').value.trim()}); $('#pf-ok').textContent = 'Saved.'; });
      $$('[data-notify]', main).forEach(c => c.addEventListener('change', () => { const n = store.get('notify', {grades: true, billing: true, house: true, text: false}); n[c.dataset.notify] = c.checked; store.set('notify', n); live('Settings saved'); }));
      const ics = $('#wk-ics', main); if (ics) ics.addEventListener('click', () => {
        const base = new Date(2026, 9, 26), z = n => String(n).padStart(2, '0');
        const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aurelian//MyAurelian//EN'];
        (user.role === 'student' ? ME : SI.fac).sched.forEach((s, i) => { const d = new Date(base); d.setDate(base.getDate() + s.d); const ds = d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()); const t = x => z(Math.floor(x)) + z(Math.round((x % 1) * 60)) + '00';
          L.push('BEGIN:VEVENT', 'UID:my-' + i + '@aurelianarts.edu', 'DTSTAMP:20261026T120000Z', 'DTSTART:' + ds + 'T' + t(s.s), 'DTEND:' + ds + 'T' + t(s.e), 'RRULE:FREQ=WEEKLY;UNTIL=20261204T235959Z', 'SUMMARY:' + s.t, 'LOCATION:' + s.w, 'END:VEVENT'); });
        L.push('END:VCALENDAR'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\r\n')], {type: 'text/calendar'})); a.download = 'my-autumn-2026-schedule.ics'; document.body.appendChild(a); a.click(); a.remove();
      });
    };

    /* ----- MyAurelian faculty & staff account ----- */
    const FA = SI.fac;
    const stfToday = () => {
      const g = store.get('grades', {});
      const todo = SI.teach.reduce((n, c) => n + c.roster.filter(s => !(g[c.c] && g[c.c][s] && g[c.c][s].c)).length, 0);
      const ap = store.get('approvals', {}), pending = SI.advisees.filter(a => !ap[a.n]).length;
      const booked = store.get('appts', []).length + 2;
      const today = FA.sched.filter(s => s.d === dow).sort((a, c) => a.s - c.s).map(s => '<li class="tl-' + s.k + '"><b>' + hrs(s.s) + '</b><span>' + esc(s.t) + '<small>' + esc(s.w) + '</small></span></li>').join('');
      const unread = getMsgs().filter(m => m.box === 'in' && !m.read).length;
      return '<div class="kpis">' +
        '<button class="kpi" type="button" data-go="classes"><span>Midterm comments</span><b>' + todo + '</b><small>students still to write · due Nov 6</small></button>' +
        '<button class="kpi" type="button" data-go="advisees"><span>Advisee requests</span><b>' + pending + '</b><small>waiting for your signature</small></button>' +
        '<button class="kpi" type="button" data-go="hours"><span>Office hours</span><b>' + booked + '</b><small>appointments booked this week</small></button>' +
        '<button class="kpi" type="button" data-go="msgs"><span>Inbox</span><b>' + unread + '</b><small>unread messages</small></button></div>' +
        '<div class="pp-cols"><div>' +
          pane(DAYS[dow] + '&#39;s schedule', today ? '<ul class="day-list">' + today + '</ul>' : '<p class="muted">Nothing scheduled.</p>', '', '<button class="link" type="button" data-go="schedule">Full week</button>') +
          pane('Your classes', '<ul class="row-list">' + SI.teach.map(c => '<li><button type="button" class="row-btn" data-go="classes"><span><b>' + esc(c.c) + '</b> ' + esc(c.t) + '<small>' + esc(c.m) + ' · ' + esc(c.r) + '</small></span>' + pill(c.roster.length + ' students', 'ok') + '</button></li>').join('') + '</ul>') +
          pane('Deadlines', '<ul class="row-list"><li><span><b>Midterm comments</b><small>Every student in every class</small></span>' + pill('Nov 6', 'warn') + '</li><li><span><b>Spring advising sign-offs</b><small>Before registration opens</small></span>' + pill('Nov 8', 'ok') + '</li><li><span><b>Jury schedule for FLM 495</b><small>Send to the Registrar</small></span>' + pill('Nov 20', 'ok') + '</li><li><span><b>Final grades</b><small>All classes</small></span>' + pill('Dec 14', '') + '</li></ul>') +
        '</div><div>' +
          pane('The Muses’ Cup', cupBars(true), 'pp-cup', '<button class="link" type="button" data-go="house">My House</button>') +
          pane('Notifications', '<ul class="note-list">' + FA.notifs.map(n => '<li><span>' + esc(n[0]) + '</span><small>' + esc(n[1]) + '</small></li>').join('') + '</ul>') +
          pane('Quick links', '<div class="pt-quick">' + [['Write comments', 'classes'], ['Sign requests', 'advisees'], ['Book a room', 'book'], ['Request time off', 'timeoff'], ['Pay stubs', 'pay']].map(q => '<button class="btn btn-line btn-sm" type="button" data-go="' + q[1] + '">' + q[0] + '</button>').join('') + '<a class="btn btn-line btn-sm" href="staff.html">Staff directory</a></div>') +
        '</div></div>';
    };
    const stfHours = () => {
      const fromStudents = store.get('appts', []).map(a => ['Ines Carvalho', a.d, 'BFA Film · third year']);
      const list = [['Ines Carvalho', 'Wed, Oct 28, 3:00pm', 'Midterm shoot questions'], ['Diego Navarro', 'Tue, Nov 3, 4:00pm', 'First-year check-in']].concat(fromStudents);
      const open = store.get('ohOpen', true);
      return '<div class="pt-head"><h2>Office hours</h2><p class="muted">' + esc(FA.office) + '</p></div><div class="pp-cols"><div>' +
        pane('Booked', '<ul class="row-list">' + list.map(a => '<li><span><b>' + esc(a[0]) + '</b><small>' + esc(a[1]) + ' · ' + esc(a[2]) + '</small></span>' + pill('Booked', 'good') + '</li>').join('') + '</ul><p class="hint">Students book from the Advising page in MyAurelian.</p>') + '</div><div>' +
        pane('Your weekly hours', '<ul class="stmt"><li><span>Tuesdays</span><b>3:00 to 5:00pm</b></li><li><span>Slot length</span><b>30 minutes</b></li><li><span>Where</span><b>' + esc(FA.office) + '</b></li></ul><label class="tog"><input type="checkbox" id="oh-open"' + (open ? ' checked' : '') + '><span>Students can book online</span></label>') +
        '</div></div>';
    };
    const stfPay = () => '<div class="pt-head"><h2>Pay &amp; benefits</h2><p class="muted">Employee ID ' + esc(FA.id) + '</p></div>' +
      '<div class="bal ok"><div><p class="hp-label">Next payday</p><b>' + esc(FA.pay.next) + '</b><small>Paid on the last working day of each month, by direct deposit.</small></div></div>' +
      '<div class="pp-cols"><div>' + pane('Pay stubs', '<ul class="row-list">' + FA.pay.stubs.map(s => '<li><span><b>' + esc(s[0]) + '</b><small>Net pay</small></span><b>' + esc(s[1]) + '</b><button class="link" type="button" data-stub="' + esc(s[0]) + '">View</button></li>').join('') + '</ul><p class="hint" id="stub-out" aria-live="polite"></p>') +
        pane('Tax forms', '<ul class="row-list"><li><span><b>2025 W-2</b><small>Available since January 31</small></span>' + pill('Ready', 'good') + '</li></ul>') + '</div><div>' +
        pane('Your benefits', '<dl class="pdl">' + FA.pay.benefits.map(b => '<div><dt>' + esc(b[0]) + '</dt><dd>' + esc(b[1]) + '</dd></div>').join('') + '</dl>') + '</div></div>';
    const stfTimeoff = () => {
      const L = FA.leave, reqs = store.get('leave', []);
      const used = reqs.reduce((n, r) => n + (r.k === 'Personal day' ? r.n : 0), 0);
      return '<div class="pt-head"><h2>Time off</h2><p class="muted">Autumn 2026</p></div><div class="pp-cols"><div>' +
        pane('Your balances', '<div class="meal"><div><span>Personal days</span><b>' + (L.personal - used) + '</b><div class="meter"><span style="width:' + Math.round((L.personal - used) / L.personal_total * 100) + '%"></span></div><small>of ' + L.personal_total + ' this year</small></div><div><span>Sick days</span><b>' + L.sick + '</b><div class="meter"><span style="width:' + Math.round(L.sick / L.sick_total * 100) + '%"></span></div><small>of ' + L.sick_total + '</small></div></div><p class="hint">Research days left this term: ' + L.research + '. Sabbatical eligible from Autumn 2027.</p>') + '</div><div>' +
        pane('Request time off', '<form id="leave-form" class="pt-form" novalidate><div class="field"><label for="lv-k">Type</label><select id="lv-k"><option>Personal day</option><option>Research day</option><option>Conference travel</option></select></div><div class="pt-row"><div class="field"><label for="lv-d">First day</label><input id="lv-d" type="date" value="2026-11-13"></div><div class="field"><label for="lv-n">Days</label><select id="lv-n"><option>1</option><option>2</option><option>3</option></select></div></div><div class="field"><label for="lv-c">Who covers your classes?</label><input id="lv-c" placeholder="e.g. Prof. Bellweather"></div><p class="err" id="lv-err" aria-live="polite"></p><button class="btn btn-ink btn-sm" type="submit">Send to the Dean</button></form>' +
          (reqs.length ? '<ul class="row-list">' + reqs.map(r => '<li><span><b>' + esc(r.k) + ' · ' + r.n + (r.n > 1 ? ' days' : ' day') + '</b><small>From ' + esc(r.d) + (r.c ? ' · cover: ' + esc(r.c) : '') + '</small></span>' + pill('Pending', 'ok') + '</li>').join('') + '</ul>' : '')) +
        '</div></div>';
    };
    const stfCard = () => {
      let bars = '', x = 0; for (const ch of (FA.id + '*' + FA.id).split('')) { const w = (ch.charCodeAt(0) % 3) + 1; bars += '<rect x="' + x + '" y="0" width="' + w + '" height="40"/>'; x += w + ((ch.charCodeAt(0) % 2) + 1); }
      return '<div class="pt-head"><h2>Staff ID</h2><p class="muted">Opens every studio, the Soundstage, and the staff entrance.</p></div><div class="pp-cols"><div>' +
        '<div class="idcard"><div class="id-top"><img src="assets/img/crest-sm.webp" alt="" width="160" height="134"><span><b>Aurelian College of the Arts</b><small>Faculty</small></span><img class="id-house" src="assets/img/house-' + FA.hk + '.webp" alt="" width="180" height="232"></div>' +
        '<div class="id-body"><img class="id-photo" src="' + esc(FA.img) + '" alt="" width="300" height="300"><div><p class="id-name">' + esc(FA.name) + '</p><p>' + esc(FA.title) + '</p><p>' + esc(FA.role) + '</p><p class="id-no">ID ' + esc(FA.id) + '</p><p class="id-valid">Valid through August 2027</p></div></div>' +
        '<svg class="id-bar" viewBox="0 0 ' + x + ' 40" preserveAspectRatio="none" aria-hidden="true">' + bars + '</svg></div></div><div>' +
        pane('What your card opens', '<ul class="ticks"><li>Every studio and the Soundstage, 24 hours</li><li>The staff entrance and the Staff Lot</li><li>The Refectory High Table on Fridays</li><li>The Library and the equipment cage</li></ul>') + '</div></div>';
    };
    const stfProfile = () => {
      const pr = store.get('sprofile', {phone: FA.phone, ext: FA.ext});
      return '<div class="pt-head"><h2>Profile &amp; settings</h2></div><div class="pp-cols"><div>' +
        pane('About you', '<dl class="pdl"><div><dt>Name</dt><dd>' + esc(FA.name) + '</dd></div><div><dt>Employee ID</dt><dd>' + esc(FA.id) + '</dd></div><div><dt>Email</dt><dd>' + esc(FA.email) + '</dd></div><div><dt>Title</dt><dd>' + esc(FA.title) + '</dd></div><div><dt>Department</dt><dd>' + esc(FA.dept) + '</dd></div><div><dt>House</dt><dd>' + esc(FA.role) + '</dd></div><div><dt>Office</dt><dd>' + esc(FA.office) + '</dd></div><div><dt>Since</dt><dd>' + esc(FA.since) + '</dd></div></dl>') + '</div><div>' +
        pane('Directory listing', '<form id="sprof-form" class="pt-form" novalidate><div class="field"><label for="sp-phone">Office phone</label><input id="sp-phone" type="tel" value="' + esc(pr.phone) + '"></div><div class="field"><label for="sp-ext">Extension</label><input id="sp-ext" value="' + esc(pr.ext) + '"></div><button class="btn btn-ink btn-sm" type="submit">Save changes</button><p class="hint" id="sp-ok" aria-live="polite"></p></form><a class="link" href="faculty.html#ferrer">Your public faculty page</a>') +
        '</div></div>';
    };
    const STF = {today: stfToday, schedule: () => STU.schedule(), hours: stfHours, pay: stfPay, timeoff: stfTimeoff, card: stfCard, profile: stfProfile};
    Object.keys(STF).forEach(k => { const base = S[k]; S[k] = () => (user && user.role === 'staff') ? STF[k]() : (base ? base() : ''); });
    const wireStaff = main => {
      const oh = $('#oh-open', main); if (oh) oh.addEventListener('change', () => { store.set('ohOpen', oh.checked); live(oh.checked ? 'Online booking on' : 'Online booking paused'); });
      $$('[data-stub]', main).forEach(b => b.addEventListener('click', () => { $('#stub-out').textContent = 'Pay stub for ' + b.dataset.stub + ': gross $6,950.00 · taxes $1,212.60 · retirement $417.00 · health $108.00 · net ' + (FA.pay.stubs.find(s => s[0] === b.dataset.stub) || ['', ''])[1] + '.'; }));
      const lf = $('#leave-form', main); if (lf) lf.addEventListener('submit', ev => { ev.preventDefault(); const r = store.get('leave', []); r.unshift({k: $('#lv-k').value, d: $('#lv-d').value, n: +$('#lv-n').value, c: $('#lv-c').value.trim()}); store.set('leave', r); render('timeoff'); live('Request sent to the Dean'); });
      const sp = $('#sprof-form', main); if (sp) sp.addEventListener('submit', ev => { ev.preventDefault(); store.set('sprofile', {phone: $('#sp-phone').value.trim(), ext: $('#sp-ext').value.trim()}); $('#sp-ok').textContent = 'Saved.'; });
    };

    // Personal campus map (student and staff)
    const mapPane = () => {
      const P = (user && user.role === 'staff' ? (SI.fac || {}).places : (SI.me || {}).places) || [];
      const day = store.get('mapday', 'all'), sel = store.get('mapsel', P.length ? P[0].b : 'gate');
      const tpl = $('#pt-map-tpl'); let svg = tpl ? tpl.innerHTML : '';
      const vis = P.filter(p => day === 'all' || p.it.some(i => i.d === +day || i.d === -1 && p === P[0]));
      const on = new Set(vis.map(p => p.b));
      const pins = P.map((p, n) => on.has(p.b) ? '<g class="pt-pin' + (p.b === sel ? ' on' : '') + '" aria-hidden="true"><circle cx="' + p.cx + '" cy="' + (p.cy - 30) + '" r="15"/><text x="' + p.cx + '" y="' + (p.cy - 25) + '" text-anchor="middle">' + (n + 1) + '</text></g>' : '').join('');
      svg = svg.replace(/<g class="bldg ([^"]*)" data-b="([^"]*)"/g, (m, c, k) => '<g class="bldg ' + c + (on.has(k) ? ' mine' : ' dim') + (k === sel ? ' on' : '') + '" data-b="' + k + '"').replace(/<\/svg>\s*$/, pins + '</svg>');
      const days = [['all', 'This week'], ['0', 'Mon'], ['1', 'Tue'], ['2', 'Wed'], ['3', 'Thu'], ['4', 'Fri']];
      const chips = days.map(d => '<button class="chip" type="button" data-mapday="' + d[0] + '" aria-pressed="' + (String(day) === d[0]) + '">' + d[1] + '</button>').join('');
      const list = P.map((p, n) => on.has(p.b) ? '<li><button type="button" class="pt-place' + (p.b === sel ? ' on' : '') + '" data-mapsel="' + p.b + '"><i>' + (n + 1) + '</i><span><b>' + esc(p.n) + '</b><small>' + esc([...new Set(p.it.filter(i => day === 'all' || i.d === +day || i.d === -1).map(i => i.t.split(' · ')[0]))].slice(0, 2).join(' · ')) + '</small></span></button></li>' : '').join('');
      const B = (SI.mapb || {})[sel] || {n: '', desc: '', hours: ''}, mine = P.find(p => p.b === sel);
      const here = mine ? '<ul class="row-list">' + mine.it.map(i => '<li><span><b>' + esc(i.t) + '</b><small>' + esc(i.w) + '</small></span></li>').join('') + '</ul>' : '<p class="muted">Nothing of yours here this week.</p>';
      return '<div class="pt-head"><h2>Campus map</h2><p class="muted">' + (user.role === 'staff' ? 'Your office, classes, and meetings this week' : 'Your room, classes, and the places you use this week') + '</p></div>' +
        '<div class="chips pt-mapdays" role="group" aria-label="Show a day">' + chips + '</div>' +
        '<div class="pp pt-mapbox">' + svg + '<p class="hint">Select a building or a place in the list. Numbers match the list.</p></div><div class="pt-mapgrid"><div>' +
        pane(vis.length + (vis.length === 1 ? ' place' : ' places') + (day === 'all' ? ' this week' : ' on ' + days[+day + 1][1]), '<ol class="pt-places">' + list + '</ol>') + '</div><div>' +
        pane(B.n, '<p class="muted">' + esc(B.desc) + '</p><p class="hint">' + esc(B.hours) + '</p>' + here + '<a class="btn btn-line btn-sm" href="campus-map.html#' + sel + '">Open on the full campus map</a>') +
        '</div></div>';
    };
    S.map = mapPane;
    const wireMap = main => {
      $$('[data-mapday]', main).forEach(b => b.addEventListener('click', () => { store.set('mapday', b.dataset.mapday); render('map'); }));
      const pick = k => { store.set('mapsel', k); render('map'); const f = $('[data-mapsel="' + k + '"]') || $('.pt-mapbox .bldg[data-b="' + k + '"]'); if (f) f.focus({preventScroll: true}); };
      $$('[data-mapsel]', main).forEach(b => b.addEventListener('click', () => pick(b.dataset.mapsel)));
      $$('.pt-mapbox .bldg', main).forEach(g => { g.addEventListener('click', () => pick(g.dataset.b)); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(g.dataset.b); } }); });
    };

    const SECTIONS = {
      student: [['-', 'Overview'], ['today', 'Home'], ['msgs', 'Inbox'], ['-', 'Academics'], ['schedule', 'Schedule'], ['classes', 'Courses'], ['grades', 'Grades & transcript'], ['progress', 'Degree progress'], ['register', 'Registration'], ['-', 'Money'], ['billing', 'Account & billing'], ['aid', 'Financial aid'], ['-', 'Campus life'], ['house', 'My House'], ['housing', 'Housing & meals'], ['map', 'Campus map'], ['guests', 'Guests'], ['book', 'Book a studio'], ['-', 'Support'], ['advising', 'Advising'], ['library', 'Library & equipment'], ['-', 'You'], ['card', 'Student ID'], ['profile', 'Profile & settings']],
      staff: [['-', 'Overview'], ['today', 'Home'], ['msgs', 'Inbox'], ['-', 'Teaching'], ['schedule', 'Schedule'], ['classes', 'Classes & comments'], ['hours', 'Office hours'], ['advisees', 'Advisees'], ['-', 'Campus'], ['map', 'Campus map'], ['book', 'Book a room'], ['house', 'My House'], ['-', 'Work'], ['pay', 'Pay & benefits'], ['timeoff', 'Time off'], ['-', 'You'], ['card', 'Staff ID'], ['profile', 'Profile & settings']]
    };
    let cur = 'today';
    const render = (sec, focus) => {
      cur = sec;
      const unread = getMsgs().filter(m => m.box === 'in' && !m.read).length;
      $('#pt-tabs').innerHTML = SECTIONS[user.role].map(([k, l]) => k === '-' ? '<p class="pt-group">' + l + '</p>' : '<button type="button" role="tab" id="pt-t-' + k + '" aria-controls="pt-main" aria-selected="' + (k === sec) + '" tabindex="' + (k === sec ? 0 : -1) + '" data-sec="' + k + '">' + esc(l) + (k === 'msgs' && unread ? ' <span class="pt-badge">' + unread + '</span>' : '') + '</button>').join('');
      const main = $('#pt-main');
      main.setAttribute('aria-labelledby', 'pt-t-' + sec);
      main.innerHTML = S[sec]();
      if (focus) main.focus();
      wire(main);
    };
    $('#pt-tabs').addEventListener('click', ev => { const b = ev.target.closest('[data-sec]'); if (b) render(b.dataset.sec, false); });
    $('#pt-tabs').addEventListener('keydown', ev => {
      const keys = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}; if (!(ev.key in keys)) return;
      ev.preventDefault(); const L = SECTIONS[user.role].filter(x => x[0] !== '-'); const i = L.findIndex(x => x[0] === cur);
      const n = L[(i + keys[ev.key] + L.length) % L.length][0]; render(n, false); $('#pt-t-' + n).focus();
    });

    const wire = main => {
      if (user && user.role === 'student') wireStudent(main);
      if (user && user.role === 'staff') { wireStaff(main); wireStudent(main); }
      $$('[data-go]', main).forEach(b => b.addEventListener('click', () => { render(b.dataset.go, true); }));
      const cls = $('#pt-cls', main); if (cls) cls.addEventListener('change', () => { store.set('cls', +cls.value); render('classes'); $('#pt-cls').focus(); });
      const gf = $('#pt-grades', main);
      if (gf) gf.addEventListener('submit', ev => {
        ev.preventDefault(); const c = SI.teach[store.get('cls', 0)]; const g = store.get('grades', {}); g[c.c] = g[c.c] || {};
        $$('[data-s]', gf).forEach(el => { const s = el.dataset.s; g[c.c][s] = g[c.c][s] || {}; g[c.c][s][el.dataset.k] = el.value.trim(); });
        store.set('grades', g);
        const done = c.roster.filter(s => g[c.c][s] && g[c.c][s].c).length;
        $('#pt-gstat').textContent = 'Saved. ' + done + ' of ' + c.roster.length + ' students have a comment.'; live('Comments saved');
      });
      $$('[data-sign],[data-decline],[data-undo]', main).forEach(b => b.addEventListener('click', () => {
        const ap = store.get('approvals', {}); const n = b.dataset.sign || b.dataset.decline || b.dataset.undo;
        if (b.dataset.undo) delete ap[n]; else ap[n] = b.dataset.sign ? 'ok' : 'talk';
        store.set('approvals', ap); render('advisees'); live(b.dataset.undo ? 'Undone' : b.dataset.sign ? 'Signed for ' + n : 'Sent back to ' + n);
      }));
      const gp = $('#pt-gp', main);
      if (gp) gp.addEventListener('submit', ev => {
        ev.preventDefault();
        const p = {host: user.who, guest: $('#pg-guest').value.trim(), kind: $('#pg-kind').value, d: $('#pg-date').value, n: $('#pg-kind').value === 'night' ? +$('#pg-n').value : 0, agree: $('#pg-agree').checked, minor: $('#pg-minor').checked, c: +$('#pg-c').value};
        const bad = GUEST.check(p);
        if (bad) { $('#pg-err').textContent = bad[1]; return; }
        GUEST.add(p); render('guests'); live('Guest pass created');
      });
      $$('[data-gp-cancel]', main).forEach(b => b.addEventListener('click', () => { GUEST.remove(b.dataset.gpCancel); render('guests'); live('Guest pass cancelled'); }));
      const bk = $('#pt-bk', main);
      if (bk) bk.addEventListener('submit', ev => {
        ev.preventDefault();
        const d = $('#bk-d').value, t = $('#bk-t').value, h = +$('#bk-h').value, r = $('#bk-r').value;
        const max = new Date(now.getTime() + 14 * 864e5).toISOString().slice(0, 10);
        if (!d || d < todayISO || d > max) { $('#bk-d-err').textContent = 'Pick a date in the next two weeks.'; $('#bk-d').focus(); return; }
        $('#bk-d-err').textContent = '';
        const hr = +(t || '0:0').split(':')[0];
        if (!t || hr < 7 || hr + h > 24) { $('#bk-err').textContent = 'Studios are open 7am to midnight.'; $('#bk-t').focus(); return; }
        const list = getBk();
        if (list.some(b => b.r === r && b.d === d && Math.abs(+b.t.split(':')[0] - hr) < Math.max(b.h, h))) { $('#bk-err').textContent = 'That space is already booked then. Try another time.'; return; }
        list.push({id: 'b' + Date.now(), r, d, t, h}); list.sort((a, b) => (a.d + a.t).localeCompare(b.d + b.t));
        store.set('bk-' + user.role, list); render('book'); live('Booked ' + r);
      });
      $$('[data-cancel]', main).forEach(b => b.addEventListener('click', () => { store.set('bk-' + user.role, getBk().filter(x => x.id !== b.dataset.cancel)); render('book'); live('Booking cancelled'); }));
      const cl = $('#pt-claim', main);
      if (cl) cl.addEventListener('submit', ev => {
        ev.preventDefault();
        const claims = store.get('claims', []); const left = 5000 - claims.reduce((n, c) => n + c.a, 0);
        const a = Math.round(parseFloat(($('#cl-a').value || '').replace(/[$,]/g, '')));
        if (!a || a <= 0) { $('#cl-err').textContent = 'Enter the amount on your receipt.'; $('#cl-a').focus(); return; }
        if (a > left) { $('#cl-err').textContent = 'You have $' + left.toLocaleString() + ' left this year.'; $('#cl-a').focus(); return; }
        claims.push({w: $('#cl-w').value, a}); store.set('claims', claims); render(cur); live('Claim sent');
      });
      $$('[data-msg]', main).forEach(b => b.addEventListener('click', () => {
        const ms = getMsgs(); const m = ms.find(x => x.id === b.dataset.msg); m.read = true; store.set(msgsKey(), ms);
        openMsg = m.id; render('msgs'); const nb = $('[data-msg="' + m.id + '"]'); if (nb) nb.focus();
      }));
      const nw = $('#pt-new', main), cf = $('#pt-compose', main);
      if (nw) nw.addEventListener('click', () => { cf.hidden = false; $('#ms-s').focus(); });
      if (cf) {
        $('#ms-x').addEventListener('click', () => { cf.hidden = true; nw.focus(); });
        cf.addEventListener('submit', ev => {
          ev.preventDefault();
          if (!$('#ms-b').value.trim()) { $('#ms-err').textContent = 'Write something first.'; $('#ms-b').focus(); return; }
          const ms = getMsgs(); const id = 'o' + Date.now();
          ms.push({id, f: $('#ms-to').value, s: $('#ms-s').value.trim() || '(No subject)', b: $('#ms-b').value.trim(), read: true, box: 'out'});
          store.set(msgsKey(), ms); openMsg = id; render('msgs'); live('Message sent');
        });
      }
    };

    const showPortal = (u, animate) => {
      user = u; ses.set(u);
      $('#dash-date').textContent = dateStr;
      $('#dash-title').textContent = 'Welcome back, ' + u.who;
      $('#dash-crest').src = u.hk ? 'assets/img/house-' + u.hk + '.webp' : 'assets/img/crest-sm.webp';
      const ph = $('#dash-photo'); if (ph) { ph.hidden = !u.img; if (u.img) ph.src = u.img; }
      dash.dataset.house = u.hk || '';
      document.body.classList.add('pt-on');
      $('#pt-me-img').src = u.img || 'assets/img/crest-sm.webp'; $('#pt-me-name').textContent = u.role === 'student' ? ME.name : FA.name; $('#pt-me-id').textContent = u.role === 'student' ? 'ID ' + ME.id : 'Staff ID ' + FA.id;
      $('#pt-me').dataset.secGo = 'profile';
      const nts = u.role === 'student' ? ME.notifs : FA.notifs.map(n => ({t: n[0], d: n[1]}));
      const seen = store.get('nseen', false);
      $('#pt-bell-n').textContent = seen ? '' : nts.length; $('#pt-bell-n').hidden = seen;
      $('#pt-notifs').innerHTML = '<p class="hp-label">Notifications</p><ul class="note-list">' + nts.map(n => '<li><span>' + esc(n.t) + '</span><small>' + esc(n.d) + '</small></li>').join('') + '</ul>';
      $('#dash-sub').textContent = u.role === 'student' ? SI.houses[u.hk].name + ' · ' + SI.houses[u.hk].wing + ', Ashcombe Hall' : u.staffRole + ' · Aurelian College of the Arts';
      dash.classList.toggle('is-staff', u.role === 'staff');
      gate.hidden = true; dash.hidden = false; openMsg = null;
      render('today');
      if (animate) { $('#dash-title').setAttribute('tabindex', '-1'); $('#dash-title').focus(); window.scrollTo({top: 0, behavior: reduce ? 'auto' : 'smooth'}); }
    };
    const req = (inp, err, msg) => { const ok = !!inp.value.trim(); err.textContent = ok ? '' : msg; inp.setAttribute('aria-invalid', String(!ok)); return ok; };
    $('#spell-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const a = req($('#sp-name'), $('#sp-name-err'), mode === 'staff' ? 'The register needs your name.' : 'The book needs a name.');
      const b = req($('#sp-pass'), $('#sp-pass-err'), 'Say your incantation (your password).');
      if (!a) { $('#sp-name').focus(); return; } if (!b) { $('#sp-pass').focus(); return; }
      let who = $('#sp-name').value.trim().split(/[\s@.]/)[0]; who = who.charAt(0).toUpperCase() + who.slice(1);
      const u = mode === 'student' ? {who: ME.first, role: 'student', hk: ME.hk, img: ME.img, room: ME.room} : {who: FA.who, role: 'staff', hk: FA.hk, staffRole: FA.title + ' · ' + FA.role, img: FA.img};
      $('#sp-pass').value = '';
      book.classList.add('cast');
      setTimeout(() => { book.classList.remove('cast'); showPortal(u, true); }, reduce ? 0 : 950);
    });
    $$('[data-demo-house]').forEach(b => b.addEventListener('click', () => {
      showPortal({who: ME.first, role: 'student', hk: ME.hk, img: ME.img, room: ME.room}, true);
    }));
    $$('[data-demo-staff]').forEach(b => b.addEventListener('click', () => showPortal({who: FA.who, role: 'staff', hk: FA.hk, staffRole: FA.title + ' · ' + FA.role, img: FA.img}, true)));
    $('#pt-bell').addEventListener('click', () => { const p = $('#pt-notifs'), open = p.hidden; p.hidden = !open; $('#pt-bell').setAttribute('aria-expanded', String(open)); store.set('nseen', true); $('#pt-bell-n').hidden = true; });
    document.addEventListener('click', ev => { const p = $('#pt-notifs'); if (p && !p.hidden && !ev.target.closest('#pt-notifs, #pt-bell')) { p.hidden = true; $('#pt-bell').setAttribute('aria-expanded', 'false'); } });
    $('#pt-me').addEventListener('click', () => { if (user) render($('#pt-me').dataset.secGo, true); });
    const pq = $('#pt-q'), pr = $('#pt-q-res');
    const KW = {map: 'campus map directions building where room office parking find', grades: 'gpa transcript marks', billing: 'pay bill balance tuition statement', aid: 'fafsa grant scholarship work-study travel', housing: 'room meal swipes repair maintenance roommate package', register: 'classes spring enroll add drop', schedule: 'timetable calendar week', card: 'id card barcode lost', library: 'books loans renew printing equipment camera', advising: 'advisor office hours counseling tutoring appointments', guests: 'visitor guest pass', book: 'studio room booking', house: 'cup points prefect muses', msgs: 'messages email inbox', progress: 'audit degree credits graduate', profile: 'settings phone address notifications'};
    pq.addEventListener('input', () => {
      const q = pq.value.trim().toLowerCase(); if (!q || !user) { pr.hidden = true; return; }
      const hits = SECTIONS[user.role].filter(x => x[0] !== '-' && (x[1].toLowerCase().includes(q) || (KW[x[0]] || '').includes(q))).slice(0, 6);
      pr.innerHTML = hits.length ? hits.map(x => '<li><button type="button" data-sec-pick="' + x[0] + '">' + esc(x[1]) + '</button></li>').join('') : '<li class="muted">No matches</li>'; pr.hidden = false;
    });
    pq.addEventListener('keydown', ev => { if (ev.key === 'Enter') { const f = $('[data-sec-pick]', pr); if (f) { f.click(); } } if (ev.key === 'Escape') pr.hidden = true; });
    pr.addEventListener('click', ev => { const b = ev.target.closest('[data-sec-pick]'); if (!b) return; render(b.dataset.secPick, true); pq.value = ''; pr.hidden = true; });
    $('#dash-out').addEventListener('click', () => { ses.set(null); document.body.classList.remove('pt-on'); user = null; dash.hidden = true; gate.hidden = false; setOpen(false); $('#book-open').focus(); });
    const back0 = ses.get(); if (back0 && back0.role) showPortal(back0, false);
  }

  /* ---------- Hall Board ---------- */
  const HB = window.AURELIAN_BOARD;
  if (HB) {
    const listEl = $('#hb-list'), countEl = $('#hb-count'), emptyEl = $('#hb-empty'), q = $('#hb-q');
    let house = 'all', type = 'all';
    const mine = () => store.get('aurelian-hallboard') || [];
    const going = () => store.get('aurelian-hallboard-going') || {};
    const label = {announcement: 'Announcement', activity: 'Activity', meeting: 'Group meeting'};
    const fmtD = s => new Date(s + 'T12:00').toLocaleDateString('en-US', {weekday: 'short', month: 'short', day: 'numeric'});
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
    const render = (fresh) => {
      const g = going(), qq = q.value.trim().toLowerCase();
      const posts = mine().concat(HB.posts).filter(p => (house === 'all' || p.h === house) && (type === 'all' || p.k === type) && (!qq || (p.t + ' ' + p.b + ' ' + p.pl).toLowerCase().includes(qq)))
        .sort((a, b) => (b.pin - a.pin) || a.d.localeCompare(b.d));
      listEl.replaceChildren();
      posts.forEach(p => {
        const a = el('article', 'post k-' + p.k + (p.pin ? ' pinned' : '') + (p.id === fresh ? ' new' : ''));
        const top = el('div', 'post-top');
        top.append(el('span', 'tag', label[p.k]));
        if (p.pin) top.append(el('span', 'tag gold', 'Pinned'));
        if (p.h !== 'hall') { const hl = el('a', 'house-line'); hl.href = 'houses.html#' + p.h; const im = el('img'); im.src = 'assets/img/house-' + p.h + '.webp'; im.alt = ''; im.width = 180; im.height = 232; hl.append(im, el('span', null, HB.houses[p.h])); top.append(hl); }
        else top.append(el('span', 'muted', 'Whole hall'));
        const meta = el('div', 'post-meta');
        const add = (k, v) => { if (!v) return; const s = el('span'); s.append(el('b', null, k + ' '), document.createTextNode(v)); meta.append(s); };
        add('When', fmtD(p.d) + (p.tm ? ', ' + p.tm : '')); add('Where', p.pl);
        const foot = el('div', 'post-foot'), by = el('div', 'post-by');
        const ra = p.by ? {n: p.by, r: 'Resident Advisor'} : HB.ras[p.h];
        let md;
        if (ra.img) { md = el('img', 'avatar sm'); md.src = ra.img; md.alt = ''; md.width = 300; md.height = 300; md.loading = 'lazy'; }
        else { md = el('span', 'medal sm m-' + (p.h === 'hall' ? 'staff' : p.h), ra.n.split(' ').map(w => w[0]).slice(0, 2).join('')); md.setAttribute('aria-hidden', 'true'); }
        const who = el('span'); who.append(el('b', null, ra.n), el('small', null, ra.r)); by.append(md, who); foot.append(by);
        const acts = el('div', 'row');
        if (p.k !== 'announcement') {
          const on = !!g[p.id], n = p.n + (on ? 1 : 0);
          const btn = el('button', on ? 'btn btn-ink btn-sm' : 'btn btn-line btn-sm', on ? 'Going · ' + n : (p.k === 'meeting' ? 'I\'ll be there' : 'I\'m going') + ' · ' + n);
          btn.type = 'button'; btn.setAttribute('aria-pressed', String(on));
          btn.addEventListener('click', () => { const gg = going(); if (gg[p.id]) delete gg[p.id]; else gg[p.id] = 1; store.set('aurelian-hallboard-going', gg); render(); });
          acts.append(btn);
        }
        if (!p.mine && p.d && p.k !== 'announcement') { const cl = el('a', 'link', 'See it on the calendar'); cl.href = 'events.html?d=' + p.d + '#calendar'; acts.append(cl); }
        if (p.mine) { const del = el('button', 'link', 'Delete'); del.type = 'button'; del.addEventListener('click', () => { store.set('aurelian-hallboard', mine().filter(x => x.id !== p.id)); render(); }); acts.append(del); }
        foot.append(acts);
        const kids = [top, el('h3', null, p.t), el('p', null, p.b), meta, foot];
        if (p.img) { const im = el('img', 'post-img'); im.src = p.img; im.alt = ''; im.width = 600; im.height = 360; im.loading = 'lazy'; kids.unshift(im); a.classList.add('has-img'); }
        a.append(...kids);
        listEl.append(a);
      });
      countEl.textContent = 'Showing ' + posts.length + (posts.length === 1 ? ' post' : ' posts');
      emptyEl.hidden = posts.length !== 0;
    };
    $$('[data-hb-house]').forEach(c => c.addEventListener('click', () => { house = c.dataset.hbHouse; $$('[data-hb-house]').forEach(x => x.setAttribute('aria-pressed', String(x === c))); render(); }));
    $$('[data-hb-type]').forEach(c => c.addEventListener('click', () => { type = c.dataset.hbType; $$('[data-hb-type]').forEach(x => x.setAttribute('aria-pressed', String(x === c))); render(); }));
    q.addEventListener('input', () => render());
    const form = $('#hb-form');
    $('#hb-ra').addEventListener('change', e => { form.hidden = !e.target.checked; if (!form.hidden) $('#hb-title').focus(); });
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const t = $('#hb-title'), b = $('#hb-body'); let ok = true;
      [[t, '#hb-title-err', 'Give your post a title.'], [b, '#hb-body-err', 'Add a few details.']].forEach(([f, id, msg]) => { const bad = !f.value.trim(); $(id).textContent = bad ? msg : ''; f.setAttribute('aria-invalid', String(bad)); if (bad && ok) { f.focus(); ok = false; } });
      if (!ok) return;
      const tm = $('#hb-time').value; let tmS = '';
      if (tm) { const [hh, mm] = tm.split(':').map(Number); tmS = ((hh % 12) || 12) + ':' + String(mm).padStart(2, '0') + (hh < 12 ? 'am' : 'pm'); }
      const hk = $('#hb-house').value;
      const p = {id: 'm' + Date.now(), k: $('#hb-type').value, h: hk, t: t.value.trim(), b: b.value.trim(), d: $('#hb-date').value || '2026-10-30', tm: tmS, pl: $('#hb-place').value.trim(), pin: $('#hb-pin').checked, n: 0, mine: true, by: 'You'};
      store.set('aurelian-hallboard', [p].concat(mine()));
      form.reset(); $('#hb-date').value = '2026-10-30'; $('#hb-time').value = '20:00';
      house = 'all'; type = 'all'; $$('[data-hb-house],[data-hb-type]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.hbHouse === 'all' || x.dataset.hbType === 'all')));
      render(p.id); listEl.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'});
    });
    render();
  }

  /* ---------- Light / dark mode ---------- */
  const tBtns = $$('[data-theme-toggle]');
  if (tBtns.length) {
    const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
    const isDark = () => { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : !!(mq && mq.matches); };
    const sync = () => { const d = isDark(); document.documentElement.classList.toggle('is-dark', d);
      tBtns.forEach(b => { b.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); b.setAttribute('aria-pressed', String(d)); const l = $('.theme-label', b); if (l) l.textContent = d ? 'Light mode' : 'Dark mode'; }); };
    tBtns.forEach(b => b.addEventListener('click', () => { const next = isDark() ? 'light' : 'dark'; document.documentElement.setAttribute('data-theme', next); try { localStorage.setItem('aurelian-theme', next); } catch (e) {} sync(); }));
    if (mq && mq.addEventListener) mq.addEventListener('change', sync);
    sync();
  }

  /* ---------- Audition time zones ---------- */
  const tzOut = $('#tz-out');
  if (tzOut) {
    const fmt = h => { h = ((h % 24) + 24) % 24; const hh = Math.floor(h), mm = Math.round((h - hh) * 60); const day = ''; return ((hh % 12) || 12) + ':' + String(mm).padStart(2, '0') + (hh < 12 ? 'am' : 'pm'); };
    const dayOf = h => h >= 24 ? ' (Sunday)' : h < 0 ? ' (Friday)' : ' (Saturday)';
    const show = b => { const o = +b.dataset.tz; tzOut.replaceChildren();
      [['Morning audition', 9], ['Evening audition', 19]].forEach(([l, ny]) => { const r = document.createElement('div'); r.className = 'tz-row'; const a = document.createElement('span'); a.textContent = l + ' in ' + b.dataset.city; const t = document.createElement('b'); t.textContent = fmt(ny + o) + dayOf(ny + o); r.append(a, t); tzOut.append(r); });
      $$('[data-tz]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); };
    $$('[data-tz]').forEach(b => b.addEventListener('click', () => show(b)));
    show($('[data-tz]'));
  }

  // Career guide: field tabs and readiness checklist
  var cgTabs = [].slice.call(document.querySelectorAll('[data-cg-tab]'));
  function cgPick(btn, focus) {
    cgTabs.forEach(function (b) { var on = b === btn; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
      var p = document.getElementById('cg-panel-' + b.getAttribute('data-cg-tab')); if (p) p.hidden = !on; });
    if (focus) btn.focus();
  }
  cgTabs.forEach(function (b, i) {
    b.addEventListener('click', function () { cgPick(b); });
    b.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!n) return;
      e.preventDefault(); cgPick(cgTabs[(i + n + cgTabs.length) % cgTabs.length], true);
    });
  });
  var cgBoxes = [].slice.call(document.querySelectorAll('[data-cg-check]'));
  if (cgBoxes.length) {
    var cgSaved = [];
    try { cgSaved = JSON.parse(localStorage.getItem('aurelian-cg') || '[]'); } catch (e) {}
    cgBoxes.forEach(function (b) { b.checked = cgSaved.indexOf(b.getAttribute('data-cg-check')) > -1; });
    var cgUpd = function () {
      var done = cgBoxes.filter(function (b) { return b.checked; });
      var s = document.getElementById('cg-score'), bar = document.getElementById('cg-bar');
      if (s) s.textContent = done.length === cgBoxes.length ? 'All ' + cgBoxes.length + ' done. You\'re ready to apply.' : done.length + ' of ' + cgBoxes.length + ' done';
      if (bar) bar.style.transform = 'scaleX(' + (done.length / cgBoxes.length) + ')';
      try { localStorage.setItem('aurelian-cg', JSON.stringify(done.map(function (b) { return b.getAttribute('data-cg-check'); }))); } catch (e) {}
    };
    cgBoxes.forEach(function (b) { b.addEventListener('change', cgUpd); }); cgUpd();
  }

  // Key dates: mark the next one coming up
  (function () {
    const items = $$('.tl-item[data-d]'); if (!items.length) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const next = items.find(li => new Date(li.dataset.d + 'T12:00') >= today);
    items.forEach(li => { if (new Date(li.dataset.d + 'T12:00') < today) li.classList.add('past'); });
    if (next) next.classList.add('next');
  })();

  // Houses: prefects by House (tabs)
  (function () {
    const tabs = $$('[data-pf-tab]'); if (!tabs.length) return;
    const pick = (t, focus) => {
      tabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; const p = $('#pf-panel-' + b.dataset.pfTab); if (p) p.hidden = !on; });
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => pick(t));
      t.addEventListener('keydown', e => { const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!n) return; e.preventDefault(); pick(tabs[(i + n + tabs.length) % tabs.length], true); });
    });
  })();

  // Campus life: plan a guest pass
  (function () {
    const f = $('#gp-form'); if (!f) return;
    const kind = () => ($('input[name="gp-kind"]:checked', f) || {}).value;
    const sync = () => { const n = kind() === 'night'; $('#gp-nights-f').hidden = !n; $('#gp-agree-f').hidden = !n; const cs = $('#gp-count'); [...cs.options].forEach(o => { o.disabled = n && o.value !== '1'; }); if (n) cs.value = '1'; $('#gp-count-hint').textContent = n ? 'Overnight: 1 guest per student, per night.' : 'Up to 3 day visitors at a time.'; };
    $$('input[name="gp-kind"]', f).forEach(r => r.addEventListener('change', sync)); sync();
    f.addEventListener('submit', ev => {
      ev.preventDefault();
      const p = {host: $('#gp-host').value.trim(), guest: $('#gp-guest').value.trim(), kind: kind(), d: $('#gp-date').value, n: +$('#gp-nights').value, agree: $('#gp-agree').checked, minor: $('#gp-minor').checked, c: +$('#gp-count').value};
      if (p.kind === 'day') p.n = 0;
      const bad = GUEST.check(p);
      $$('[aria-invalid]', f).forEach(x => x.removeAttribute('aria-invalid'));
      if (bad) { $('#gp-err').textContent = bad[1]; const el = $('#' + bad[0]); if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } return; }
      $('#gp-err').textContent = '';
      const pass = GUEST.add(p);
      $('#gp-out').innerHTML = GUEST.card(pass) + '<p class="hint">Saved. You can see and cancel it in <a href="signin.html">MyAurelian</a> under Guests.</p>';
      $('#gp-guest').value = '';
    });
  })();

  // Tutoring: book a session
  (function () {
    const T = window.AURELIAN_TUTOR; if (!T) return;
    const sub = $('#tb-subject'), slots = $('#tb-slots'), listEl = $('#tb-list');
    let pick = null;
    const load = () => { try { return JSON.parse(localStorage.getItem('aurelian-tutoring') || '[]'); } catch (e) { return []; } };
    const save = l => { try { localStorage.setItem('aurelian-tutoring', JSON.stringify(l)); } catch (e) {} };
    const drawSlots = () => {
      const taken = load().filter(b => b.k === sub.value).map(b => b.s);
      pick = null; slots.replaceChildren();
      T[sub.value].s.forEach(s => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.textContent = s;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
        if (taken.includes(s)) { b.disabled = true; b.textContent = s + ' (booked)'; }
        b.addEventListener('click', () => { pick = s; $$('.chip', slots).forEach(x => x.setAttribute('aria-checked', String(x === b))); $('#tb-err').textContent = ''; });
        slots.appendChild(b);
      });
    };
    const drawList = () => {
      const l = load(); listEl.replaceChildren();
      if (!l.length) return;
      const h = document.createElement('h3'); h.className = 'tb-h'; h.textContent = 'Your sessions'; listEl.appendChild(h);
      const ul = document.createElement('ul'); ul.className = 'pt-list';
      l.forEach((b, i) => {
        const li = document.createElement('li'), sp = document.createElement('span'), bb = document.createElement('b'), sm = document.createElement('small');
        bb.textContent = T[b.k].n; sm.textContent = b.s + ' · ' + b.w + (b.note ? ' · ' + b.note : ''); sp.append(bb, sm);
        const x = document.createElement('button'); x.type = 'button'; x.className = 'link'; x.textContent = 'Cancel';
        x.addEventListener('click', () => { const ll = load(); ll.splice(i, 1); save(ll); drawList(); drawSlots(); });
        li.append(sp, x); ul.appendChild(li);
      });
      listEl.appendChild(ul);
    };
    sub.addEventListener('change', drawSlots);
    $('#tb-go').addEventListener('click', () => {
      if (!pick) { $('#tb-err').textContent = 'Pick one of the open times first.'; const f = $('.chip:not([disabled])', slots); if (f) f.focus(); return; }
      const l = load(); l.push({k: sub.value, s: pick, w: $('#tb-where').value, note: $('#tb-note').value.trim()}); save(l);
      $('#tb-note').value = ''; drawSlots(); drawList();
      $('#tb-err').textContent = '';
    });
    $$('[data-tutor-pick]').forEach(b => b.addEventListener('click', () => { sub.value = b.dataset.tutorPick; drawSlots(); $('#book').scrollIntoView({behavior: reduce ? 'auto' : 'smooth'}); sub.focus({preventScroll: true}); }));
    drawSlots(); drawList();
  })();

  // Campus map: detail layers
  $$('[data-layer]').forEach(c => c.addEventListener('change', () => { const s = $('svg.campus'); if (s) s.classList.toggle('hide-' + c.dataset.layer, !c.checked); }));

  // Home page map: open the building on the full campus map
  $$('.home-map .bldg').forEach(g => { const go = () => { location.href = 'campus-map.html#' + g.dataset.b; }; g.addEventListener('click', go); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }); });
})();
