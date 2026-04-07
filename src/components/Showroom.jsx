import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, TrendingUp, Car, Star, BarChart3, Award,
  Calendar, RefreshCw, ExternalLink, Zap,
  Flame, Target, Palette, Users, Layers, Activity,
  Lock, CheckCircle2, ArrowUp, ArrowDown, Minus
} from 'lucide-react';

const ATTR_LABELS = {
  bodykit:      'Body Kit',
  aeromods:     'Aero Mods',
  disrespected: 'Disrespected',
  rareoem:      'Rare OEM',
  rareafter:    'Rare Aftermarket',
  frontswap:    'Front Swap',
  trackday:     'Track Day',
  drift:        'Drift Build',
  livery:       'Livery',
  rims:         'Custom Rims',
  vip:          'VIP Style',
  stance:       'Stance',
  twotone:      'Two-Tone',
  showcar:      'Show Car',
};

const COLOR_HEX = {
  Black: '#18181b', White: '#e4e4e7', Silver: '#a1a1aa', Grey: '#71717a',
  Gray: '#71717a', Red: '#dc2626', Blue: '#2563eb', Navy: '#1e3a5f',
  Green: '#16a34a', Yellow: '#ca8a04', Orange: '#ea580c', Purple: '#7c3aed',
  Brown: '#78350f', Beige: '#c4a882', Champagne: '#c8a96e', Gold: '#b7882c',
  Bronze: '#92400e', Pearl: '#ddddd5', Maroon: '#7f1d1d', Burgundy: '#881337',
  Teal: '#0f766e', Cyan: '#0891b2', Pink: '#db2777', Lime: '#65a30d',
};

function getColorHex(name) {
  return COLOR_HEX[name] || '#52525b';
}

// ── Date helpers ──────────────────────────────────────────────────────
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfWeek = (d) => { // Monday-based
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
};

const startOfMonth = (d) => {
  const x = startOfDay(d);
  x.setDate(1);
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
  return `Week ${w} · ${y}`;
};

const formatMonthKey = (key) => {
  if (!key) return '—';
  const [y, m] = key.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
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
  if (r >= 15) return { label: 'Legendary', cls: 'tier-pill-legendary' };
  if (r >= 10) return { label: 'Wild',      cls: 'tier-pill-wild' };
  if (r >= 5)  return { label: 'Modified',  cls: 'tier-pill-modified' };
  return         { label: 'Stock',     cls: 'tier-pill-stock' };
};

export default function Showroom({ entries }) {
  const [hofEntry, setHofEntry] = useState(null);
  const [periodTab, setPeriodTab] = useState('week'); // 'week' | 'month'
  const [breakdownTab, setBreakdownTab] = useState('makes');

  const hofEntries = useMemo(() => entries.filter(e => e.specs?.hof), [entries]);

  const rotateHof = () => {
    if (!hofEntries.length) return;
    setHofEntry(hofEntries[Math.floor(Math.random() * hofEntries.length)]);
  };

  useEffect(() => { rotateHof(); }, [hofEntries]);

  // ── Core aggregates ───────────────────────────────────────────────────
  const collectionPower = useMemo(() =>
    entries.reduce((s, e) => s + (e.totalRarity || 0), 0),
    [entries]
  );

  const avgRarity = useMemo(() =>
    entries.length ? (collectionPower / entries.length).toFixed(1) : '0.0',
    [entries, collectionPower]
  );

  const maxRarity = useMemo(() =>
    Math.max(...entries.map(e => e.totalRarity || 0), 0),
    [entries]
  );

  const hofRate = useMemo(() =>
    entries.length ? Math.round((hofEntries.length / entries.length) * 100) : 0,
    [hofEntries, entries]
  );

  const uniqueMakes  = useMemo(() => new Set(entries.map(e => e.make)).size, [entries]);
  const uniqueModels = useMemo(() =>
    new Set(entries.map(e => `${e.make} ${e.model}`)).size,
    [entries]
  );

  // ── Period stats (this/last week + this/last month) ──────────────────
  const periodStats = useMemo(() => {
    const now = new Date();
    const thisWeekStart  = startOfWeek(now);
    const lastWeekStart  = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = new Date(thisMonthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

    const inRange = (e, start, end) => {
      if (!e.timestamp) return false;
      const t = new Date(e.timestamp).getTime();
      return t >= start.getTime() && t < end.getTime();
    };

    const compute = (start, end) => {
      const items = entries.filter(e => inRange(e, start, end));
      const points = items.reduce((s, e) => s + (e.totalRarity || 0), 0);
      const best = items.reduce(
        (b, e) => (!b || (e.totalRarity || 0) > (b.totalRarity || 0)) ? e : b,
        null
      );
      return { count: items.length, points, best };
    };

    return {
      week: {
        current: compute(thisWeekStart, new Date(now.getTime() + 1)),
        prev:    compute(lastWeekStart, thisWeekStart),
      },
      month: {
        current: compute(thisMonthStart, new Date(now.getTime() + 1)),
        prev:    compute(lastMonthStart, thisMonthStart),
      },
    };
  }, [entries]);

  const activePeriod = periodStats[periodTab];
  const periodDelta  = activePeriod.current.points - activePeriod.prev.points;

  // ── Records board ────────────────────────────────────────────────────
  const records = useMemo(() => {
    const byWeek  = {};
    const byMonth = {};
    const byDay   = {};

    entries.forEach(e => {
      if (!e.timestamp) return;
      const d = new Date(e.timestamp);
      const r = e.totalRarity || 0;
      const wk = isoWeekKey(d);
      const mo = monthKey(d);
      const dy = dayKey(d);
      byWeek[wk]  = (byWeek[wk]  || 0) + r;
      byMonth[mo] = (byMonth[mo] || 0) + r;
      byDay[dy]   = (byDay[dy]   || 0) + r;
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

    // Longest run of consecutive calendar days
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

    // Current streak — count back from today
    let current = 0;
    const cursor = startOfDay(new Date());
    while (dayKeys.has(dayKey(cursor))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { current, longest };
  }, [entries]);

  // ── Recent activity feed ─────────────────────────────────────────────
  const recentEntries = useMemo(() => {
    return [...entries]
      .filter(e => e.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [entries]);

  // ── Hall of Records (Top 10) ─────────────────────────────────────────
  const top10 = useMemo(() =>
    [...entries]
      .sort((a, b) => {
        const d = (b.totalRarity || 0) - (a.totalRarity || 0);
        if (d !== 0) return d;
        return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
      })
      .slice(0, 10),
    [entries]
  );

  // ── Rarity tiers ─────────────────────────────────────────────────────
  const rarityTiers = useMemo(() => {
    const tiers = [
      { label: 'Stock',      range: [0, 4],         color: 'var(--text-tertiary)', count: 0 },
      { label: 'Modified',   range: [5, 9],         color: 'var(--info)',          count: 0 },
      { label: 'Wild Build', range: [10, 14],       color: 'var(--accent)',        count: 0 },
      { label: 'Legendary',  range: [15, Infinity], color: 'var(--warning)',       count: 0 },
    ];
    entries.forEach(e => {
      const r = e.totalRarity || 0;
      const tier = tiers.find(t => r >= t.range[0] && r <= t.range[1]);
      if (tier) tier.count++;
    });
    return tiers;
  }, [entries]);

  const maxTierCount = Math.max(...rarityTiers.map(t => t.count), 1);

  // ── Achievements ─────────────────────────────────────────────────────
  const achievements = useMemo(() => {
    const total = entries.length;
    const power = collectionPower;
    const hofCount = hofEntries.length;
    const longestStreak = streaks.longest;

    // Max distinct makes within any single ISO week
    const weeklyMakes = {};
    entries.forEach(e => {
      if (!e.timestamp || !e.make) return;
      const wk = isoWeekKey(new Date(e.timestamp));
      if (!weeklyMakes[wk]) weeklyMakes[wk] = new Set();
      weeklyMakes[wk].add(e.make);
    });
    const maxMakesInWeek = Math.max(0, ...Object.values(weeklyMakes).map(s => s.size));

    const make = (id, label, desc, value, goal, icon) => ({
      id, label, desc, value, goal, icon,
      unlocked: value >= goal,
      pct: Math.min(100, Math.round((value / goal) * 100)),
    });

    return [
      make('spot10',    '10 Spotted',     'Log 10 entries',                        total, 10,   Car),
      make('spot50',    '50 Spotted',     'Log 50 entries',                        total, 50,   Car),
      make('spot100',   'Century',        'Log 100 entries',                       total, 100,  Star),
      make('spot500',   'Spotter Elite',  'Log 500 entries',                       total, 500,  Award),
      make('hof1',      'First HOF',      'Find your first Hall of Fame car',      hofCount, 1, Trophy),
      make('hof5',      'HOF x5',         '5 Hall of Fame entries',                hofCount, 5, Trophy),
      make('hof10',     'HOF Hunter',     '10 Hall of Fame entries',               hofCount, 10, Trophy),
      make('pwr1k',     '1K Power',       'Reach 1,000 Collection Power',          power, 1000, Zap),
      make('pwr5k',     '5K Power',       'Reach 5,000 Collection Power',          power, 5000, Zap),
      make('streak7',   'Week Streak',    'Log entries 7 days in a row',           longestStreak, 7, Flame),
      make('variety',   'Variety Hunter', '5 different makes in one week',         maxMakesInWeek, 5, Layers),
    ];
  }, [entries, collectionPower, hofEntries, streaks]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // ── Collection breakdown aggregates ──────────────────────────────────
  const topMakes = useMemo(() => {
    const data = {};
    entries.forEach(e => {
      if (!data[e.make]) data[e.make] = { count: 0, total: 0 };
      data[e.make].count++;
      data[e.make].total += e.totalRarity || 0;
    });
    return Object.entries(data)
      .map(([make, d]) => ({
        make,
        count: d.count,
        avg: (d.total / d.count).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [entries]);

  const maxMakeCount = topMakes[0]?.count || 1;

  const topModels = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      const key = `${e.make} ${e.model}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  const topVariants = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      const key = `${e.make} ${e.model} ${e.variant}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  const colorStats = useMemo(() => {
    const counts = {};
    entries.forEach(e => { if (e.color) counts[e.color] = (counts[e.color] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  const yearStats = useMemo(() => {
    const counts = {};
    entries.forEach(e => { if (e.year) counts[e.year] = (counts[e.year] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [entries]);

  const rarestMake = useMemo(() => {
    const data = {};
    entries.forEach(e => {
      if (!data[e.make]) data[e.make] = { count: 0, total: 0 };
      data[e.make].count++;
      data[e.make].total += e.totalRarity || 0;
    });
    return Object.entries(data)
      .filter(([, d]) => d.count >= 2)
      .map(([make, d]) => ({ make, avg: (d.total / d.count).toFixed(1), count: d.count }))
      .sort((a, b) => b.avg - a.avg)[0] || null;
  }, [entries]);

  const breakdownTabs = [
    { id: 'makes',    label: 'Makes' },
    { id: 'models',   label: 'Models' },
    { id: 'variants', label: 'Variants' },
    { id: 'colors',   label: 'Colors' },
    { id: 'years',    label: 'Years' },
  ];

  return (
    <div className="showroom-grid">

      {/* ── Period Hero ── */}
      <div className="showroom-card full period-card">
        <div className="card-header">
          <span className="card-title"><Activity /> This Period</span>
          <div className="period-tabs">
            <button
              className={`period-tab ${periodTab === 'week' ? 'active' : ''}`}
              onClick={() => setPeriodTab('week')}
            >This Week</button>
            <button
              className={`period-tab ${periodTab === 'month' ? 'active' : ''}`}
              onClick={() => setPeriodTab('month')}
            >This Month</button>
          </div>
        </div>
        <div className="card-body">
          <div className="period-grid">
            <div className="period-stat">
              <div className="period-num stat-purple">{activePeriod.current.points}</div>
              <div className="period-lbl">Points scored</div>
              <div className={`period-delta ${
                periodDelta > 0 ? 'delta-up' : periodDelta < 0 ? 'delta-down' : 'delta-flat'
              }`}>
                {periodDelta > 0 ? <ArrowUp /> : periodDelta < 0 ? <ArrowDown /> : <Minus />}
                {periodDelta > 0 ? '+' : ''}{periodDelta} vs last {periodTab}
              </div>
            </div>

            <div className="period-stat">
              <div className="period-num stat-teal">{activePeriod.current.count}</div>
              <div className="period-lbl">Cars spotted</div>
              <div className="period-sub">
                {activePeriod.prev.count} last {periodTab}
              </div>
            </div>

            <div className="period-stat period-best">
              <div className="period-best-label">Best find</div>
              {activePeriod.current.best ? (
                <>
                  <div className="period-best-car">
                    {activePeriod.current.best.make} {activePeriod.current.best.model}
                  </div>
                  <div className="period-best-variant">
                    {activePeriod.current.best.variant}
                  </div>
                  <div className="period-best-meta">
                    <span className={`tier-pill ${tierFor(activePeriod.current.best.totalRarity || 0).cls}`}>
                      {activePeriod.current.best.totalRarity || 0} pts
                    </span>
                    {activePeriod.current.best.url && (
                      <a
                        href={activePeriod.current.best.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="period-best-link"
                      >
                        <ExternalLink />
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="period-best-empty">No spots yet this {periodTab}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Hero: Total Spotted ── */}
      <div className="showroom-card accent-blue">
        <div className="card-header">
          <span className="card-title"><Car /> Total Spotted</span>
        </div>
        <div className="card-body stat-big">
          <div className="stat-number">{entries.length}</div>
          <div className="stat-label">{uniqueMakes} makes · {uniqueModels} models</div>
        </div>
      </div>

      {/* ── Hero: Collection Power ── */}
      <div className="showroom-card accent-purple">
        <div className="card-header">
          <span className="card-title"><Zap /> Collection Power</span>
        </div>
        <div className="card-body stat-big">
          <div className="stat-number stat-purple">{collectionPower}</div>
          <div className="stat-label">Avg {avgRarity} pts · Peak {maxRarity}</div>
        </div>
      </div>

      {/* ── Hero: Hall of Fame ── */}
      <div className="showroom-card accent-gold">
        <div className="card-header">
          <span className="card-title"><Trophy /> Hall of Fame</span>
        </div>
        <div className="card-body stat-big">
          <div className="stat-number stat-gold">{hofEntries.length}</div>
          <div className="stat-label">{hofRate}% of collection is legendary</div>
        </div>
      </div>

      {/* ── Streak Counter ── */}
      <div className="showroom-card accent-teal">
        <div className="card-header">
          <span className="card-title"><Flame /> Streak</span>
        </div>
        <div className="card-body">
          <div className="streak-wrap">
            <div className="streak-current">
              <div className="streak-num stat-teal">{streaks.current}</div>
              <div className="streak-lbl">day{streaks.current === 1 ? '' : 's'} active</div>
            </div>
            <div className="streak-divider" />
            <div className="streak-best">
              <div className="streak-best-num">{streaks.longest}</div>
              <div className="streak-best-lbl">longest ever</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Records Board ── */}
      <div className="showroom-card wide">
        <div className="card-header">
          <span className="card-title"><Award /> Records Board</span>
        </div>
        <div className="card-body">
          <div className="records-grid">
            <div className="record-item">
              <div className="record-icon"><Calendar /></div>
              <div className="record-content">
                <div className="record-label">Best week</div>
                <div className="record-value">
                  {records.bestWeek ? `${records.bestWeek.value} pts` : '—'}
                </div>
                <div className="record-sub">
                  {records.bestWeek ? formatWeekKey(records.bestWeek.key) : 'No data'}
                </div>
              </div>
            </div>

            <div className="record-item">
              <div className="record-icon"><Calendar /></div>
              <div className="record-content">
                <div className="record-label">Best month</div>
                <div className="record-value">
                  {records.bestMonth ? `${records.bestMonth.value} pts` : '—'}
                </div>
                <div className="record-sub">
                  {records.bestMonth ? formatMonthKey(records.bestMonth.key) : 'No data'}
                </div>
              </div>
            </div>

            <div className="record-item">
              <div className="record-icon"><Calendar /></div>
              <div className="record-content">
                <div className="record-label">Best day</div>
                <div className="record-value">
                  {records.bestDay ? `${records.bestDay.value} pts` : '—'}
                </div>
                <div className="record-sub">
                  {records.bestDay ? formatDayKey(records.bestDay.key) : 'No data'}
                </div>
              </div>
            </div>

            <div className="record-item record-item-hero">
              <div className="record-icon record-icon-gold"><Trophy /></div>
              <div className="record-content">
                <div className="record-label">Biggest find</div>
                <div className="record-value">
                  {records.biggestFind ? `${records.biggestFind.totalRarity || 0} pts` : '—'}
                </div>
                <div className="record-sub">
                  {records.biggestFind
                    ? `${records.biggestFind.make} ${records.biggestFind.model}`
                    : 'No data'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Activity Feed ── */}
      <div className="showroom-card">
        <div className="card-header">
          <span className="card-title"><Activity /> Recent Activity</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="activity-feed">
            {recentEntries.length > 0 ? recentEntries.map(entry => {
              const tier = tierFor(entry.totalRarity || 0);
              return (
                <div key={entry.id} className="activity-row">
                  <div className="activity-time">{timeAgo(entry.timestamp)}</div>
                  <div className="activity-info">
                    <div className="activity-car">{entry.make} {entry.model}</div>
                    <div className="activity-variant">{entry.variant}</div>
                  </div>
                  <span className={`tier-pill ${tier.cls}`}>
                    {entry.totalRarity || 0}
                  </span>
                </div>
              );
            }) : (
              <div className="empty-state"><Activity /><p>No activity yet</p></div>
            )}
          </div>
        </div>
      </div>

      {/* ── HOF Spotlight (wide) ── */}
      <div className="showroom-card wide hof-card">
        <div className="card-header">
          <span className="card-title"><Trophy /> Hall of Fame Spotlight</span>
          <button className="btn btn-ghost btn-sm" onClick={rotateHof}>
            <RefreshCw /> Shuffle
          </button>
        </div>
        <div className="card-body">
          {hofEntry ? (
            <div className="hof-feature">
              <div className="hof-main">
                <div className="hof-badge"><Trophy /></div>
                <div className="hof-info">
                  <div className="hof-car">{hofEntry.make} {hofEntry.model}</div>
                  <div className="hof-variant">{hofEntry.variant}</div>
                  <div className="hof-tags">
                    {hofEntry.color && <span className="hof-tag">{hofEntry.color}</span>}
                    {hofEntry.year  && <span className="hof-tag">{hofEntry.year}</span>}
                    {hofEntry.status && (
                      <span className={`hof-tag hof-tag-status hof-tag-${hofEntry.status}`}>
                        {hofEntry.status}
                      </span>
                    )}
                    <span className="hof-tag hof-tag-rarity">{hofEntry.totalRarity || 0} pts</span>
                  </div>
                </div>
              </div>
              {hofEntry.notes && (
                <div className="hof-notes">"{hofEntry.notes}"</div>
              )}
              {hofEntry.url && (
                <div className="hof-actions">
                  <a
                    href={hofEntry.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-hof btn-sm"
                  >
                    <ExternalLink /> View on Street View
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state"><Trophy /><p>No Hall of Fame entries yet</p></div>
          )}
        </div>
      </div>

      {/* ── Hall of Records (Top 10) ── */}
      <div className="showroom-card wide">
        <div className="card-header">
          <span className="card-title"><BarChart3 /> Hall of Records</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="top-list">
            {top10.map((entry, i) => (
              <div
                key={entry.id}
                className={`top-item${i === 0 ? ' top-gold' : i === 1 ? ' top-silver' : i === 2 ? ' top-bronze' : ''}`}
              >
                <span className={`top-rank${i < 3 ? ' top-rank-medal' : ''}`}>{i + 1}</span>
                <div className="top-content">
                  <div className="top-title">{entry.make} {entry.model}</div>
                  <div className="top-subtitle">{entry.variant}</div>
                </div>
                <div className="top-score">
                  <span className="top-value">{entry.totalRarity || 0}</span>
                  <span className="top-unit">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rarity Tiers ── */}
      <div className="showroom-card">
        <div className="card-header">
          <span className="card-title"><Target /> Rarity Tiers</span>
        </div>
        <div className="card-body">
          <div className="tier-list">
            {rarityTiers.map(tier => (
              <div key={tier.label} className="tier-item">
                <div className="tier-row">
                  <span className="tier-label" style={{ color: tier.color }}>{tier.label}</span>
                  <span className="tier-count">{tier.count}</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(tier.count / maxTierCount) * 100}%`,
                      background: tier.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="tier-footnote">0–4 · 5–9 · 10–14 · 15+</div>
        </div>
      </div>

      {/* ── Achievements ── */}
      <div className="showroom-card full">
        <div className="card-header">
          <span className="card-title"><Award /> Achievements</span>
          <span className="card-meta">{unlockedCount} / {achievements.length} unlocked</span>
        </div>
        <div className="card-body">
          <div className="achievement-grid">
            {achievements.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.id} className={`achievement ${a.unlocked ? 'unlocked' : 'locked'}`}>
                  <div className="achievement-icon">
                    {a.unlocked ? <Icon /> : <Lock />}
                  </div>
                  <div className="achievement-info">
                    <div className="achievement-label">
                      {a.label}
                      {a.unlocked && <CheckCircle2 className="achievement-check" />}
                    </div>
                    <div className="achievement-desc">{a.desc}</div>
                    <div className="achievement-bar">
                      <div
                        className="achievement-fill"
                        style={{ width: `${a.pct}%` }}
                      />
                    </div>
                    <div className="achievement-progress">
                      {Math.min(a.value, a.goal).toLocaleString()} / {a.goal.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Collection Breakdown (tabbed) ── */}
      <div className="showroom-card full">
        <div className="card-header">
          <span className="card-title"><Layers /> Collection Breakdown</span>
          <div className="breakdown-tabs">
            {breakdownTabs.map(t => (
              <button
                key={t.id}
                className={`breakdown-tab ${breakdownTab === t.id ? 'active' : ''}`}
                onClick={() => setBreakdownTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          <div className="breakdown-content">
            {breakdownTab === 'makes' && (
              <div className="breakdown-split">
                <div className="breakdown-list">
                  {topMakes.map(({ make, count, avg }, i) => (
                    <div key={make} className="top-item">
                      <span className="top-rank">{i + 1}</span>
                      <div className="top-content">
                        <div className="top-title"><Users size={11} /> {make}</div>
                        <div className="bar-track bar-track-sm">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(count / maxMakeCount) * 100}%`,
                              background: 'var(--accent)',
                            }}
                          />
                        </div>
                      </div>
                      <div className="top-score">
                        <span className="top-value">{count}</span>
                        <span className="top-unit top-avg">~{avg}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {rarestMake && (
                  <div className="breakdown-aside">
                    <div className="breakdown-aside-label">Rarest make (avg)</div>
                    <div className="breakdown-aside-name">{rarestMake.make}</div>
                    <div className="breakdown-aside-num stat-purple">{rarestMake.avg}</div>
                    <div className="breakdown-aside-sub">across {rarestMake.count} entries</div>
                  </div>
                )}
              </div>
            )}

            {breakdownTab === 'models' && (
              <div className="breakdown-list">
                {topModels.map(([model, count], i) => (
                  <div key={model} className="top-item">
                    <span className="top-rank">{i + 1}</span>
                    <div className="top-content">
                      <div className="top-title"><Car size={11} /> {model}</div>
                    </div>
                    <span className="top-value">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {breakdownTab === 'variants' && (
              <div className="breakdown-list">
                {topVariants.map(([variant, count], i) => (
                  <div key={variant} className="top-item">
                    <span className="top-rank">{i + 1}</span>
                    <div className="top-content">
                      <div className="top-title"><Star size={11} /> {variant}</div>
                    </div>
                    <span className="top-value">{count}×</span>
                  </div>
                ))}
              </div>
            )}

            {breakdownTab === 'colors' && (
              <div className="breakdown-list">
                {colorStats.map(([color, count]) => (
                  <div key={color} className="top-item">
                    <span
                      className="color-swatch"
                      style={{
                        background: getColorHex(color),
                        border: color === 'White' || color === 'Pearl' ? '1px solid #444' : 'none',
                      }}
                    />
                    <div className="top-content">
                      <div className="top-title">{color}</div>
                    </div>
                    <span className="top-value">{count}</span>
                  </div>
                ))}
              </div>
            )}

            {breakdownTab === 'years' && (
              <div className="breakdown-list">
                {yearStats.map(([year, count], i) => (
                  <div key={year} className="top-item">
                    <span className="top-rank">{i + 1}</span>
                    <div className="top-content">
                      <div className="top-title"><Calendar size={11} /> {year}</div>
                    </div>
                    <span className="top-value">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
