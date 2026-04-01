import { useState, useMemo, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Check, Trophy, Plus, ArrowLeft, X, Database } from 'lucide-react';

const COLORS = ['Black','White','Silver','Gray','Red','Blue','Green','Yellow','Orange','Brown','Gold','Bronze','Purple','Pink','Beige','Other'];

const COLOR_HEX = {
  Black:  '#1a1a2e', White:  '#f1f5f9', Silver: '#94a3b8', Gray:   '#64748b',
  Red:    '#ef4444', Blue:   '#3b82f6', Green:  '#22c55e', Yellow: '#eab308',
  Orange: '#f97316', Brown:  '#92400e', Gold:   '#d97706', Bronze: '#a16207',
  Purple: '#8b5cf6', Pink:   '#ec4899', Beige:  '#c4a882', Other:  null,
};

const YEARS = Array.from({ length: 21 }, (_, i) => 2025 - i);

const ATTRS_1PT = [
  { key: 'bodykit',     label: 'Bodykit'         },
  { key: 'aeromods',    label: 'Aero Mods'        },
  { key: 'disrespected',label: 'Disrespected'     },
  { key: 'frontswap',   label: 'Front Swap'       },
  { key: 'trackday',    label: 'Trackday'         },
  { key: 'drift',       label: 'Drift'            },
  { key: 'livery',      label: 'Livery'           },
  { key: 'rims',        label: 'Rims'             },
  { key: 'vip',         label: 'VIP'              },
  { key: 'stance',      label: 'Stance'           },
  { key: 'twotone',     label: 'Two-tone'         },
];

const ATTRS_2PT = [
  { key: 'rareoem',   label: 'Rare OEM'        },
  { key: 'rareafter', label: 'Rare Aftermarket' },
  { key: 'showcar',   label: 'Showcar'         },
];

const RARITY_TIERS = [
  { min: 15, label: 'LEGENDARY',  color: '#f59e0b' },
  { min: 10, label: 'WILD BUILD', color: '#8b5cf6' },
  { min: 5,  label: 'MODIFIED',   color: '#4f7ef7' },
  { min: 0,  label: 'STOCK',      color: '#94a3b8' },
];

const getTier = (score) => RARITY_TIERS.find(t => score >= t.min) || RARITY_TIERS[3];

const getDefaultForm = (prefillData) => ({
  url: prefillData?.url || '',
  year: prefillData?.year || '2025',
  make: '', model: '', variant: '', color: '',
  status: 'parked', notes: '', specs: {}
});

export default function NewEntry({ masterData, onSuccess, onRefresh, showToast, prefillData, onPendingComplete }) {
  const [form, setForm] = useState(() => getDefaultForm(prefillData));

  useEffect(() => { setForm(getDefaultForm(prefillData)); }, [prefillData]);

  const makes    = useMemo(() => [...new Set(masterData.map(d => d.make))].sort(), [masterData]);
  const models   = useMemo(() => [...new Set(masterData.filter(d => d.make === form.make).map(d => d.model))].sort(), [masterData, form.make]);
  const variants = useMemo(() => masterData.filter(d => d.make === form.make && String(d.model) === String(form.model)), [masterData, form.make, form.model]);

  const selectedVariant = variants.find(v => v.variant === form.variant);
  const baseRarity = selectedVariant?.baseRarity || 0;

  const additionalRarity = useMemo(() => {
    const all = [...ATTRS_1PT.map(a => ({ ...a, points: 1 })), ...ATTRS_2PT.map(a => ({ ...a, points: 2 }))];
    return all.reduce((sum, a) => sum + (form.specs[a.key] ? a.points : 0), 0) + (form.specs.hof ? 5 : 0);
  }, [form.specs]);

  const totalRarity = baseRarity + additionalRarity;
  const tier = getTier(totalRarity);
  const tierIndex = RARITY_TIERS.slice().reverse().findIndex(t => t.label === tier.label);

  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === 'make')  { updates.model = ''; updates.variant = ''; }
    if (field === 'model') { updates.variant = ''; }
    setForm(prev => ({ ...prev, ...updates }));
  };

  const toggleSpec = (key) => {
    setForm(prev => ({ ...prev, specs: { ...prev.specs, [key]: !prev.specs[key] } }));
  };

  // ── Quick-add modal ──────────────────────────────────────
  const [modalOpen, setModalOpen]   = useState(false);
  const [mForm, setMForm]           = useState({ make: '', model: '', variant: '', baseRarity: '' });
  const [mMakeDrop, setMMakeDrop]   = useState(false);
  const [mModelDrop, setMModelDrop] = useState(false);
  const mMakeRef  = useRef(null);
  const mModelRef = useRef(null);

  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e) => {
      if (mMakeRef.current  && !mMakeRef.current.contains(e.target))  setMMakeDrop(false);
      if (mModelRef.current && !mModelRef.current.contains(e.target)) setMModelDrop(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modalOpen]);

  const mMakeSuggestions = useMemo(() => {
    const all = [...new Set(masterData.map(d => d.make))].sort();
    return mForm.make ? all.filter(m => m.toLowerCase().includes(mForm.make.toLowerCase())) : all;
  }, [masterData, mForm.make]);

  const mModelSuggestions = useMemo(() => {
    const pool = mForm.make ? masterData.filter(d => d.make === mForm.make) : masterData;
    const all = [...new Set(pool.map(d => String(d.model)))].sort();
    return mForm.model ? all.filter(m => m.toLowerCase().includes(mForm.model.toLowerCase())) : all;
  }, [masterData, mForm.make, mForm.model]);

  const openModal = () => {
    setMForm({ make: form.make || '', model: form.model || '', variant: '', baseRarity: '' });
    setModalOpen(true);
  };

  const handleModalAdd = async () => {
    if (!mForm.make || !mForm.model || !mForm.variant || !mForm.baseRarity) {
      showToast('Please fill all fields', 'error'); return;
    }
    const exists = masterData.some(d =>
      d.make === mForm.make && String(d.model) === String(mForm.model) && d.variant === mForm.variant
    );
    if (exists) { showToast('Variant already exists', 'error'); return; }

    try {
      await addDoc(collection(db, 'masterData'), {
        make: mForm.make, model: mForm.model,
        variant: mForm.variant, baseRarity: Number(mForm.baseRarity),
      });
      await onRefresh();
      // Pre-select the newly added variant in the main form
      setForm(prev => ({ ...prev, make: mForm.make, model: mForm.model, variant: mForm.variant }));
      setModalOpen(false);
      showToast(`${mForm.variant} added to master data`);
    } catch {
      showToast('Failed to add variant', 'error');
    }
  };
  // ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.url || !form.make || !form.model || !form.variant || !form.color) {
      showToast('Please fill in required fields', 'error');
      return;
    }
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'entries'), {
        ...form, baseRarity, additionalRarity, totalRarity, createdAt: now, timestamp: now,
      });
      if (prefillData?.pendingId) {
        await deleteDoc(doc(db, 'pendingSubmissions', prefillData.pendingId));
        showToast('Entry added & submission accepted!');
        onPendingComplete(true);
      } else {
        setForm(getDefaultForm(null));
        onSuccess();
      }
    } catch (err) {
      console.error('❌ Entry submission error:', err);
      showToast('Failed to add entry', 'error');
    }
  };

  return (
    <div className="ne-form">

      {/* Prefill banner */}
      {prefillData && (
        <div className="prefill-banner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Reviewing submission — URL and year are locked in</span>
            {prefillData.notes && <span className="prefill-gf-note">"{prefillData.notes}"</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onPendingComplete(false)}>
            <ArrowLeft style={{ width: '12px', height: '12px' }} /> Back
          </button>
        </div>
      )}

      {/* Identity row: Year + URL */}
      <div className="ne-identity-row">
        <div className="form-group">
          <label className="form-label">
            Year {prefillData && <span className="prefill-tag">locked</span>}
          </label>
          <select
            className="form-select"
            value={form.year}
            onChange={e => !prefillData && handleChange('year', e.target.value)}
            disabled={!!prefillData}
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">
            Street View URL {prefillData && <span className="prefill-tag">locked</span>}
          </label>
          <input
            type="text"
            className={`form-input${prefillData ? ' prefill-locked' : ''}`}
            placeholder="https://www.google.com/maps/@..."
            value={form.url}
            onChange={e => !prefillData && handleChange('url', e.target.value)}
            readOnly={!!prefillData}
          />
        </div>
      </div>

      {/* Main panels */}
      <div className="ne-panels">

        {/* LEFT — Vehicle identity */}
        <div className="ne-panel ne-panel-vehicle">
          <div className="ne-panel-hdr">Vehicle</div>

          <div className="ne-vehicle-selects">
            <div className="form-group">
              <label className="form-label">Make</label>
              <select className="form-select" value={form.make} onChange={e => handleChange('make', e.target.value)}>
                <option value="">Select make</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <select className="form-select" value={form.model} onChange={e => handleChange('model', e.target.value)} disabled={!form.make}>
                <option value="">{form.make ? 'Select model' : '—'}</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Variant</label>
              <select className="form-select" value={form.variant} onChange={e => handleChange('variant', e.target.value)} disabled={!form.model}>
                <option value="">{form.model ? 'Select variant' : '—'}</option>
                {variants.map(v => <option key={v.id} value={v.variant}>{v.variant}</option>)}
              </select>
            </div>
          </div>

          {!prefillData && (
            <button type="button" className="ne-quick-add-trigger" onClick={openModal}>
              <Database style={{ width: '11px', height: '11px' }} />
              Add new variant to master data
            </button>
          )}

          {/* Color swatches */}
          <div className="form-group">
            <label className="form-label">
              Color{form.color && <span className="ne-color-name">{form.color}</span>}
            </label>
            <div className="ne-color-swatches">
              {COLORS.map(color => {
                const hex = COLOR_HEX[color];
                const isSelected = form.color === color;
                const isLight = ['White', 'Silver', 'Beige', 'Yellow'].includes(color);
                return (
                  <button
                    key={color}
                    type="button"
                    className={`ne-swatch ${isSelected ? 'selected' : ''}`}
                    title={color}
                    onClick={() => handleChange('color', color)}
                    style={{
                      background: hex || 'conic-gradient(from 0deg, #ef4444, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
                      boxShadow: isSelected
                        ? `0 0 0 2px #fff, 0 0 0 4px var(--accent)`
                        : color === 'White' ? 'inset 0 0 0 1px var(--border-default)' : undefined,
                    }}
                  >
                    {isSelected && (
                      <Check style={{ width: '10px', height: '10px', color: isLight ? '#374151' : '#fff', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spacer — pushes status/notes to bottom when panel stretches */}
          <div className="ne-spacer" />

          {/* Status + Notes */}
          <div className="ne-bottom-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <div className="ne-status-toggle">
                <button
                  type="button"
                  className={`ne-status-btn ${form.status === 'parked' ? 'active' : ''}`}
                  onClick={() => handleChange('status', 'parked')}
                >
                  Parked
                </button>
                <button
                  type="button"
                  className={`ne-status-btn ${form.status === 'driving' ? 'active' : ''}`}
                  onClick={() => handleChange('status', 'driving')}
                >
                  Driving
                </button>
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Notes</label>
              <input
                type="text"
                className="form-input"
                placeholder="Optional notes..."
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* RIGHT — Rarity scoring */}
        <div className="ne-panel">
          <div className="ne-panel-hdr">Rarity Score</div>

          {/* Score box — equation + tier bar in one contained unit */}
          <div className="ne-score-box">
            <div className="ne-score-eq">
              <div className="ne-score-cell">
                <span className="ne-score-num" style={{ color: 'var(--text-secondary)' }}>{baseRarity}</span>
                <span className="ne-score-lbl">Base</span>
              </div>
              <span className="ne-score-op">+</span>
              <div className="ne-score-cell">
                <span className="ne-score-num" style={{ color: 'var(--success)' }}>+{additionalRarity}</span>
                <span className="ne-score-lbl">Mods</span>
              </div>
              <span className="ne-score-op">=</span>
              <div className="ne-score-cell">
                <span className="ne-score-total">{totalRarity}</span>
                <span className="ne-score-tier" style={{ color: tier.color }}>{tier.label}</span>
              </div>
            </div>
            <div className="ne-tier-track">
              {RARITY_TIERS.slice().reverse().map((t, i) => (
                <div
                  key={t.label}
                  className="ne-tier-seg"
                  style={{ background: i <= tierIndex ? t.color : undefined }}
                  title={t.label}
                />
              ))}
            </div>
          </div>

          {/* Attribute chips */}
          <div className="ne-attrs">
            <div className="ne-attr-group">
              <span className="ne-attr-group-lbl">+1 pt each</span>
              <div className="ne-attr-chips">
                {ATTRS_1PT.map(a => (
                  <button
                    key={a.key}
                    type="button"
                    className={`ne-chip ${form.specs[a.key] ? 'active' : ''}`}
                    onClick={() => toggleSpec(a.key)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ne-attr-group">
              <span className="ne-attr-group-lbl">+2 pts each</span>
              <div className="ne-attr-chips">
                {ATTRS_2PT.map(a => (
                  <button
                    key={a.key}
                    type="button"
                    className={`ne-chip ${form.specs[a.key] ? 'active' : ''}`}
                    onClick={() => toggleSpec(a.key)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="ne-attr-group">
              <span className="ne-attr-group-lbl">+5 pts</span>
              <div className="ne-attr-chips">
                <button
                  type="button"
                  className={`ne-chip hof ${form.specs.hof ? 'active' : ''}`}
                  onClick={() => toggleSpec('hof')}
                >
                  <Trophy style={{ width: '11px', height: '11px' }} />
                  Hall of Fame
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="ne-footer">
        <button className="btn btn-primary ne-submit-btn" onClick={handleSubmit}>
          <Plus style={{ width: '14px', height: '14px' }} />
          Add Entry
        </button>
      </div>

      {/* Quick-add modal */}
      {modalOpen && (
        <div className="qam-backdrop" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="qam-card">
            <div className="qam-header">
              <span className="qam-title">
                <Database style={{ width: '13px', height: '13px' }} />
                Add to Master Data
              </span>
              <button type="button" className="qam-close" onClick={() => setModalOpen(false)}>
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            </div>

            <div className="qam-body">
              {/* Make */}
              <div className="form-group">
                <label className="form-label">Make</label>
                <div ref={mMakeRef} style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Nissan"
                    value={mForm.make}
                    onChange={e => setMForm(f => ({ ...f, make: e.target.value }))}
                    onFocus={() => setMMakeDrop(true)}
                    autoComplete="off"
                  />
                  {mMakeDrop && mMakeSuggestions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {mMakeSuggestions.slice(0, 8).map(m => (
                        <div key={m} className="autocomplete-item"
                          onMouseDown={() => { setMForm(f => ({ ...f, make: m })); setMMakeDrop(false); }}>
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Model */}
              <div className="form-group">
                <label className="form-label">Model</label>
                <div ref={mModelRef} style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Skyline"
                    value={mForm.model}
                    onChange={e => setMForm(f => ({ ...f, model: e.target.value }))}
                    onFocus={() => setMModelDrop(true)}
                    autoComplete="off"
                  />
                  {mModelDrop && mModelSuggestions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {mModelSuggestions.slice(0, 8).map(m => (
                        <div key={m} className="autocomplete-item"
                          onMouseDown={() => { setMForm(f => ({ ...f, model: m })); setMModelDrop(false); }}>
                          {m}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Variant */}
              <div className="form-group">
                <label className="form-label">Variant</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. R33 GT-R"
                  value={mForm.variant}
                  onChange={e => setMForm(f => ({ ...f, variant: e.target.value }))}
                  autoComplete="off"
                />
              </div>

              {/* Base Rarity */}
              <div className="form-group">
                <label className="form-label">Base Rarity</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0–10"
                  min="0" max="20"
                  value={mForm.baseRarity}
                  onChange={e => setMForm(f => ({ ...f, baseRarity: e.target.value }))}
                />
              </div>
            </div>

            <div className="qam-footer">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleModalAdd}>
                <Plus style={{ width: '12px', height: '12px' }} />
                Add Variant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
