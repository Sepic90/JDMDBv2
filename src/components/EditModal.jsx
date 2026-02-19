import { useState, useMemo } from 'react';
import { X, Check, Trophy, Save } from 'lucide-react';

const COLORS = ['Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Gold', 'Bronze', 'Purple', 'Pink', 'Beige', 'Other'];
const YEARS = Array.from({ length: 21 }, (_, i) => 2025 - i);

const ATTRIBUTES = [
  { key: 'bodykit', label: 'Bodykit', points: 1 },
  { key: 'aeromods', label: 'Aero', points: 1 },
  { key: 'disrespected', label: 'Disrespect', points: 1 },
  { key: 'frontswap', label: 'Frontswap', points: 1 },
  { key: 'trackday', label: 'Track', points: 1 },
  { key: 'drift', label: 'Drift', points: 1 },
  { key: 'livery', label: 'Livery', points: 1 },
  { key: 'rims', label: 'Rims', points: 1 },
  { key: 'vip', label: 'VIP', points: 1 },
  { key: 'stance', label: 'Stance', points: 1 },
  { key: 'twotone', label: 'Two-tone', points: 1 },
  { key: 'rareoem', label: 'Rare OEM', points: 2 },
  { key: 'rareafter', label: 'Rare After', points: 2 },
  { key: 'showcar', label: 'Showcar', points: 2 },
];

export default function EditModal({ entry, masterData, onClose, onSave }) {
  const [form, setForm] = useState({
    url: entry.url || '',
    year: entry.year || '2025',
    make: entry.make || '',
    model: entry.model || '',
    variant: entry.variant || '',
    color: entry.color || '',
    status: entry.status || 'parked',
    notes: entry.notes || '',
    specs: entry.specs || {}
  });

  const makes = useMemo(() => [...new Set(masterData.map(d => d.make))].sort(), [masterData]);
  const models = useMemo(() => [...new Set(masterData.filter(d => d.make === form.make).map(d => d.model))].sort(), [masterData, form.make]);
  const variants = useMemo(() => masterData.filter(d => d.make === form.make && d.model === form.model), [masterData, form.make, form.model]);

  const selectedVariant = variants.find(v => v.variant === form.variant);
  const baseRarity = selectedVariant?.baseRarity || entry.baseRarity || 0;
  
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

  const handleSave = () => {
    onSave({
      ...form,
      baseRarity,
      additionalRarity,
      totalRarity
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Entry</h2>
          <button className="modal-close" onClick={onClose}>
            <X />
          </button>
        </div>
        
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-grid-dense">
              <div className="form-group span-2">
                <label className="form-label">URL</label>
                <input type="text" className="form-input" value={form.url} onChange={e => handleChange('url', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-select" value={form.year} onChange={e => handleChange('year', e.target.value)}>
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
                <select className="form-select" value={form.model} onChange={e => handleChange('model', e.target.value)}>
                  <option value="">Select</option>
                  {models.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Variant</label>
                <select className="form-select" value={form.variant} onChange={e => handleChange('variant', e.target.value)}>
                  <option value="">Select</option>
                  {variants.map(v => <option key={v.id} value={v.variant}>{v.variant}</option>)}
                </select>
              </div>
            </div>

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

            <div>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Attributes</label>
              <div className="checkbox-grid">
                {ATTRIBUTES.map(attr => (
                  <label key={attr.key} className={`checkbox-item ${form.specs[attr.key] ? 'checked' : ''}`}>
                    <input type="checkbox" checked={!!form.specs[attr.key]} onChange={() => toggleSpec(attr.key)} />
                    <span className="checkbox-indicator"><Check /></span>
                    {attr.label}
                  </label>
                ))}
                <label className={`checkbox-item special ${form.specs.hof ? 'checked' : ''}`}>
                  <input type="checkbox" checked={!!form.specs.hof} onChange={() => toggleSpec('hof')} />
                  <span className="checkbox-indicator"><Check /></span>
                  <Trophy style={{ width: '12px', height: '12px' }} />
                  Hall of Fame
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <input type="text" className="form-input" value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
