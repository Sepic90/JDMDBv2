import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, TrendingUp, Car, Star, BarChart3, Award,
  Calendar, ExternalLink, Zap,
  Flame, Target, Activity,
  Lock, CheckCircle2, ArrowUp, ArrowDown, Minus, Layers
} from 'lucide-react';

// ── Date helpers ──────────────────────────────────────────────────────
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfWeek = (d) => {
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
  if (r >= 15) return { label: 'Legendary', cls: 'tier-pill-legendary' };
  if (r >= 10) return { label: 'Wild',      cls: 'tier-pill-wild' };
  if (r >= 5)  return { label: 'Modified',  cls: 'tier-pill-modified' };
  return         { label: 'Stock',     cls: 'tier-pill-stock' };
};

export default function Showroom({ entries }) {
  const [periodTab, setPeriodTab] = useState('week');

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

  // ── Period stats ──────────────────────────────────────────────────────
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

  // ── Recent activity feed ─────────────────────────────────────────────
  const recentEntries = useMemo(() => {
    return [...entries]
      .filter(e => e.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
  }, [entries]);

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

  // ── Achievements ─────────────────────────────────────────────────────
  const achievements = useMemo(() => {
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

    const make = (id, label, desc, value, goal, icon) => ({
      id, label, desc, value, goal, icon,
      unlocked: value >= goal,
      pct: Math.min(100, Math.round((value / goal) * 100)),
    });

    return [
      make('spot10',    '10 Spotted',     'Log 10 entries',              total, 10,   Car),
      make('spot50',    '50 Spotted',     'Log 50 entries',              total, 50,   Car),
      make('spot100',   'Century',        'Log 100 entries',             total, 100,  Star),
      make('spot500',   'Spotter Elite',  'Log 500 entries',             total, 500,  Award),
      make('hof1',      'First HOF',      'First Hall of Fame car',      hofCount, 1, Trophy),
      make('hof5',      'HOF x5',         '5 Hall of Fame entries',      hofCount, 5, Trophy),
      make('hof10',     'HOF Hunter',     '10 Hall of Fame entries',     hofCount, 10, Trophy),
      make('pwr1k',     '1K Power',       'Reach 1,000 Power',           power, 1000, Zap),
      make('pwr5k',     '5K Power',       'Reach 5,000 Power',           power, 5000, Zap),
      make('streak7',   'Week Streak',    '7 days in a row',             longestStreak, 7, Flame),
      make('variety',   'Variety Hunter', '5 makes in one week',         maxMakesInWeek, 5, Layers),
    ];
  }, [entries, collectionPower, hofEntries, streaks]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="sr">

      {/* ── Stats Strip ── */}
      <div className="sr-strip">
        <div className="sr-stat">
          <Car size={14} />
          <span className="sr-stat-val">{entries.length}</span>
          <span className="sr-stat-lbl">spotted</span>
        </div>
        <div className="sr-stat">
          <Zap size={14} />
          <span className="sr-stat-val sr-purple">{collectionPower}</span>
          <span className="sr-stat-lbl">power</span>
        </div>
        <div className="sr-stat">
          <Trophy size={14} />
          <span className="sr-stat-val sr-gold">{hofEntries.length}</span>
          <span className="sr-stat-lbl">HOF</span>
        </div>
        <div className="sr-stat">
          <Flame size={14} />
          <span className="sr-stat-val sr-teal">{streaks.current}</span>
          <span className="sr-stat-lbl">streak</span>
          <span className="sr-stat-sub">best {streaks.longest}</span>
        </div>
        <div className="sr-stat">
          <TrendingUp size={14} />
          <span className="sr-stat-val">{avgRarity}</span>
          <span className="sr-stat-lbl">avg</span>
        </div>
      </div>

      {/* ── Period + Records row ── */}
      <div className="sr-row">
        {/* Period card */}
        <div className="sr-card sr-period">
          <div className="sr-card-head">
            <span className="sr-card-title"><Activity size={12} /> This Period</span>
            <div className="sr-period-tabs">
              <button
                className={`sr-ptab ${periodTab === 'week' ? 'active' : ''}`}
                onClick={() => setPeriodTab('week')}
              >Week</button>
              <button
                className={`sr-ptab ${periodTab === 'month' ? 'active' : ''}`}
                onClick={() => setPeriodTab('month')}
              >Month</button>
            </div>
          </div>
          <div className="sr-period-body">
            <div className="sr-period-col">
              <div className="sr-period-num sr-purple">{activePeriod.current.points}</div>
              <div className="sr-period-lbl">points</div>
              <div className={`sr-delta ${
                periodDelta > 0 ? 'up' : periodDelta < 0 ? 'down' : 'flat'
              }`}>
                {periodDelta > 0 ? <ArrowUp size={10} /> : periodDelta < 0 ? <ArrowDown size={10} /> : <Minus size={10} />}
                {periodDelta > 0 ? '+' : ''}{periodDelta}
              </div>
            </div>
            <div className="sr-period-col">
              <div className="sr-period-num sr-teal">{activePeriod.current.count}</div>
              <div className="sr-period-lbl">finds</div>
              <div className="sr-period-sub">{activePeriod.prev.count} prev</div>
            </div>
            <div className="sr-period-col sr-period-best">
              {activePeriod.current.best ? (
                <>
                  <div className="sr-period-best-car">
                    {activePeriod.current.best.make} {activePeriod.current.best.model}
                  </div>
                  <div className="sr-period-best-var">{activePeriod.current.best.variant}</div>
                  <span className={`tier-pill ${tierFor(activePeriod.current.best.totalRarity || 0).cls}`}>
                    {activePeriod.current.best.totalRarity || 0} pts
                  </span>
                </>
              ) : (
                <div className="sr-period-empty">No spots yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Records */}
        <div className="sr-card sr-records">
          <div className="sr-card-head">
            <span className="sr-card-title"><Award size={12} /> Records</span>
          </div>
          <div className="sr-records-body">
            <div className="sr-rec">
              <div className="sr-rec-lbl">Best week</div>
              <div className="sr-rec-val">{records.bestWeek ? `${records.bestWeek.value} pts` : '—'}</div>
              <div className="sr-rec-sub">{records.bestWeek ? formatWeekKey(records.bestWeek.key) : ''}</div>
            </div>
            <div className="sr-rec">
              <div className="sr-rec-lbl">Best month</div>
              <div className="sr-rec-val">{records.bestMonth ? `${records.bestMonth.value} pts` : '—'}</div>
              <div className="sr-rec-sub">{records.bestMonth ? formatMonthKey(records.bestMonth.key) : ''}</div>
            </div>
            <div className="sr-rec">
              <div className="sr-rec-lbl">Best day</div>
              <div className="sr-rec-val">{records.bestDay ? `${records.bestDay.value} pts` : '—'}</div>
              <div className="sr-rec-sub">{records.bestDay ? formatDayKey(records.bestDay.key) : ''}</div>
            </div>
            <div className="sr-rec sr-rec-hero">
              <div className="sr-rec-lbl">Top find</div>
              <div className="sr-rec-val">{records.biggestFind ? `${records.biggestFind.totalRarity || 0} pts` : '—'}</div>
              <div className="sr-rec-sub">
                {records.biggestFind ? `${records.biggestFind.make} ${records.biggestFind.model}` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity + Tiers row ── */}
      <div className="sr-row">
        {/* Recent Activity */}
        <div className="sr-card sr-activity">
          <div className="sr-card-head">
            <span className="sr-card-title"><Activity size={12} /> Recent</span>
          </div>
          <div className="sr-feed">
            {recentEntries.length > 0 ? recentEntries.map(entry => {
              const tier = tierFor(entry.totalRarity || 0);
              return (
                <div key={entry.id} className="sr-feed-row">
                  <span className="sr-feed-time">{timeAgo(entry.timestamp)}</span>
                  <span className="sr-feed-car">{entry.make} {entry.model}</span>
                  <span className={`tier-pill ${tier.cls}`}>{entry.totalRarity || 0}</span>
                </div>
              );
            }) : (
              <div className="sr-empty">No activity yet</div>
            )}
          </div>
        </div>

        {/* Rarity Tiers */}
        <div className="sr-card sr-tiers">
          <div className="sr-card-head">
            <span className="sr-card-title"><Target size={12} /> Tiers</span>
          </div>
          <div className="sr-tiers-body">
            {rarityTiers.map(tier => (
              <div key={tier.label} className="sr-tier">
                <span className="sr-tier-lbl" style={{ color: tier.color }}>{tier.label}</span>
                <div className="sr-tier-bar">
                  <div
                    className="sr-tier-fill"
                    style={{
                      width: `${entries.length ? (tier.count / entries.length) * 100 : 0}%`,
                      background: tier.color,
                    }}
                  />
                </div>
                <span className="sr-tier-ct">{tier.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Achievements ── */}
      <div className="sr-card sr-achievements">
        <div className="sr-card-head">
          <span className="sr-card-title"><Award size={12} /> Achievements</span>
          <span className="sr-card-meta">{unlockedCount}/{achievements.length}</span>
        </div>
        <div className="sr-ach-grid">
          {achievements.map(a => {
            const Icon = a.icon;
            return (
              <div key={a.id} className={`sr-ach ${a.unlocked ? 'unlocked' : 'locked'}`}>
                <div className="sr-ach-icon">
                  {a.unlocked ? <Icon size={13} /> : <Lock size={11} />}
                </div>
                <div className="sr-ach-info">
                  <div className="sr-ach-name">{a.label}</div>
                  <div className="sr-ach-bar">
                    <div className="sr-ach-fill" style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
