import { useState, useMemo, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Trash2, Upload, ChevronUp, ChevronDown } from 'lucide-react';

export default function SettingsView({ masterData, onRefresh, showToast }) {
  const [form, setForm] = useState({ make: '', model: '', variant: '', baseRarity: '' });
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('make');
  const [sortDir, setSortDir] = useState('asc');
  const [showMakeDropdown, setShowMakeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const makeRef = useRef(null);
  const modelRef = useRef(null);

  // Unique makes for autocomplete
  const uniqueMakes = useMemo(() => [...new Set(masterData.map(d => d.make))].sort(), [masterData]);
  
  // Unique models for autocomplete (filtered by current make if set)
  const uniqueModels = useMemo(() => {
    const filtered = form.make 
      ? masterData.filter(d => d.make === form.make)
      : masterData;
    return [...new Set(filtered.map(d => String(d.model)))].sort();
  }, [masterData, form.make]);

  // Filtered suggestions based on input
  const makeSuggestions = useMemo(() => {
    if (!form.make) return uniqueMakes;
    return uniqueMakes.filter(m => m.toLowerCase().includes(form.make.toLowerCase()));
  }, [uniqueMakes, form.make]);

  const modelSuggestions = useMemo(() => {
    if (!form.model) return uniqueModels;
    return uniqueModels.filter(m => m.toLowerCase().includes(form.model.toLowerCase()));
  }, [uniqueModels, form.model]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (makeRef.current && !makeRef.current.contains(e.target)) setShowMakeDropdown(false);
      if (modelRef.current && !modelRef.current.contains(e.target)) setShowModelDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    let result = masterData;
    
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(d => 
        `${d.make} ${d.model} ${d.variant}`.toLowerCase().includes(term)
      );
    }

    result = [...result].sort((a, b) => {
      let aVal = a[sortKey] ?? '';
      let bVal = b[sortKey] ?? '';
      if (sortKey === 'baseRarity') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal);
        bVal = String(bVal);
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [masterData, search, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const handleAdd = async () => {
    if (!form.make || !form.model || !form.variant || !form.baseRarity) {
      showToast('Please fill all fields', 'error');
      return;
    }

    const exists = masterData.some(d => 
      d.make === form.make && String(d.model) === String(form.model) && d.variant === form.variant
    );

    if (exists) {
      showToast('Entry already exists', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'masterData'), {
        make: form.make,
        model: form.model,
        variant: form.variant,
        baseRarity: Number(form.baseRarity)
      });
      setForm({ make: '', model: '', variant: '', baseRarity: '' });
      showToast('Master data added');
      onRefresh();
    } catch {
      showToast('Failed to add', 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete ${item.make} ${item.model} ${item.variant}?`)) return;
    try {
      await deleteDoc(doc(db, 'masterData', item.id));
      showToast('Deleted');
      onRefresh();
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        document.head.appendChild(script);
        
        script.onload = async () => {
          const data = await file.arrayBuffer();
          const workbook = window.XLSX.read(data);
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = window.XLSX.utils.sheet_to_json(sheet);

          let added = 0;
          let skipped = 0;

          for (const row of rows) {
            const make = row.Make || row.make;
            const model = row.Model || row.model;
            const variant = row.Variant || row.variant;
            const baseRarity = Number(row.BaseRarity || row.baseRarity || row['Base Rarity'] || 0);

            if (!make || !model || !variant) {
              skipped++;
              continue;
            }

            const exists = masterData.some(d => 
              d.make === make && String(d.model) === String(model) && d.variant === variant
            );

            if (exists) {
              skipped++;
              continue;
            }

            await addDoc(collection(db, 'masterData'), { make, model, variant, baseRarity });
            added++;
          }

          showToast(`Imported ${added}, skipped ${skipped}`);
          onRefresh();
        };
      } catch {
        showToast('Import failed', 'error');
      }
    };
    input.click();
  };

  const SortIcon = ({ column }) => {
    if (sortKey !== column) return null;
    return sortDir === 'asc' ? <ChevronUp className="sort-icon" /> : <ChevronDown className="sort-icon" />;
  };

  return (
    <div>
      <div className="settings-section">
        <div className="settings-title">Add to Catalog<span className="jp">追加</span></div>
        <div className="settings-form">
          {/* Make with autocomplete */}
          <div ref={makeRef} style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Make"
              value={form.make}
              onChange={e => setForm(f => ({ ...f, make: e.target.value }))}
              onFocus={() => setShowMakeDropdown(true)}
            />
            {showMakeDropdown && makeSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {makeSuggestions.slice(0, 8).map(m => (
                  <div 
                    key={m} 
                    className="autocomplete-item"
                    onClick={() => { setForm(f => ({ ...f, make: m })); setShowMakeDropdown(false); }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Model with autocomplete */}
          <div ref={modelRef} style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Model"
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              onFocus={() => setShowModelDropdown(true)}
            />
            {showModelDropdown && modelSuggestions.length > 0 && (
              <div className="autocomplete-dropdown">
                {modelSuggestions.slice(0, 8).map(m => (
                  <div 
                    key={m} 
                    className="autocomplete-item"
                    onClick={() => { setForm(f => ({ ...f, model: m })); setShowModelDropdown(false); }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            )}
          </div>

          <input
            type="text"
            className="form-input"
            placeholder="Variant"
            value={form.variant}
            onChange={e => setForm(f => ({ ...f, variant: e.target.value }))}
          />
          <input
            type="number"
            className="form-input"
            placeholder="Base Rarity"
            value={form.baseRarity}
            onChange={e => setForm(f => ({ ...f, baseRarity: e.target.value }))}
          />
          <button className="btn btn-primary" onClick={handleAdd}>
            <Plus /> Add
          </button>
        </div>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-filters">
            <input
              type="text"
              className="table-filter table-search"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>
              {filtered.length} of {masterData.length} entries
            </span>
          </div>
          <div className="table-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleImport}>
              <Upload /> Import Excel
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('make')} className={sortKey === 'make' ? 'sorted' : ''}>
                  Make<SortIcon column="make" />
                </th>
                <th onClick={() => handleSort('model')} className={sortKey === 'model' ? 'sorted' : ''}>
                  Model<SortIcon column="model" />
                </th>
                <th onClick={() => handleSort('variant')} className={sortKey === 'variant' ? 'sorted' : ''}>
                  Variant<SortIcon column="variant" />
                </th>
                <th onClick={() => handleSort('baseRarity')} className={sortKey === 'baseRarity' ? 'sorted' : ''}>
                  Base Rarity<SortIcon column="baseRarity" />
                </th>
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>{item.make}</td>
                  <td>{item.model}</td>
                  <td className="cell-secondary">{item.variant}</td>
                  <td className="cell-mono">{item.baseRarity}</td>
                  <td>
                    <button className="row-action delete" onClick={() => handleDelete(item)}>
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}