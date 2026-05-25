import { useState } from 'react';
import { createSPA } from '../api/spaApi';

const INITIAL = {
  SPANumber: '',
  SPAName: '',
  EffectiveDate: '',
  ExpiryDate: '',
  VendorAccount: '',
  CustomerAccount: '',
  ItemIdentifier: { Type: 'CPN', Value: '' },
  ItemDescription: '',
  UOM: 'EA',
  Pricing: { Price: '', MinQty: 1, Currency: 'USD', PriceType: 'Net' }
};

export default function SPACreator() {
  const [form, setForm] = useState(INITIAL);
  const [status, setStatus] = useState(null); // null | 'loading' | result object

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const setItem = (field, value) => setForm(f => ({ ...f, ItemIdentifier: { ...f.ItemIdentifier, [field]: value } }));
  const setPricing = (field, value) => setForm(f => ({ ...f, Pricing: { ...f.Pricing, [field]: value } }));

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');

    const payload = {
      ...form,
      ItemDescription: form.ItemDescription || null,
      Pricing: {
        ...form.Pricing,
        Price: parseFloat(form.Pricing.Price),
        MinQty: parseInt(form.Pricing.MinQty, 10)
      }
    };

    try {
      const result = await createSPA(payload);
      setStatus(result);
      if (result.success) setForm(INITIAL);
    } catch (err) {
      setStatus({ success: false, error: err.message });
    }
  }

  return (
    <div className="spa-creator">
      <h2>Create SPA</h2>
      <form onSubmit={handleSubmit}>
        <fieldset className="form-section">
          <legend>Agreement</legend>
          <div className="form-grid">
            <div className="form-group">
              <label>SPA Number</label>
              <input required value={form.SPANumber} onChange={e => set('SPANumber', e.target.value)} placeholder="SPA-2025-001" />
            </div>
            <div className="form-group">
              <label>SPA Name</label>
              <input required value={form.SPAName} onChange={e => set('SPAName', e.target.value)} placeholder="Q3 Distributor Price" />
            </div>
            <div className="form-group">
              <label>Effective Date</label>
              <input required type="date" value={form.EffectiveDate} onChange={e => set('EffectiveDate', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Expiry Date</label>
              <input required type="date" value={form.ExpiryDate} onChange={e => set('ExpiryDate', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Parties</legend>
          <div className="form-grid">
            <div className="form-group">
              <label>Vendor Account</label>
              <input required value={form.VendorAccount} onChange={e => set('VendorAccount', e.target.value)} placeholder="VEND-001" />
            </div>
            <div className="form-group">
              <label>Customer Account</label>
              <input required value={form.CustomerAccount} onChange={e => set('CustomerAccount', e.target.value)} placeholder="CUST-4512" />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Item</legend>
          <div className="form-grid">
            <div className="form-group">
              <label>Identifier Type</label>
              <select value={form.ItemIdentifier.Type} onChange={e => setItem('Type', e.target.value)}>
                <option value="CPN">CPN — Customer Part Number</option>
                <option value="ItemNumber">Item Number</option>
                <option value="GTIN">GTIN</option>
              </select>
            </div>
            <div className="form-group">
              <label>Identifier Value</label>
              <input required value={form.ItemIdentifier.Value} onChange={e => setItem('Value', e.target.value)} placeholder="CP-88210" />
            </div>
            <div className="form-group">
              <label>UOM</label>
              <input required value={form.UOM} onChange={e => set('UOM', e.target.value)} placeholder="EA" />
            </div>
            <div className="form-group">
              <label>Description <span className="optional">(optional)</span></label>
              <input value={form.ItemDescription} onChange={e => set('ItemDescription', e.target.value)} placeholder="Leave blank to use D365 description" />
            </div>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Pricing</legend>
          <div className="form-grid">
            <div className="form-group">
              <label>Price</label>
              <input required type="number" step="0.01" min="0" value={form.Pricing.Price} onChange={e => setPricing('Price', e.target.value)} placeholder="14.50" />
            </div>
            <div className="form-group">
              <label>Min Qty</label>
              <input required type="number" min="1" step="1" value={form.Pricing.MinQty} onChange={e => setPricing('MinQty', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select value={form.Pricing.Currency} onChange={e => setPricing('Currency', e.target.value)}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
            <div className="form-group">
              <label>Price Type</label>
              <select value={form.Pricing.PriceType} onChange={e => setPricing('PriceType', e.target.value)}>
                <option value="Net">Net</option>
                <option value="Gross">Gross</option>
                <option value="Base">Base</option>
              </select>
            </div>
          </div>
        </fieldset>

        <button type="submit" disabled={status === 'loading'} className="submit-btn">
          {status === 'loading' ? 'Submitting…' : 'Create SPA'}
        </button>
      </form>

      {status && status !== 'loading' && (
        <div className={`result ${status.success ? 'success' : 'error'}`}>
          {status.success ? (
            <>
              <strong>SPA Created</strong>
              <div>SPA Number: {status.data?.SPANumber}</div>
              <div>RecId: {status.data?.RecId}</div>
              <div>Status: {status.data?.Status}</div>
            </>
          ) : status.queued ? (
            <>
              <strong>Submission failed — queued for retry</strong>
              <div className="error-detail">{status.error}</div>
            </>
          ) : (
            <>
              <strong>Error</strong>
              <div className="error-detail">{status.error}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
