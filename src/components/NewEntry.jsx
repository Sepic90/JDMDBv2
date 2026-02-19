import { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { Check, Trophy, Plus, ArrowLeft } from 'lucide-react';

const COLORS = ['Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Gold', 'Bronze', 'Purple', 'Pink', 'Beige', 'Other'];
const YEARS = Array.from({ length: 21 }, (_, i) => 2025 - i);

const ATTRIBUTES = [
  { key: 'bodykit', label: 'Bodykit', points: 1 },
  { key: 'aeromods', label: 'Aero Mods', points: 1 },
  { key: 'disrespected', label: 'Disrespected', points: 1 },
  { key: 'rareoem', label: 'Rare OEM', points: 2 },
  { key: 'rareafter', label: 'Rare Aftermarket', points: 2 },
  { key: 'frontswap', label: 'Front Swap', points: 1 },
  { key: 'trackday', label: 'Trackday', points: 1 },
  { key: 'drift', label: 'Drift', points: 1 },
  { key: 'livery', label: 'Livery', points: 1 },
  { key: 'rims', label: 'Rims', points: 1 },
  { key: 'vip', label: 'VIP', points: 1 },
  { key: 'stance', label: 'Stance', points: 1 },
  { key: 'twotone', label: 'Two-tone', points: 1 },
  { key: 'showcar', label: 'Showcar', points: 2 },
];

const getDefaultForm = (prefillData) => ({
  url: prefillData?.url || '',
  year: prefillData?.year || '2025',
  make: '',
  model: '',
  variant: '',
  color: '',
  status: 'parked',
  notes: '',
  specs: {}
});

export default function NewEntry({ masterData, onSuccess, showToast, prefillData, onPendingComplete }) {
  const [form, setForm] = useState(() => getDefaultForm(prefillData));

  useEffect(() => {
    setForm(getDefaultForm(prefillData));
  }, [prefillData]);

  const makes = useMemo(() => [...new Set(masterData.map(d => d.make))].sort(), [masterData]);
  const models = useMemo(() => [...new Set(masterData.filter(d => d.make === form.make).map(d => d.model))].sort(), [masterData, form.make]);
  const variants = useMemo(() => masterData.filter(d => d.make === form.make && String(d.model) === String(form.model)), [masterData, form.make, form.model]);

  const selectedVariant = variants.find(v => v.variant === form.variant);
  const baseRarity = selectedVariant?.baseRarity || 0;

  const additionalRarity = useMemo(() => {
    let total = ATTRIBUTES.reduce((sum, attr) => sum + (form.specs[attr.key] ? attr.points : 0), 0);
    if (form.specs.hof) total += 5;
    return total;
  }, [form.specs]);

  const totalRarity = baseRarity + additionalRarity;

  const handleChange = (field, value) => {
    const updates = { [field]: value };
    if (field === 'make') {
      updates.model = '';
      updates.variant = '';
    } else if (field === 'model') {
      updates.variant = '';
    }
    setForm(prev => ({ ...prev, ...updates }));
  };

  const toggleSpec = (key) => {
    setForm(prev => ({
      ...prev,
      specs: { ...prev.specs, [key]: !prev.specs[key] }
    }));
  };

  const handleSubmit = async () => {
    if (!form.url || !form.make || !form.model || !form.variant) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'entries'), {
        ...form,
        baseRarity,
        additionalRarity,
        totalRarity,
        createdAt: new Date().toISOString()
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
      console.error('❌ Entry submission error:', err)
      showToast('Failed to add entry', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {prefillData && (
        <div className="prefill-banner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Reviewing GF's submission — URL and year are locked in</span>
            {prefillData.notes && (
              <span className="prefill-gf-note">"{prefillData.notes}"</span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onPendingComplete(false)}>
            <ArrowLeft style={{ width: '12px', height: '12px' }} />
            Back
          </button>
        </div>
      )}

      {/* Row 1: URL, Year, Make, Model, Variant */}
      <div className="form-grid-dense">
        <div className="form-group span-2">
          <label className="form-label">
            URL {prefillData && <span className="prefill-tag">locked</span>}
          </label>
          <input
            type="text"
            className={`form-input${prefillData ? ' prefill-locked' : ''}`}
            placeholder="Street View URL"
            value={form.url}
            onChange={e => !prefillData && handleChange('url', e.target.value)}
            readOnly={!!prefillData}
          />
        </div>
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
          <label className="form-label">Make</label>
          <select className="form-select" value={form.make} onChange={e => handleChange('make', e.target.value)}>
            <option value="">Select</option>
            {makes.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Model</label>
          <select className="form-select" value={form.model} onChange={e => handleChange('model', e.target.value)} disabled={!form.make}>
            <option value="">Select</option>
            {models.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Variant</label>
          <select className="form-select" value={form.variant} onChange={e => handleChange('variant', e.target.value)} disabled={!form.model}>
            <option value="">Select</option>
            {variants.map(v => <option key={v.id} value={v.variant}>{v.variant}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2: Color, Status, Rarity Display */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ width: '140px' }}>
          <label className="form-label">Color</label>
          <select className="form-select" value={form.color} onChange={e => handleChange('color', e.target.value)}>
            <option value="">Select</option>
            {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <div className="radio-group">
            <label className={`radio-item ${form.status === 'parked' ? 'selected' : ''}`}>
              <input type="radio" checked={form.status === 'parked'} onChange={() => handleChange('status', 'parked')} />
              <span className="radio-dot" />
              Parked
            </label>
            <label className={`radio-item ${form.status === 'driving' ? 'selected' : ''}`}>
              <input type="radio" checked={form.status === 'driving'} onChange={() => handleChange('status', 'driving')} />
              <span className="radio-dot" />
              Driving
            </label>
          </div>
        </div>
        <div className="rarity-display" style={{ marginLeft: 'auto' }}>
          <div className="rarity-item base">
            <span className="rarity-label">Base</span>
            <span className="rarity-value">{baseRarity}</span>
          </div>
          <div className="rarity-item additional">
            <span className="rarity-label">+Attr</span>
            <span className="rarity-value">+{additionalRarity}</span>
          </div>
          <div className="rarity-item total">
            <span className="rarity-label">Total</span>
            <span className="rarity-value">{totalRarity}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Attributes */}
      <div>
        <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Attributes</label>
        <div className="checkbox-grid">
          {ATTRIBUTES.map(attr => (
            <label key={attr.key} className={`checkbox-item ${form.specs[attr.key] ? 'checked' : ''}`}>
              <input type="checkbox" checked={!!form.specs[attr.key]} onChange={() => toggleSpec(attr.key)} />
              <span className="checkbox-indicator"><Check /></span>
              {attr.label}
              <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '10px' }}>+{attr.points}</span>
            </label>
          ))}
          <label className={`checkbox-item special ${form.specs.hof ? 'checked' : ''}`}>
            <input type="checkbox" checked={!!form.specs.hof} onChange={() => toggleSpec('hof')} />
            <span className="checkbox-indicator"><Check /></span>
            <Trophy style={{ width: '12px', height: '12px' }} />
            Hall of Fame
            <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: '10px' }}>+5</span>
          </label>
        </div>
      </div>

      {/* Row 4: Add Entry button + Notes */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSubmit}>
          <Plus style={{ width: '14px', height: '14px' }} />
          Add Entry
        </button>
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
  );
}
