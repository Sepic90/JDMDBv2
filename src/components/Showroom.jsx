import { useState, useEffect, useMemo } from 'react';
import {
  Trophy, TrendingUp, Car, Star, BarChart3, Award,
  MapPin, Calendar, RefreshCw, ExternalLink, Zap,
  Flame, Clock, Target, Palette, Users, Layers
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

export default function Showroom({ entries }) {
  const [hofEntry, setHofEntry] = useState(null);

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

  // ── Latest entry ──────────────────────────────────────────────────────
  const latestEntry = useMemo(() => {
    if (!entries.length) return null;
    return [...entries].sort((a, b) => {
      const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bt - at;
    })[0];
  }, [entries]);

  // ── Top 10 by rarity ──────────────────────────────────────────────────
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

  // ── Most decorated (most attribute flags) ─────────────────────────────
  const countFlags = (e) => Object.keys(ATTR_LABELS).filter(k => e.specs?.[k]).length;

  const mostDecorated = useMemo(() => {
    if (!entries.length) return null;
    return [...entries].sort((a, b) => countFlags(b) - countFlags(a))[0];
  }, [entries]);

  const mostDecoratedCount = useMemo(() =>
    mostDecorated ? countFlags(mostDecorated) : 0,
    [mostDecorated]
  );

  // ── Attribute hotlist ─────────────────────────────────────────────────
  const attributeHotlist = useMemo(() => {
    const counts = {};
    Object.keys(ATTR_LABELS).forEach(k => {
      counts[k] = entries.filter(e => e.specs?.[k]).length;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .filter(([, v]) => v > 0)
      .slice(0, 7);
  }, [entries]);

  const maxAttrCount = attributeHotlist[0]?.[1] || 1;

  // ── Rarity tiers ──────────────────────────────────────────────────────
  const rarityTiers = useMemo(() => {
    const tiers = [
      { label: 'Stock',      range: [0, 4],        color: 'var(--text-tertiary)', count: 0 },
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

  // ── Top makes (count + avg rarity) ───────────────────────────────────
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
      .slice(0, 6);
  }, [entries]);

  const maxMakeCount = topMakes[0]?.count || 1;

  // ── Rarest make (min 2 entries, highest avg rarity) ──────────────────
  const rariestMake = useMemo(() => {
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

  // ── Top models ────────────────────────────────────────────────────────
  const topModels = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      const key = `${e.make} ${e.model}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [entries]);

  // ── Top variants ──────────────────────────────────────────────────────
  const topVariants = useMemo(() => {
    const counts = {};
    entries.forEach(e => {
      const key = `${e.make} ${e.model} ${e.variant}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  // ── Color distribution ────────────────────────────────────────────────
  const colorStats = useMemo(() => {
    const counts = {};
    entries.forEach(e => { if (e.color) counts[e.color] = (counts[e.color] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [entries]);

  // ── Year distribution ─────────────────────────────────────────────────
  const yearStats = useMemo(() => {
    const counts = {};
    entries.forEach(e => { if (e.year) counts[e.year] = (counts[e.year] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [entries]);

  // ── Status breakdown ──────────────────────────────────────────────────
  const statusStats = useMemo(() => {
    const parked  = entries.filter(e => e.status === 'parked').length;
    const driving = entries.filter(e => e.status === 'driving').length;
    const total   = parked + driving;
    return {
      parked,
      driving,
      total,
      drivingPct: total ? Math.round((driving / total) * 100) : 0,
    };
  }, [entries]);

  const formatDate = (str) => {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div className="showroom-grid">

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

      {/* ── Latest Find ── */}
      <div className="showroom-card accent-teal">
        <div className="card-header">
          <span className="card-title"><Clock /> Latest Find</span>
        </div>
        <div className="card-body">
          {latestEntry ? (
            <div className="latest-entry">
              <div className="latest-car">{latestEntry.make} {latestEntry.model}</div>
              <div className="latest-variant">{latestEntry.variant}</div>
              <div className="latest-meta">
                {latestEntry.color && <span>{latestEntry.color}</span>}
                {latestEntry.year  && <span> · {latestEntry.year}</span>}
              </div>
              <div className="latest-date">{formatDate(latestEntry.timestamp)}</div>
              {latestEntry.url && (
                <a
                  href={latestEntry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '10px' }}
                >
                  <ExternalLink /> View
                </a>
              )}
            </div>
          ) : (
            <div className="empty-state"><Clock /><p>No entries yet</p></div>
          )}
        </div>
      </div>

      {/* ── Top 10 Rarity (tall) ── */}
      <div className="showroom-card tall">
        <div className="card-header">
          <span className="card-title"><BarChart3 /> Rarity Top 10</span>
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

      {/* ── Attribute Hotlist ── */}
      <div className="showroom-card">
        <div className="card-header">
          <span className="card-title"><Flame /> Attribute Hotlist</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="top-list">
            {attributeHotlist.length > 0 ? attributeHotlist.map(([key, count]) => (
              <div key={key} className="top-item">
                <div className="top-content">
                  <div className="top-title">{ATTR_LABELS[key]}</div>
                  <div className="bar-track bar-track-sm">
                    <div
                      className="bar-fill bar-fill-accent"
                      style={{ width: `${(count / maxAttrCount) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="top-value">{count}</span>
              </div>
            )) : (
              <div className="top-item">
                <div className="top-content">
                  <div className="top-title" style={{ color: 'var(--text-tertiary)' }}>No attributes logged yet</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Makes with mini bars ── */}
      <div className="showroom-card">
        <div className="card-header">
          <span className="card-title"><Users /> Top Makes</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="top-list">
            {topMakes.map(({ make, count, avg }, i) => (
              <div key={make} className="top-item">
                <span className="top-rank">{i + 1}</span>
                <div className="top-content">
                  <div className="top-title">{make}</div>
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
        </div>
      </div>

      {/* ── Status Split ── */}
      <div className="showroom-card accent-green">
        <div className="card-header">
          <span className="card-title"><TrendingUp /> Status Split</span>
        </div>
        <div className="card-body">
          <div className="status-split">
            <div className="status-hero">
              <div className="status-pct">{statusStats.drivingPct}%</div>
              <div className="status-lbl">caught driving</div>
            </div>
            <div className="status-track-wrap">
              <div className="status-track">
                <div
                  className="status-fill"
                  style={{ width: `${statusStats.drivingPct}%` }}
                />
              </div>
              <div className="status-counts">
                <span><i className="status-dot status-dot-blue" /> Parked {statusStats.parked}</span>
                <span><i className="status-dot status-dot-amber" /> Driving {statusStats.driving}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Most Spotted Variants (wide) ── */}
      <div className="showroom-card wide">
        <div className="card-header">
          <span className="card-title"><Star /> Most Spotted Variants</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="top-list top-list-row">
            {topVariants.map(([variant, count], i) => (
              <div key={variant} className="top-item">
                <span className="top-rank">{i + 1}</span>
                <div className="top-content">
                  <div className="top-title">{variant}</div>
                </div>
                <span className="top-value">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Most Decorated Entry ── */}
      <div className="showroom-card accent-pink">
        <div className="card-header">
          <span className="card-title"><Award /> Most Decorated</span>
        </div>
        <div className="card-body">
          {mostDecorated ? (
            <div className="decorated-entry">
              <div className="decorated-car">{mostDecorated.make} {mostDecorated.model}</div>
              <div className="decorated-variant">{mostDecorated.variant}</div>
              <div className="decorated-score">
                <span className="decorated-num">{mostDecoratedCount}</span>
                <span className="decorated-unit">attributes</span>
              </div>
              {mostDecorated.url && (
                <a
                  href={mostDecorated.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: '10px' }}
                >
                  <ExternalLink /> View
                </a>
              )}
            </div>
          ) : (
            <div className="empty-state"><Award /><p>No entries yet</p></div>
          )}
        </div>
      </div>

      {/* ── Top Models ── */}
      <div className="showroom-card">
        <div className="card-header">
          <span className="card-title"><Car /> Top Models</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="top-list">
            {topModels.map(([model, count], i) => (
              <div key={model} className="top-item">
                <span className="top-rank">{i + 1}</span>
                <div className="top-content">
                  <div className="top-title">{model}</div>
                </div>
                <span className="top-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Color Distribution ── */}
      <div className="showroom-card">
        <div className="card-header">
          <span className="card-title"><Palette /> Color Split</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="top-list">
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
        </div>
      </div>

      {/* ── Year Distribution ── */}
      <div className="showroom-card">
        <div className="card-header">
          <span className="card-title"><Calendar /> By Spot Year</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="top-list">
            {yearStats.map(([year, count], i) => (
              <div key={year} className="top-item">
                <span className="top-rank">{i + 1}</span>
                <div className="top-content">
                  <div className="top-title">{year}</div>
                </div>
                <span className="top-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Rarest Make (by avg rarity) ── */}
      <div className="showroom-card accent-purple">
        <div className="card-header">
          <span className="card-title"><Layers /> Rarest Make</span>
        </div>
        <div className="card-body">
          {rariestMake ? (
            <div className="rarest-make">
              <div className="rarest-name">{rariestMake.make}</div>
              <div className="rarest-score">
                <span className="rarest-num stat-purple">{rariestMake.avg}</span>
                <span className="rarest-unit">avg pts</span>
              </div>
              <div className="rarest-sub">across {rariestMake.count} entries</div>
            </div>
          ) : (
            <div className="empty-state"><Layers /><p>Need 2+ entries per make</p></div>
          )}
        </div>
      </div>

    </div>
  );
}
