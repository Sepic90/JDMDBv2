import { useState, useMemo } from 'react';

// ── Date helpers ──────────────────────────────────────────────────────
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const isoWeekKey = (d) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

const monthKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatWeekKey = (key) => {
  if (!key) return '—';
  const [y, w] = key.split('-W');
  return `Wk ${w} · ${y}`;
};

const formatMonthKey = (key) => {
  if (!key) return '—';
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const formatDayKey = (key) => {
  if (!key) return '—';
  return new Date(key).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const timeAgo = (timestamp) => {
  if (!timestamp) return '—';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60)      return 'just now';
  if (seconds < 3600)    return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)   return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800)  return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
};

const tierFor = (r) => {
  if (r >= 15) return { label: 'Legendary',  color: 'var(--tier-leg)' };
  if (r >= 10) return { label: 'Wild Build', color: 'var(--tier-wild)' };
  if (r >= 5)  return { label: 'Modified',   color: 'var(--tier-mod)' };
  return         { label: 'Stock',      color: 'var(--tier-stock)' };
};

export default function Showroom({ entries }) {
  const [seed, setSeed] = useState(() => Math.random());

  const hofEntries = useMemo(() => entries.filter(e => e.specs?.hof), [entries]);

  // ── Core aggregates ───────────────────────────────────────────────────
  const collectionPower = useMemo(() =>
    entries.reduce((s, e) => s + (e.totalRarity || 0), 0),
    [entries]
  );

  const avgRarity = useMemo(() =>
    entries.length ? (collectionPower / entries.length).toFixed(1) : '0.0',
    [entries, collectionPower]
  );

  // ── Chronological index numbers (N° 0001 = oldest entry) ────────────
  const chronoIndex = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0)
    );
    const map = new Map();
    sorted.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  }, [entries]);

  const fmtIdx = (id) => `N° ${String(chronoIndex.get(id) || 0).padStart(4, '0')}`;

  // ── From the archive: one random pull per visit ──────────────────────
  const rediscovery = useMemo(() => {
    if (!entries.length) return null;
    const withUrl = entries.filter(e => e.url);
    const pool = withUrl.length ? withUrl : entries;
    return pool[Math.floor(seed * pool.length)];
  }, [entries, seed]);

  // ── Records board ────────────────────────────────────────────────────
  const records = useMemo(() => {
    const byWeek  = {};
    const byMonth = {};
    const byDay   = {};

    entries.forEach(e => {
      if (!e.timestamp) return;
      const d = new Date(e.timestamp);
      const r = e.totalRarity || 0;
      byWeek[isoWeekKey(d)]  = (byWeek[isoWeekKey(d)]  || 0) + r;
      byMonth[monthKey(d)] = (byMonth[monthKey(d)] || 0) + r;
      byDay[dayKey(d)]   = (byDay[dayKey(d)]   || 0) + r;
    });

    const bestOf = (obj) => {
      const top = Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
      return top ? { key: top[0], value: top[1] } : null;
    };

    const biggestFind = [...entries]
      .sort((a, b) => (b.totalRarity || 0) - (a.totalRarity || 0))[0] || null;

    return {
      bestWeek:  bestOf(byWeek),
      bestMonth: bestOf(byMonth),
      bestDay:   bestOf(byDay),
      biggestFind,
    };
  }, [entries]);

  // ── Streaks ──────────────────────────────────────────────────────────
  const streaks = useMemo(() => {
    if (!entries.length) return { current: 0, longest: 0 };

    const dayKeys = new Set(
      entries.filter(e => e.timestamp).map(e => dayKey(new Date(e.timestamp)))
    );
    if (!dayKeys.size) return { current: 0, longest: 0 };

    const sorted = [...dayKeys].sort();

    let longest = 0;
    let run = 0;
    let prev = null;
    for (const k of sorted) {
      const d = new Date(k);
      if (prev) {
        const diff = Math.round((d - prev) / 86400000);
        run = diff === 1 ? run + 1 : 1;
      } else {
        run = 1;
      }
      if (run > longest) longest = run;
      prev = d;
    }

    let current = 0;
    const cursor = startOfDay(new Date());
    while (dayKeys.has(dayKey(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { current, longest };
  }, [entries]);

  // ── Recent entries ───────────────────────────────────────────────────
  const recentEntries = useMemo(() => {
    return [...entries]
      .filter(e => e.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
  }, [entries]);

  // ── Field activity heatmap (last 12 months) ──────────────────────────
  const heatmap = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      if (!e.timestamp) return;
      const k = dayKey(new Date(e.timestamp));
      counts[k] = (counts[k] || 0) + 1;
    });

    const end = startOfDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - 363);
    // Align the first column to a Monday
    const dow = start.getDay();
    start.setDate(start.getDate() + (dow === 0 ? -6 : 1 - dow));

    const weeks = [];
    let max = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const week = [];
      for (let i = 0; i < 7 && cursor <= end; i++) {
        const k = dayKey(cursor);
        const count = counts[k] || 0;
        if (count > max) max = count;
        week.push({ key: k, count });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    const monthLabels = [];
    let prevMonth = '';
    weeks.forEach(week => {
      const m = new Date(week[0].key).toLocaleDateString('en-GB', { month: 'short' });
      monthLabels.push(m !== prevMonth ? m : '');
      prevMonth = m;
    });
    // The first column is usually a partial month — suppress its label so
    // the strip doesn't open with a duplicate month name
    if (monthLabels.length > 1 && monthLabels[1] === '') monthLabels[0] = '';

    return { weeks, monthLabels, max: Math.max(max, 1) };
  }, [entries]);

  const levelFor = (count) =>
    count === 0 ? 0 : Math.min(4, Math.ceil((count / heatmap.max) * 4));

  // ── Composition ──────────────────────────────────────────────────────
  const rarityTiers = useMemo(() => {
    const tiers = [
      { label: 'Stock',      range: [0, 4],         color: 'var(--tier-stock)', count: 0 },
      { label: 'Modified',   range: [5, 9],         color: 'var(--tier-mod)',   count: 0 },
      { label: 'Wild Build', range: [10, 14],       color: 'var(--tier-wild)',  count: 0 },
      { label: 'Legendary',  range: [15, Infinity], color: 'var(--tier-leg)',   count: 0 },
    ];
    entries.forEach(e => {
      const r = e.totalRarity || 0;
      const tier = tiers.find(t => r >= t.range[0] && r <= t.range[1]);
      if (tier) tier.count++;
    });
    return tiers;
  }, [entries]);

  const topMakes = useMemo(() => {
    const counts = {};
    entries.forEach(e => { if (e.make) counts[e.make] = (counts[e.make] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  const topModels = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      if (!e.make || !e.model) return;
      const k = `${e.make} ${e.model}`;
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  // ── Milestones ───────────────────────────────────────────────────────
  const milestones = useMemo(() => {
    const total = entries.length;
    const power = collectionPower;
    const hofCount = hofEntries.length;
    const longestStreak = streaks.longest;

    const weeklyMakes = {};
    entries.forEach(e => {
      if (!e.timestamp || !e.make) return;
      const wk = isoWeekKey(new Date(e.timestamp));
      if (!weeklyMakes[wk]) weeklyMakes[wk] = new Set();
      weeklyMakes[wk].add(e.make);
    });
    const maxMakesInWeek = Math.max(0, ...Object.values(weeklyMakes).map(s => s.size));

    const make = (id, label, desc, value, goal) => ({
      id, label, desc, value, goal,
      unlocked: value >= goal,
      pct: Math.min(100, Math.round((value / goal) * 100)),
    });

    return [
      make('spot10',  '10 Spotted',     'Log 10 entries',          total, 10),
      make('spot50',  '50 Spotted',     'Log 50 entries',          total, 50),
      make('spot100', 'Century',        'Log 100 entries',         total, 100),
      make('spot500', 'Spotter Elite',  'Log 500 entries',         total, 500),
      make('hof1',    'First HOF',      'First Hall of Fame car',  hofCount, 1),
      make('hof5',    'HOF ×5',         '5 Hall of Fame entries',  hofCount, 5),
      make('hof10',   'HOF Hunter',     '10 Hall of Fame entries', hofCount, 10),
      make('pwr1k',   '1K Power',       'Reach 1,000 Power',       power, 1000),
      make('pwr5k',   '5K Power',       'Reach 5,000 Power',       power, 5000),
      make('streak7', 'Week Streak',    '7 days in a row',         longestStreak, 7),
      make('variety', 'Variety Hunter', '5 makes in one week',     maxMakesInWeek, 5),
    ];
  }, [entries, collectionPower, hofEntries, streaks]);

  const unlockedCount = milestones.filter(m => m.unlocked).length;

  const redisTier = rediscovery ? tierFor(rediscovery.totalRarity || 0) : null;

  return (
    <div className="col">

      {/* ── Hero ── */}
      <section className="col-hero">
        <div className="col-hero-main">
          <span className="col-hero-num">{entries.length}</span>
          <span className="col-hero-lbl">records<span className="jp">記録</span></span>
        </div>
        <div className="col-hero-stats">
          <div className="col-stat">
            <span className="col-stat-num">{collectionPower.toLocaleString('en-GB')}</span>
            <span className="col-stat-lbl">power<span className="jp">収集力</span></span>
          </div>
          <div className="col-stat">
            <span className="col-stat-num">{hofEntries.length}</span>
            <span className="col-stat-lbl">hall of fame<span className="jp">殿堂</span></span>
          </div>
          <div className="col-stat">
            <span className="col-stat-num">{avgRarity}</span>
            <span className="col-stat-lbl">avg rarity<span className="jp">平均</span></span>
          </div>
          <div className="col-stat">
            <span className="col-stat-num">
              {streaks.current}<em> / {streaks.longest}</em>
            </span>
            <span className="col-stat-lbl">streak · best<span className="jp">連続</span></span>
          </div>
        </div>
      </section>

      {/* ── From the archive + Records ── */}
      <div className="col-row">
        <section className="col-sec">
          <div className="col-sec-head">
            <span className="col-sec-title">From the Archive<span className="jp">再発見</span></span>
            <span className="col-sec-meta">one random pull per visit</span>
          </div>
          {rediscovery ? (
            <div className="redis-card">
              <div className="redis-top">
                <span className="redis-idx">{fmtIdx(rediscovery.id)}</span>
                <span className="tier-mark" style={{ color: redisTier.color }}>
                  {redisTier.label} · {rediscovery.totalRarity || 0} pts
                </span>
              </div>
              <div className="redis-name">{rediscovery.make} {rediscovery.model}</div>
              <div className="redis-variant">
                {rediscovery.variant}
                {rediscovery.color ? ` — ${rediscovery.color}` : ''}
                {rediscovery.status ? ` · ${rediscovery.status}` : ''}
                {rediscovery.year ? ` · ${rediscovery.year}` : ''}
              </div>
              {rediscovery.notes && (
                <p className="redis-notes">“{rediscovery.notes}”</p>
              )}
              <div className="redis-actions">
                {rediscovery.url && (
                  <a
                    className="btn btn-primary btn-sm"
                    href={rediscovery.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Street View ↗
                  </a>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setSeed(Math.random())}>
                  Show another →
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-note">The archive is empty — log your first find.</div>
          )}
        </section>

        <section className="col-sec">
          <div className="col-sec-head">
            <span className="col-sec-title">Records<span className="jp">記録帳</span></span>
          </div>
          <div className="ledger">
            <div className="ledger-row">
              <span className="ledger-lbl">Current streak</span>
              <span className="ledger-dots" />
              <span className="ledger-val">{streaks.current} {streaks.current === 1 ? 'day' : 'days'}</span>
              <span className="ledger-sub">best {streaks.longest}</span>
            </div>
            <div className="ledger-row">
              <span className="ledger-lbl">Best day</span>
              <span className="ledger-dots" />
              <span className="ledger-val">{records.bestDay ? `${records.bestDay.value} pts` : '—'}</span>
              {records.bestDay && <span className="ledger-sub">{formatDayKey(records.bestDay.key)}</span>}
            </div>
            <div className="ledger-row">
              <span className="ledger-lbl">Best week</span>
              <span className="ledger-dots" />
              <span className="ledger-val">{records.bestWeek ? `${records.bestWeek.value} pts` : '—'}</span>
              {records.bestWeek && <span className="ledger-sub">{formatWeekKey(records.bestWeek.key)}</span>}
            </div>
            <div className="ledger-row">
              <span className="ledger-lbl">Best month</span>
              <span className="ledger-dots" />
              <span className="ledger-val">{records.bestMonth ? `${records.bestMonth.value} pts` : '—'}</span>
              {records.bestMonth && <span className="ledger-sub">{formatMonthKey(records.bestMonth.key)}</span>}
            </div>
            <div className="ledger-row">
              <span className="ledger-lbl">Top find</span>
              <span className="ledger-dots" />
              <span className="ledger-val">
                {records.biggestFind ? `${records.biggestFind.totalRarity || 0} pts` : '—'}
              </span>
              {records.biggestFind && (
                <span className="ledger-sub">
                  {records.biggestFind.make} {records.biggestFind.model}
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Hall of Fame ── */}
      <section className="col-sec">
        <div className="col-sec-head">
          <span className="col-sec-title">Hall of Fame<span className="jp">殿堂</span></span>
          <span className="col-sec-meta">
            {hofEntries.length > 0 ? `${hofEntries.length} enshrined` : ''}
          </span>
        </div>
        {hofEntries.length > 0 ? (
          <div className="hof-grid">
            {hofEntries.map(e => (
              <div key={e.id} className="hof-plate">
                <div className="hof-top">
                  <span className="hof-seal">殿堂</span>
                  <span className="hof-idx">{fmtIdx(e.id)}</span>
                </div>
                <div className="hof-name">{e.make} {e.model}</div>
                <div className="hof-variant">{e.variant}</div>
                <div className="hof-meta">
                  <span>{[e.year, e.color].filter(Boolean).join(' · ') || '—'}</span>
                  <span className="hof-pts">{e.totalRarity || 0} pts</span>
                </div>
                {e.url && (
                  <a className="hof-link" href={e.url} target="_blank" rel="noopener noreferrer">
                    Street View ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-note">No cars in the Hall of Fame yet — the first one earns its plate.</div>
        )}
      </section>

      {/* ── Field activity ── */}
      <section className="col-sec">
        <div className="col-sec-head">
          <span className="col-sec-title">Field Activity<span className="jp">活動</span></span>
          <span className="col-sec-meta">last 12 months</span>
        </div>
        <div className="heat-wrap">
          <div className="heat-months">
            {heatmap.monthLabels.map((m, i) => <span key={i}>{m}</span>)}
          </div>
          <div className="heat-grid">
            {heatmap.weeks.map((week, wi) => (
              <div key={wi} className="heat-col">
                {week.map(d => (
                  <div
                    key={d.key}
                    className={`heat-cell l${levelFor(d.count)}`}
                    title={`${d.count} ${d.count === 1 ? 'find' : 'finds'} — ${formatDayKey(d.key)}`}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="heat-legend">
            <span>less</span>
            <div className="heat-cell l0" />
            <div className="heat-cell l1" />
            <div className="heat-cell l2" />
            <div className="heat-cell l3" />
            <div className="heat-cell l4" />
            <span>more</span>
          </div>
        </div>
        {recentEntries.length > 0 && (
          <div className="heat-latest">
            <div className="micro heat-latest-lbl">Latest five</div>
            <div className="ledger">
              {recentEntries.map(e => (
                <div key={e.id} className="ledger-row">
                  <span className="ledger-lbl dark">{e.make} {e.model}</span>
                  <span className="ledger-dots" />
                  <span className="ledger-val">{e.totalRarity || 0} pts</span>
                  <span className="ledger-sub">{timeAgo(e.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Composition ── */}
      <div className="col-row col-row-3">
        <section className="col-sec">
          <div className="col-sec-head">
            <span className="col-sec-title">Composition<span className="jp">構成</span></span>
          </div>
          <div className="tier-bar">
            {rarityTiers.map(t => t.count > 0 && (
              <div key={t.label} className="tier-seg" style={{ flex: t.count, background: t.color }} />
            ))}
          </div>
          <div className="ledger">
            {rarityTiers.map(t => (
              <div key={t.label} className="ledger-row">
                <span className="tier-dot" style={{ background: t.color }} />
                <span className="ledger-lbl">{t.label}</span>
                <span className="ledger-dots" />
                <span className="ledger-val">{t.count}</span>
                <span className="ledger-sub">
                  {entries.length ? Math.round((t.count / entries.length) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="col-sec">
          <div className="col-sec-head">
            <span className="col-sec-title">Top Makes<span className="jp">メーカー</span></span>
          </div>
          <div className="ledger">
            {topMakes.length ? topMakes.map(([name, count], i) => (
              <div key={name} className="ledger-row">
                <span className="rank-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="ledger-lbl dark">{name}</span>
                <span className="ledger-dots" />
                <span className="ledger-val">{count}</span>
              </div>
            )) : <div className="empty-note">Nothing logged yet.</div>}
          </div>
        </section>

        <section className="col-sec">
          <div className="col-sec-head">
            <span className="col-sec-title">Top Models<span className="jp">車種</span></span>
          </div>
          <div className="ledger">
            {topModels.length ? topModels.map(([name, count], i) => (
              <div key={name} className="ledger-row">
                <span className="rank-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="ledger-lbl dark">{name}</span>
                <span className="ledger-dots" />
                <span className="ledger-val">{count}</span>
              </div>
            )) : <div className="empty-note">Nothing logged yet.</div>}
          </div>
        </section>
      </div>

      {/* ── Milestones ── */}
      <section className="col-sec">
        <div className="col-sec-head">
          <span className="col-sec-title">Milestones<span className="jp">里程標</span></span>
          <span className="col-sec-meta">{unlockedCount} of {milestones.length} reached</span>
        </div>
        <div className="mile-grid">
          {milestones.map(m => (
            <div key={m.id} className={`mile-row ${m.unlocked ? 'unlocked' : ''}`}>
              <span className="mile-mark" />
              <div className="mile-info">
                <div className="mile-head">
                  <span className="mile-name">{m.label}</span>
                  <span className="mile-ct">{Math.min(m.value, m.goal)}/{m.goal}</span>
                </div>
                <div className="mile-bar">
                  <div className="mile-fill" style={{ width: `${m.pct}%` }} />
                </div>
                <div className="mile-desc">{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
