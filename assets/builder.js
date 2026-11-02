// Package builder (tuition page)

(function(){
  if (!document.getElementById('pkg-form')) return;
  const $ = id => document.getElementById(id);
  const money = n => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');

  // Majors: residence rule and whether instrument rental applies
  const MAJORS = {
    mt:{res:'four'}, dance:{res:'four'}, circus:{res:'first'},
    acting:{res:'first'}, directing:{res:'first'}, writing:{res:'none'}, musicperf:{res:'first',music:true}, voice:{res:'first'},
    jazz:{res:'none',music:true}, tdt:{res:'first'}, comp:{res:'none',music:true}, fine:{res:'none'}, illus:{res:'none'}, film:{res:'none'},
    photo:{res:'none'}, jewel:{res:'none'}, ceramics:{res:'none'}, fashion:{res:'none'}, arthist:{res:'none'}, ixd:{res:'none'},
    arch:{res:'none'}, mgmt:{res:'none'}
  };
  const PKG = {ensemble:33200, duet:35100, solo:36700, commute:23100};
  const NAME = {ensemble:'The Ensemble', duet:'The Duet', solo:'The Solo', commute:'Commute'};
  const DEFAULT_MEAL = {ensemble:'flex', duet:'full', solo:'full'};
  const MEAL_PRICE = {full:4200, flex:3200, light:1800};
  const MEAL_NAME = {full:'Full', flex:'Flex', light:'Light'};
  const TUITION = 22000;

  let mealTouched = false;
  const overrides = {};   // item key -> true means "kept" (added back), false means "removed"

  const radio = name => { const r = document.querySelector('input[name="'+name+'"]:checked'); return r ? r.value : null; };
  const setRadio = (name, value) => { const r = document.querySelector('input[name="'+name+'"][value="'+value+'"]'); if (r) r.checked = true; };

  function render(){
    const majorEl = $('major');
    const majorKey = majorEl.value;
    const m = MAJORS[majorKey];
    const majorName = majorEl.options[majorEl.selectedIndex].text;

    // Residence rules
    const y1CommuteOk = m.res === 'none';
    const y2CommuteOk = m.res !== 'four';
    $('y1-commute').disabled = !y1CommuteOk;
    $('y2-commute').disabled = !y2CommuteOk;
    if (!y1CommuteOk && radio('y1') === 'commute') setRadio('y1','ensemble');
    if (!y2CommuteOk && radio('y2') === 'commute') setRadio('y2','ensemble');
    $('major-note').textContent =
      m.res === 'four' ? majorName + ' students live on campus all four years, for daily 7am technique classes, late rehearsals, and ensemble work. Commuting is not available.' :
      m.res === 'first' ? majorName + ' students live on campus in their first year' + (majorKey === 'tdt' ? ', when they crew the shows' : '') + '. After that, you can stay or commute.' :
      majorName + ' is commuter-friendly. Live on campus or commute, any year.';

    const y1 = radio('y1'), y2 = radio('y2');
    const plans = [y1, y2, y2, y2];
    $('housing-note').textContent = (!y1CommuteOk || !y2CommuteOk)
      ? 'Commute options that your major doesn’t allow are turned off.' : '';

    // Meal default follows the later-year plan until the student picks one
    if (!mealTouched && DEFAULT_MEAL[y2]) setRadio('meal', DEFAULT_MEAL[y2]);
    const meal = radio('meal');
    const onCampus = plans.filter(p => p !== 'commute');
    const hasEnsemble = plans.includes('ensemble');
    const hasNoKitchen = plans.some(p => p === 'duet' || p === 'solo');
    $('meal-light').disabled = !hasEnsemble;
    let mealNote = '';
    if (meal === 'light' && hasNoKitchen) mealNote = 'The Duet and Solo have no kitchen, so those years use the Flex Plan instead of Light.';
    else if (onCampus.length === 0) mealNote = 'Commuters don’t need a meal plan. You can buy Refectory meals as you go.';
    else if (onCampus.length < 4) mealNote = 'Your meal plan covers the years you live on campus.';
    if (hasNoKitchen && meal !== 'light') mealNote = mealNote || 'The Duet and Solo have no kitchen, so a meal plan is required for those years.';
    $('meal-note').textContent = mealNote;

    // Accessibility note
    $('acc-note').textContent = radio('acc') === 'yes'
      ? 'Every floor plan has an accessible version at the same price. Accessible parking permits get a priority spot near your hall. Accessibility Services will contact you before move-in.' : '';

    // Instrument question only for music majors
    $('instrument-row').hidden = !m.music;
    const ownInstrument = m.music && radio('inst') === 'yes';

    const car = radio('car') === 'yes';
    const tier = Number(radio('tier'));

    // Swappable items: [key, label, per-year value, applies-to plan test]
    const ITEMS = [
      ['bus', 'Bus pass', 300, () => true],
      ['coupons', 'Grocery coupons', 500, p => p === 'ensemble'],
      ['shuttle', 'Grocery shuttle', 100, p => p === 'ensemble']
    ];

    let full = 0, credits = 0;
    const yearRows = [];
    const itemYears = {bus:0, coupons:0, shuttle:0};
    plans.forEach((p, i) => {
      let base = PKG[p] + tier;
      let credit = 0;
      let mealLabel = '';
      if (p !== 'commute') {
        let chosen = meal;
        if (chosen === 'light' && p !== 'ensemble') chosen = 'flex';
        const diff = MEAL_PRICE[chosen] - MEAL_PRICE[DEFAULT_MEAL[p]];
        if (diff > 0) base += diff; else credit += -diff;
        mealLabel = MEAL_NAME[chosen];
      }
      ITEMS.forEach(([key, , val, applies]) => {
        if (!applies(p)) return;
        itemYears[key]++;
        const removed = overrides[key] === undefined ? car : !overrides[key];
        if (removed) credit += val;
      });
      if (car) base += 250;                 // parking pass added
      if (ownInstrument) credit += 400;     // instrument rental removed
      full += base; credits += credit;
      yearRows.push([i, p, mealLabel, base - credit]);
    });
    const abroad = $('abroad').checked ? 4000 : 0;
    full += abroad;

    // Item list
    const list = $('items'); list.replaceChildren();
    ITEMS.forEach(([key, label, val]) => {
      const yrs = itemYears[key];
      if (!yrs) return;
      const removed = overrides[key] === undefined ? car : !overrides[key];
      const li = document.createElement('li');
      if (removed) li.className = 'off';
      const left = document.createElement('div');
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = label;
      const st = document.createElement('div'); st.className = 'st';
      st.textContent = (removed ? 'Removed: saves ' : 'Included: ') + money(val) + ' a year' + (yrs < 4 ? ', for ' + yrs + (yrs === 1 ? ' year' : ' years') : '');
      left.append(nm, st);
      const btn = document.createElement('button'); btn.type = 'button';
      btn.textContent = removed ? 'Add back' : 'Remove';
      btn.setAttribute('aria-label', (removed ? 'Add back ' : 'Remove ') + label);
      btn.addEventListener('click', () => { overrides[key] = removed; render(); list.querySelector('[aria-label$="' + label + '"]')?.focus(); });
      li.append(left, btn);
      list.appendChild(li);
    });
    if (car) {
      const li = document.createElement('li');
      li.innerHTML = '<div><span class="nm">Parking pass</span><div class="st">Added because you’re bringing a car</div></div><span class="amt">+$250 a year</span>';
      list.appendChild(li);
    }
    if (m.music) {
      const li = document.createElement('li');
      if (ownInstrument) li.className = 'off';
      li.innerHTML = '<div><span class="nm">Instrument rental</span><div class="st">' + (ownInstrument ? 'Removed: saves $400 a year' : 'Included') + '</div></div>';
      list.appendChild(li);
    }

    // Aid
    const merit = Number($('merit').value);
    let grant = Math.max(0, Number($('grant').value) || 0);
    if (grant > TUITION) grant = TUITION;
    const aid = (merit + grant) * 4;
    const total = Math.max(0, full - credits - aid);
    const perYear = total / 4;

    // Ticket
    const tierName = {0:'Encore', 1800:'Spotlight', 3600:'Standing Ovation'}[tier];
    $('t-who').textContent = majorName + ' · ' + tierName + (car ? ' · bringing a car' : '');
    $('t-full').textContent = money(full);
    $('t-credits').textContent = money(-credits);
    $('t-aid').textContent = money(-aid);
    $('t-total').textContent = money(total);
    $('t-year').textContent = 'About ' + money(perYear) + ' a year';
    $('t-month').textContent = 'or ' + money(perYear / 10) + ' a month over 10 payments';
    $('t-full-pay').textContent = 'or ' + money(perYear * 0.98) + ' a year paid in full (2% off)';
    $('t-ws').hidden = !$('ws').checked;
    $('t-ws').textContent = 'Plus up to $3,000 a year earned through work-study';

    const tb = $('t-years'); tb.replaceChildren();
    const groups = [];
    yearRows.forEach(r => {
      const last = groups[groups.length - 1];
      const key = r[1] + r[2] + r[3];
      if (last && last.key === key) last.to = r[0] + 1; else groups.push({key, from:r[0] + 1, to:r[0] + 1, plan:r[1], meal:r[2], amt:r[3]});
    });
    groups.forEach(g => {
      const li = document.createElement('li');
      const a = document.createElement('b'); a.textContent = g.from === g.to ? 'Year ' + g.from : 'Years ' + g.from + '–' + g.to;
      const b = document.createElement('span'); b.textContent = NAME[g.plan] + (g.meal ? ', ' + g.meal : '');
      const c = document.createElement('strong'); c.textContent = money(g.amt) + '/yr';
      li.append(a, b, c); tb.appendChild(li);
    });
    const tot = document.createElement('li'); tot.className = 'yrs-total';
    const ta = document.createElement('b'); ta.textContent = 'Before aid';
    const tc = document.createElement('strong'); tc.textContent = money(full - credits);
    tot.append(ta, tc); tb.appendChild(tot);

    clearTimeout(render.t);
    render.t = setTimeout(() => { $('t-live').textContent = 'Estimated cost ' + money(total) + ' over four years, about ' + money(perYear) + ' a year.'; }, 600);
  }

  $('pkg-form').addEventListener('input', e => { if (e.target.name === 'meal') mealTouched = true; if (e.target.name === 'car') { for (const k in overrides) delete overrides[k]; } render(); });
  $('pkg-form').addEventListener('change', render);
  $('pkg-form').addEventListener('submit', e => e.preventDefault());
  render();
})();
