import { useState, useMemo } from 'react';
import { db } from '../firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ExternalLink, Pencil, Trash2, Download, X, ChevronUp, ChevronDown } from 'lucide-react';
import EditModal from './EditModal';

const ATTRIBUTES = [
  { key: 'hof',          label: 'Hall of Fame' },
  { key: 'bodykit',      label: 'Bodykit' },
  { key: 'aeromods',     label: 'Aero Mods' },
  { key: 'disrespected', label: 'Disrespected' },
  { key: 'rareoem',      label: 'Rare OEM' },
  { key: 'rareafter',    label: 'Rare Aftermarket' },
  { key: 'frontswap',    label: 'Front Swap' },
  { key: 'trackday',     label: 'Trackday' },
  { key: 'drift',        label: 'Drift' },
  { key: 'livery',       label: 'Livery' },
  { key: 'rims',         label: 'Rims' },
  { key: 'vip',          label: 'VIP' },
  { key: 'stance',       label: 'Stance' },
  { key: 'twotone',      label: 'Two-tone' },
  { key: 'showcar',      label: 'Showcar' },
];

export default function DatabaseView({ entries, masterData, onRefresh, showToast }) {
  const [filters, setFilters] = useState({ make: '', model: '', variant: '', color: '', status: '', year: '' });
  const [activeAttrs, setActiveAttrs] = useState(new Set());
  const [showOrphans, setShowOrphans] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('timestamp');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [editEntry, setEditEntry] = useState(null);
  const perPage = 25;

  // Chronological archive numbers: N° 0001 = oldest entry
  const chronoIndex = useMemo(() => {
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp || a.createdAt || 0) - new Date(b.timestamp || b.createdAt || 0)
    );
    const map = new Map();
    sorted.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  }, [entries]);

  const fmtIdx = (id) => `N° ${String(chronoIndex.get(id) || 0).padStart(4, '0')}`;

  const tierColor = (r) => {
    if (r >= 15) return 'var(--tier-leg)';
    if (r >= 10) return 'var(--tier-wild)';
    if (r >= 5)  return 'var(--tier-mod)';
    return 'var(--tier-stock)';
  };

  const makes = useMemo(() => [...new Set(entries.map(e => e.make))].sort(), [entries]);
  const models = useMemo(() => [...new Set(entries.filter(e => !filters.make || e.make === filters.make).map(e => e.model))].sort(), [entries, filters.make]);
  const variants = useMemo(() => [...new Set(entries.filter(e => (!filters.make || e.make === filters.make) && (!filters.model || e.model === filters.model)).map(e => e.variant))].sort(), [entries, filters.make, filters.model]);
  const colors = useMemo(() => [...new Set(entries.map(e => e.color).filter(Boolean))].sort(), [entries]);
  const years = useMemo(() => [...new Set(entries.map(e => e.year).filter(Boolean))].sort((a, b) => b - a), [entries]);

  const toggleAttr = (key) => {
    setActiveAttrs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setPage(1);
  };

  const filtered = useMemo(() => {
    let result = entries.filter(e => {
      if (filters.make && e.make !== filters.make) return false;
      if (filters.model && e.model !== filters.model) return false;
      if (filters.variant && e.variant !== filters.variant) return false;
      if (filters.color && e.color !== filters.color) return false;
      if (filters.status && e.status !== filters.status) return false;
      if (filters.year && e.year !== filters.year) return false;
      if (activeAttrs.size > 0) {
        for (const key of activeAttrs) {
          if (!e.specs?.[key]) return false;
        }
      }
      if (showOrphans) {
        const hasScore = (e.additionalRarity ?? 0) > 0;
        const hasFlags = ATTRIBUTES.some(a => e.specs?.[a.key]);
        if (!hasScore || hasFlags) return false;
      }
      if (search) {
        const term = search.toLowerCase();
        const searchable = `${e.make} ${e.model} ${e.variant} ${e.color} ${e.notes || ''}`.toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let aVal = a[sortKey] ?? '';
      let bVal = b[sortKey] ?? '';
      if (sortKey === 'totalRarity' || sortKey === 'year') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else if (sortKey === 'timestamp') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else {
        aVal = String(aVal);
        bVal = String(bVal);
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [entries, filters, activeAttrs, showOrphans, search, sortKey, sortDir]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'timestamp' ? 'desc' : 'asc');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const handleDelete = async (entry) => {
    if (!confirm(`Delete ${entry.make} ${entry.model} ${entry.variant}?`)) return;
    try {
      await deleteDoc(doc(db, 'entries', entry.id));
      showToast('Entry deleted');
      onRefresh();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const exportCSV = () => {
    const headers = ['Make', 'Model', 'Variant', 'Color', 'Year', 'Status', 'Base', 'Additional', 'Total', 'Notes', 'URL'];
    const rows = filtered.map(e => [
      e.make, e.model, e.variant, e.color || '', e.year || '', e.status || '',
      e.baseRarity || 0, e.additionalRarity || 0, e.totalRarity || 0,
      e.notes || '', e.url || ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jdmdb-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({ make: '', model: '', variant: '', color: '', status: '', year: '' });
    setActiveAttrs(new Set());
    setShowOrphans(false);
    setSearch('');
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(Boolean) || activeAttrs.size > 0 || showOrphans || search;

  const getAttrList = (specs) => {
    if (!specs) return [];
    const attrs = [];
    if (specs.hof) attrs.push({ key: 'hof', label: 'HOF' });
    if (specs.bodykit) attrs.push({ key: 'bodykit', label: 'Body' });
    if (specs.aeromods) attrs.push({ key: 'aero', label: 'Aero' });
    if (specs.drift) attrs.push({ key: 'drift', label: 'Drift' });
    if (specs.stance) attrs.push({ key: 'stance', label: 'Stance' });
    if (specs.rims) attrs.push({ key: 'rims', label: 'Rims' });
    if (specs.livery) attrs.push({ key: 'livery', label: 'Livery' });
    if (specs.vip) attrs.push({ key: 'vip', label: 'VIP' });
    if (specs.trackday) attrs.push({ key: 'track', label: 'Track' });
    if (specs.twotone) attrs.push({ key: 'twotone', label: '2-Tone' });
    if (specs.frontswap) attrs.push({ key: 'swap', label: 'Swap' });
    if (specs.disrespected) attrs.push({ key: 'dis', label: 'Dis' });
    if (specs.rareoem) attrs.push({ key: 'roem', label: 'rOEM' });
    if (specs.rareafter) attrs.push({ key: 'raft', label: 'rAft' });
    if (specs.showcar) attrs.push({ key: 'show', label: 'Show' });
    return attrs;
  };

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />;
  };

  return (
    <>
      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters">
            <select className="table-filter" value={filters.make} onChange={e => { setFilters(f => ({ ...f, make: e.target.value, model: '', variant: '' })); setPage(1); }}>
              <option value="">All Makes</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="table-filter" value={filters.model} onChange={e => { setFilters(f => ({ ...f, model: e.target.value, variant: '' })); setPage(1); }} disabled={!filters.make}>
              <option value="">All Models</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="table-filter" value={filters.variant} onChange={e => { setFilters(f => ({ ...f, variant: e.target.value })); setPage(1); }} disabled={!filters.model}>
              <option value="">All Variants</option>
              {variants.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select className="table-filter" value={filters.color} onChange={e => { setFilters(f => ({ ...f, color: e.target.value })); setPage(1); }}>
              <option value="">All Colors</option>
              {colors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="table-filter" value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}>
              <option value="">All Status</option>
              <option value="parked">Parked</option>
              <option value="driving">Driving</option>
            </select>
            <select className="table-filter" value={filters.year} onChange={e => { setFilters(f => ({ ...f, year: e.target.value })); setPage(1); }}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <input
              type="text"
              className="table-filter table-search"
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
            {hasFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X /> Clear
              </button>
            )}
          </div>
          <div className="table-actions">
            <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
              <Download /> CSV
            </button>
          </div>
        </div>

        <div className="attr-filter-row">
          {ATTRIBUTES.map(attr => (
            <button
              key={attr.key}
              className={`attr-filter-btn${activeAttrs.has(attr.key) ? ' active' : ''}${attr.key === 'hof' ? ' hof' : ''}`}
              onClick={() => toggleAttr(attr.key)}
            >
              {attr.label}
            </button>
          ))}
          <span className="attr-filter-divider" />
          <button
            className={`attr-filter-btn orphan${showOrphans ? ' active' : ''}`}
            onClick={() => { setShowOrphans(v => !v); setPage(1); }}
          >
            Untagged Score
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>N°</th>
                <th onClick={() => handleSort('make')} className={sortKey === 'make' ? 'sorted' : ''}>Make<SortIcon column="make" /></th>
                <th onClick={() => handleSort('model')} className={sortKey === 'model' ? 'sorted' : ''}>Model<SortIcon column="model" /></th>
                <th onClick={() => handleSort('variant')} className={sortKey === 'variant' ? 'sorted' : ''}>Variant<SortIcon column="variant" /></th>
                <th onClick={() => handleSort('color')} className={sortKey === 'color' ? 'sorted' : ''}>Color<SortIcon column="color" /></th>
                <th>Attr</th>
                <th>Notes</th>
                <th onClick={() => handleSort('year')} className={sortKey === 'year' ? 'sorted' : ''}>Year<SortIcon column="year" /></th>
                <th onClick={() => handleSort('timestamp')} className={sortKey === 'timestamp' ? 'sorted' : ''}>Added<SortIcon column="timestamp" /></th>
                <th onClick={() => handleSort('totalRarity')} className={sortKey === 'totalRarity' ? 'sorted' : ''}>Rarity<SortIcon column="totalRarity" /></th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(entry => {
                const attrs = getAttrList(entry.specs);
                const visibleAttrs = attrs.slice(0, 3);
                const moreCount = attrs.length - 3;
                
                return (
                  <tr key={entry.id}>
                    <td>
                      {entry.url ? (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="idx-link"
                          title="Open Street View"
                        >
                          {fmtIdx(entry.id)} ↗
                        </a>
                      ) : (
                        <span className="idx-plain">{fmtIdx(entry.id)}</span>
                      )}
                    </td>
                    <td>{entry.make}</td>
                    <td>{entry.model}</td>
                    <td className="cell-secondary">{entry.variant}</td>
                    <td className="cell-secondary">{entry.color || '—'}</td>
                    <td>
                      <div className="attr-list">
                        {visibleAttrs.map(a => (
                          <span key={a.key} className={`attr-pill ${a.key === 'hof' ? 'hof' : ''}`}>{a.label}</span>
                        ))}
                        {moreCount > 0 && <span className="attr-more">+{moreCount}</span>}
                      </div>
                    </td>
                    <td className="cell-secondary" style={{ maxWidth: '180px' }}>{entry.notes || '—'}</td>
                    <td className="cell-mono">{entry.year || '—'}</td>
                    <td className="cell-secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{formatDate(entry.timestamp)}</td>
                    <td className="cell-mono">
                      <span className="tier-dot" style={{ background: tierColor(entry.totalRarity || 0) }} />
                      {entry.totalRarity || 0}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="row-action" onClick={() => setEditEntry(entry)}>
                          <Pencil />
                        </button>
                        <button className="row-action delete" onClick={() => handleDelete(entry)}>
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <div className="table-info">
            {filtered.length} of {entries.length} entries
          </div>
          <div className="table-pagination">
            <button className="page-btn" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
            <span className="page-current">{page} / {totalPages || 1}</span>
            <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
          </div>
        </div>
      </div>

      {editEntry && (
        <EditModal
          entry={editEntry}
          masterData={masterData}
          onClose={() => setEditEntry(null)}
          onSave={async (updated) => {
            try {
              await updateDoc(doc(db, 'entries', editEntry.id), updated);
              showToast('Entry updated');
              onRefresh();
              setEditEntry(null);
            } catch {
              showToast('Update failed', 'error');
            }
          }}
        />
      )}
    </>
  );
}