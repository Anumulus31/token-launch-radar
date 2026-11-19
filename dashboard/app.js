// Token Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, a filterable table, a per-protocol detail view with the model's own
// inputs and the protocol's farm plan, and the live-token and set-aside views. No network: every
// byte it shows is in data.js. The page re-derives each row's implied value and farm plan from
// the same rules main.ts uses, so the screenshots and board.json cannot drift apart.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', tab: 'pre', sort: 'implied', dir: -1, selected: null };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd0.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return n === null || n === undefined ? 'n/a' : 'x' + n.toFixed(3); }

  // The model in one function: the page recomputes a row from the snapshot figures and checks the
  // number board.json carries, so the page's code and the board's data are visibly the same arithmetic.
  function impliedOf(row) {
    var m = DATA.model;
    var growth = Math.min(m.growth_cap, Math.max(m.growth_floor, row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d));
    var growthMult = 1 + (growth / 100) * m.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? m.unknown_age_days : row.age_days;
    var maturity = m.maturity_floor + (Math.min(Math.max(age, 0), m.maturity_days) / m.maturity_days) * m.maturity_range;
    var breadth = 1 + m.breadth_per_chain * (Math.min(Math.max((row.chains || []).length, 1), m.breadth_max_chains) - 1);
    return Math.max(1, Math.round(row.tvl_usd * row.multiple * growthMult * maturity * breadth));
  }

  // The farm plan is the same derivation main.ts writes to board.json: category, chains, TVL and
  // age decide the action, the capital, the hold and every cost and time. No name is special-cased.
  function chainOf(p) { return p.chains && p.chains.length > 0 ? p.chains[0] : 'its main chain'; }
  function capitalFor(p) {
    if (p.tvl_usd >= 5e9) return 250;
    if (p.tvl_usd >= 1e9) return 150;
    if (p.tvl_usd >= 1e8) return 100;
    return 50;
  }
  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }
  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    if (c.indexOf('dex') >= 0 || c.indexOf('amm') >= 0 || c.indexOf('swap') >= 0) return 'Provide $' + capital + ' of liquidity to ' + name + "'s main pool on " + chain + ' and keep the position open.';
    if (c.indexOf('yield') >= 0 || c.indexOf('farm') >= 0 || c.indexOf('leveraged') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s main vault on " + chain + ' and keep the shares.';
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    if (c.indexOf('basis') >= 0) return 'Deposit $' + capital + ' of USDC into ' + name + "'s basis vault on " + chain + ' and keep the position open.';
    if (c.indexOf('payment') >= 0) return 'Fund $' + capital + ' through ' + name + ' on ' + chain + ' and make one payment with it.';
    if (c.indexOf('governance') >= 0) return 'Deposit $' + capital + ' into ' + name + ' on ' + chain + ' and vote once with the position.';
    if (c.indexOf('chain') >= 0) return 'Bridge $' + capital + " of USDC to " + chain + " through " + name + "'s own app and use it there.";
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }
  function secondActionFor(p, capital) {
    var c = (p.category || '').toLowerCase();
    var third = Math.max(10, Math.round(capital / 3));
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) return 'Borrow about $' + third + ' against the supply and repay it within the week, so the position shows both sides.';
    if (c.indexOf('dex') >= 0 || c.indexOf('amm') >= 0 || c.indexOf('swap') >= 0) return 'Swap about $' + third + ' through the pool each week so the position adds trading volume.';
    if (c.indexOf('yield') >= 0 || c.indexOf('farm') >= 0 || c.indexOf('leveraged') >= 0) return "Harvest or compound the vault's yield once a week instead of letting it sit.";
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) return 'Restake the staking rewards each week so the staked balance grows.';
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) return 'Close and reopen a small position each week so the account stays active.';
    if (c.indexOf('rwa') >= 0) return 'Check the yield accrual on the receipt each week and keep a record of it.';
    if (c.indexOf('insurance') >= 0) return "Review the cover's terms each week and renew it before it lapses.";
    if (c.indexOf('prediction') >= 0) return 'Settle one market each week and place the next position with the proceeds.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) return "Check the vault's allocation each week and move the position if the curator changes it.";
    return 'Make one more qualifying action each week, such as a deposit, a swap or a vote.';
  }
  function stepText(step) {
    var s = step.text + ' Cost: ' + step.cost + '. Time: ' + step.time + '.';
    if (s.length > 600) s = s.slice(0, 596) + '...';
    if (s.length < 20) s = s + " Hold the position and check the protocol's own page.";
    return s;
  }
  function farmSteps(p) {
    var chain = chainOf(p);
    var capital = capitalFor(p);
    var hold = holdDaysFor(p.age_days);
    return [
      { text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.', cost: 'under $3 of gas for the first transaction', time: '5 minutes' },
      { text: actionFor(p, capital, chain), cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas', time: '15 minutes to set up' },
      { text: secondActionFor(p, capital), cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.', cost: 'about $2 of gas a week', time: '10 minutes a week' },
      { text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.', cost: 'the $' + capital + ' stays in the position', time: hold + ' days' },
      { text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.", cost: 'no fee to check, and never pay to claim', time: '10 minutes' },
      { text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.', cost: 'nothing but the log', time: '5 minutes' }
    ].map(stepText);
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('tab')) state.tab = params.get('tab');
    if (params.get('p')) state.selected = params.get('p');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.tab !== 'pre') params.set('tab', state.tab);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'multiple') { av = a.multiple; bv = b.multiple; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function headerHtml() {
    return '<header class="top">' +
      '<div class="brand"><span class="mark"></span>Token Radar <small>pre-token board</small></div>' +
      '<div class="top-meta"><span>Snapshot <b>' + esc(DATA.as_of) + '</b></span>' +
      '<span>Source <b>DefiLlama protocol index</b></span>' +
      '<span>Model <b>' + esc(DATA.model_version) + '</b></span></div></header>';
  }

  function ledeHtml() {
    return '<section class="lede"><div>' +
      '<h1>' + DATA.watchlist_size + ' watchlist protocols, ranked by implied value</h1>' +
      '<p>The watchlist is the floor: every protocol with at least ' + fmtUsd(DATA.floor_usd) + ' of TVL and no token on record. ' +
      'The early radar adds ' + DATA.early_size + ' launch candidates below that floor. Implied value is a model, not a promise — ' +
      'and a protocol that records no token may still have one its record does not carry.</p></div>' +
      '<div class="facts">' +
      '<div class="fact"><span>Watchlist covered</span><b class="green">' + DATA.watchlist_size + ' / ' + DATA.watchlist_size + '</b></div>' +
      '<div class="fact"><span>Pre-token rows scored</span><b>' + DATA.board_size + '</b></div>' +
      '<div class="fact"><span>Early rows below the floor</span><b>' + DATA.early_size + '</b></div>' +
      '<div class="fact"><span>Total implied value</span><b>' + fmtUsd(DATA.total_implied_usd) + '</b></div>' +
      '</div></section>';
  }

  function controlsHtml() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var opts = function (list, current, allLabel) {
      var h = '<option value="all"' + (current === 'all' ? ' selected' : '') + '>' + esc(allLabel) + '</option>';
      list.forEach(function (v) {
        h += '<option value="' + esc(v) + '"' + (current === v ? ' selected' : '') + '>' + esc(v) + '</option>';
      });
      return h;
    };
    var tabBtn = function (tab, label) {
      return '<button type="button" data-tab="' + tab + '" aria-pressed="' + (state.tab === tab ? 'true' : 'false') + '">' + label + '</button>';
    };
    var count = state.tab === 'pre' ? filteredRows().length + ' rows shown'
      : state.tab === 'live' ? DATA.live.length + ' live-token protocols'
      : DATA.set_aside.length + ' of ' + DATA.set_aside_total + ' products set aside';
    return '<div class="controls">' +
      '<div class="field"><label for="q">Search</label>' +
      '<input type="search" id="q" placeholder="Search name, category or chain" value="' + esc(state.q) + '" aria-label="Search the board"></div>' +
      '<div class="field"><label for="category">Category</label><select id="category" aria-label="Filter by category">' + opts(categories, state.category, 'All categories') + '</select></div>' +
      '<div class="field"><label for="chain">Chain</label><select id="chain" aria-label="Filter by chain">' + opts(chains, state.chain, 'All chains') + '</select></div>' +
      '<div class="field"><span class="sub">Token status</span><div class="tabs">' + tabBtn('pre', 'Pre-token') + tabBtn('live', 'Live token') + tabBtn('aside', 'Set aside') + '</div></div>' +
      '<span class="count">' + esc(count) + '</span></div>';
  }

  function sortTh(key, label, cls) {
    var arrow = state.sort === key ? (state.dir < 0 ? ' v' : ' ^') : '';
    return '<th scope="col"' + (cls ? ' class="' + cls + '"' : '') + '><button type="button" data-sort="' + key + '">' + esc(label) + esc(arrow) + '</button></th>';
  }

  function boardTableHtml() {
    var list = sortedRows(filteredRows());
    if (list.length === 0) {
      return '<div class="panel"><div class="empty"><h2>No protocol matches that filter</h2>' +
        '<p>Clear the search or pick another category or chain to see the board again.</p>' +
        '<button class="button primary" type="button" data-clear="1">Clear filters</button></div></div>';
    }
    var max = 0;
    list.forEach(function (r) { if (r.implied_value_usd > max) max = r.implied_value_usd; });
    var rows = list.map(function (r) {
      var growth = r.change_7d === null ? 'n/a' : fmtPct(r.change_7d);
      var growthClass = r.change_7d === null ? '' : r.change_7d >= 0 ? 'pos' : 'neg';
      var pct = Math.max(3, Math.round((r.implied_value_usd / max) * 100));
      return '<tr data-slug="' + esc(r.slug) + '" data-selected="' + (state.selected === r.slug ? 'true' : 'false') + '" tabindex="0">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><div class="name"><b>' + esc(r.name) + (r.watchlist ? '<span class="badge watch">WATCHLIST</span>' : '') + '</b>' +
        '<span class="sub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + growthClass + '">' + growth + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td>' +
        '<td class="num">' + fmtMult(r.multiple) + '</td>' +
        '<td><div class="implied"><div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
        '<span class="num">' + fmtUsd(r.implied_value_usd) + '</span></div></td>' +
        '<td><span class="badge pre">no token</span></td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Pre-token protocols, strongest implied value first. Select a row for its model and farm plan.</caption>' +
      '<thead><tr>' + sortTh('implied', 'Rank') + sortTh('name', 'Protocol') + sortTh('tvl', 'TVL', 'num') +
      sortTh('growth', '7d', 'num') + sortTh('age', 'Age', 'num') + sortTh('multiple', 'Multiple', 'num') +
      sortTh('implied', 'Implied value') + '<th scope="col">Token</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function liveTableHtml() {
    var rows = DATA.live.map(function (r) {
      return '<tr><td class="num">live</td>' +
        '<td><div class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num ' + (r.change_7d !== null && r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</td>' +
        '<td class="num">' + fmtUsd(r.mcap_usd) + '</td>' +
        '<td><span class="badge live">already trades</span></td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Token live: these protocols already trade, so their market cap is a fact, not a model. They are set aside from the pre-token ranking.</caption>' +
      '<thead><tr><th scope="col">Status</th><th scope="col">Protocol</th><th scope="col" class="num">TVL</th><th scope="col" class="num">7d</th><th scope="col" class="num">Market cap</th><th scope="col">Token</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function asideTableHtml() {
    var rows = DATA.set_aside.map(function (r) {
      return '<tr><td><div class="name"><b>' + esc(r.name) + '</b><span class="sub">' + esc(r.category || 'Other') + ' on ' + esc((r.chains || []).slice(0, 2).join(', ') || 'an unnamed chain') + '</span></div></td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td>' + esc(r.reason) + '</td></tr>';
    }).join('');
    return '<div class="panel"><div class="table-wrap"><table>' +
      '<caption>Pre-token by record, but not a launch to come: wrapped, staked or bridged products of a token that already trades, versioned pools and exchange products. They are listed, not ranked, so the board never mistakes a wrapped token for a new one.</caption>' +
      '<thead><tr><th scope="col">Protocol</th><th scope="col" class="num">TVL</th><th scope="col">Why it is set aside</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }

  function modelPanelHtml() {
    var m = DATA.model;
    var cal = DATA.calibration.by_category.filter(function (c) {
      return DATA.rows.some(function (r) { return (r.category || 'Other') === c.category; });
    });
    var calRows = cal.map(function (c) {
      return '<tr><td>' + esc(c.category) + '</td><td class="num">' + c.live_n + '</td>' +
        '<td class="num">' + (c.category_median === null ? 'n/a' : fmtMult(c.category_median)) + '</td>' +
        '<td class="num">' + fmtMult(c.multiple) + '</td></tr>';
    }).join('');
    return '<section class="panel model"><h2>How implied value is computed</h2>' +
      '<p>Every row is scored by one function of the snapshot figures. No protocol name is special-cased, and no row is hand-picked.</p>' +
      '<div class="formula">implied = round( tvl_usd x <b>multiple</b> x (1 + clamp(change_7d, ' + m.growth_floor + ', ' + m.growth_cap + ') / 100 x ' + m.growth_weight + ') x (' + m.maturity_floor + ' + min(age_days, ' + m.maturity_days + ') / ' + m.maturity_days + ' x ' + m.maturity_range + ') x (1 + ' + m.breadth_per_chain + ' x (min(chains, ' + m.breadth_max_chains + ') - 1)) )</div>' +
      '<p style="margin-top:12px">The <b>multiple</b> is calibrated from the snapshot itself: for each category, the median market-cap-to-TVL ratio of its live-token protocols (each ratio winsorized at ' + m.winsorize_ratio + '), shrunk toward the global median ' + fmtMult(DATA.calibration.global_median) + ' with a prior weight of ' + m.shrink_prior + ' live protocols, then clamped to [' + m.multiple_floor + ', ' + m.multiple_cap + ']. A category with no live comp takes the global median. Age is the time since the protocol was first listed, the best record of how long it has run with no token; an unlisted age uses ' + m.unknown_age_days + ' days.</p>' +
      '<div class="calib"><table><caption style="padding:0 0 6px">Category calibration — ' + DATA.calibration.live_comp_count + ' live protocols with a market cap behind it</caption>' +
      '<thead><tr><th scope="col">Category</th><th scope="col" class="num">Live comps</th><th scope="col" class="num">Category median</th><th scope="col" class="num">Multiple used</th></tr></thead><tbody>' + calRows + '</tbody></table></div></section>';
  }

  var dialog = document.createElement('dialog');
  dialog.className = 'detail';
  dialog.id = 'detail';
  dialog.setAttribute('aria-labelledby', 'detail-title');
  dialog.addEventListener('close', function () { state.selected = null; writeHash(); });

  function openDetail(slug) {
    var row = null;
    DATA.rows.forEach(function (r) { if (r.slug === slug) row = r; });
    if (!row) return;
    state.selected = slug;
    writeHash();
    var steps = farmSteps(row);
    var recomputed = impliedOf(row);
    var cal = null;
    DATA.calibration.by_category.forEach(function (c) { if (c.category === (row.category || 'Other')) cal = c; });
    var stepsHtml = steps.map(function (s) {
      var at = s.indexOf(' Cost: ');
      var action = at >= 0 ? s.slice(0, at) : s;
      var tail = at >= 0 ? s.slice(at + 1) : '';
      return '<li><b>' + esc(action) + '</b><span class="cost">' + esc(tail) + '</span></li>';
    }).join('');
    dialog.innerHTML = '<div class="detail-head"><div>' +
      '<span class="rankline">Rank ' + row.rank + ' of ' + DATA.board_size + (row.watchlist ? ' · Watchlist' : '') + '</span>' +
      '<h2 id="detail-title">' + esc(row.name) + '</h2>' +
      '<p class="sub">' + esc(row.category || 'Other') + ' on ' + esc((row.chains || []).join(', ') || 'an unnamed chain') + '</p></div>' +
      '<button class="close" type="button" aria-label="Close details" data-close="1">Close</button></div>' +
      '<section class="detail-section"><h3>Implied value</h3>' +
      '<div class="equation">' +
      '<div><span>TVL</span><b class="num">' + fmtUsd(row.tvl_usd) + '</b></div>' +
      '<div><span>Seven-day growth</span><b class="num">' + fmtPct(row.change_7d) + '</b></div>' +
      '<div><span>Age with no token</span><b class="num">' + fmtAge(row.age_days) + '</b></div>' +
      '<div><span>Category multiple</span><b class="num">' + fmtMult(row.multiple) + '</b></div>' +
      '<div><span>Growth multiplier</span><b class="num">' + row.growth_multiplier.toFixed(4) + '</b></div>' +
      '<div><span>Maturity multiplier</span><b class="num">' + row.maturity_multiplier.toFixed(4) + '</b></div>' +
      '<div><span>Breadth multiplier</span><b class="num">' + row.breadth_multiplier.toFixed(4) + '</b></div>' +
      '<div><span>Chains</span><b class="num">' + (row.chains || []).length + '</b></div>' +
      '<div class="total"><span>Implied value</span><b class="num">' + fmtUsd(row.implied_value_usd) + '</b></div>' +
      '</div>' +
      '<p class="sub" style="margin-top:12px">Model ' + esc(DATA.model_version) + ': the same function scores every protocol. ' +
      'The page recomputes this row as ' + fmtUsd(recomputed) + (recomputed === row.implied_value_usd ? ', the same number board.json carries.' : ', which differs from the board: the data would be stale.') +
      (cal ? ' Its category multiple comes from ' + cal.live_n + ' live comp' + (cal.live_n === 1 ? '' : 's') + ' with a median ratio of ' + (cal.category_median === null ? 'n/a' : fmtMult(cal.category_median)) + '.' : '') +
      ' This is an estimate, not a price.</p></section>' +
      '<section class="detail-section"><h3>Farm plan</h3><ol class="steps">' + stepsHtml + '</ol></section>';
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  function render() {
    var table = state.tab === 'pre' ? boardTableHtml() : state.tab === 'live' ? liveTableHtml() : asideTableHtml();
    var note = '<div class="note"><b>How to read this board.</b> Implied value is what a token would be worth if the protocol launched one at the multiple the market already pays live tokens in its own category — it does not predict whether or when a token is issued. ' +
      'A protocol that records no token may still have one its DefiLlama record does not carry, so treat every row as a lead to verify, never as a fact. Farm plans are concrete steps with costs and times; never pay to claim.</div>';
    app.innerHTML = '<div class="shell">' + headerHtml() + ledeHtml() + controlsHtml() + table +
      (state.tab === 'pre' ? modelPanelHtml() : '') + note +
      '<p class="foot">Token Radar · model ' + esc(DATA.model_version) + ' · snapshot ' + esc(DATA.as_of) + ' · ' + DATA.board_size + ' rows</p></div>';
    app.setAttribute('aria-busy', 'false');
    if (!dialog.isConnected) app.appendChild(dialog);
    if (state.selected) openDetail(state.selected);
  }

  app.addEventListener('click', function (e) {
    var t = e.target;
    var sortBtn = t.closest ? t.closest('[data-sort]') : null;
    if (sortBtn) {
      var key = sortBtn.getAttribute('data-sort');
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
      render();
      return;
    }
    var tabBtn = t.closest ? t.closest('[data-tab]') : null;
    if (tabBtn) { state.tab = tabBtn.getAttribute('data-tab'); state.selected = null; writeHash(); render(); return; }
    if (t.closest && t.closest('[data-clear]')) {
      state.q = ''; state.category = 'all'; state.chain = 'all'; writeHash(); render(); return;
    }
    if (t.closest && t.closest('[data-close]')) { dialog.close(); return; }
    var tr = t.closest ? t.closest('tr[data-slug]') : null;
    if (tr) openDetail(tr.getAttribute('data-slug'));
  });
  app.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'q') { state.q = e.target.value; writeHash(); render(); var q = document.getElementById('q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  });
  app.addEventListener('change', function (e) {
    if (!e.target) return;
    if (e.target.id === 'category') { state.category = e.target.value; writeHash(); render(); }
    if (e.target.id === 'chain') { state.chain = e.target.value; writeHash(); render(); }
  });
  app.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.matches && e.target.matches('tr[data-slug]')) {
      e.preventDefault();
      openDetail(e.target.getAttribute('data-slug'));
    }
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dialog.open) dialog.close();
  });

  readHash();
  render();
})();
