import { useState } from 'react';
import { saveOrder } from '../../api/orderApi';

export default function OrderDetail({ order: initial, onBack }) {
  const [form, setForm]       = useState({ ...initial, lineItems: initial.lineItems.map(li => ({ ...li })) });
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // null | { ok, text }

  const set     = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const setLine = (i, f, v) => setForm(p => ({
    ...p,
    lineItems: p.lineItems.map((li, idx) => idx === i ? { ...li, [f]: v } : li),
  }));
  const addLine = () => setForm(p => ({
    ...p,
    lineItems: [...p.lineItems, { itemNumber: '', description: '', qty: 1, uom: 'EA', price: 0, requestedShipDate: '' }],
  }));
  const removeLine = i => setForm(p => ({ ...p, lineItems: p.lineItems.filter((_, idx) => idx !== i) }));

  const total = form.lineItems.reduce((s, li) => s + (parseFloat(li.price) || 0) * (parseInt(li.qty) || 0), 0);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveOrder(form);
      setSaveMsg({ ok: true, text: 'Order saved successfully.' });
    } catch (err) {
      setSaveMsg({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const statusCls = {
    'Submitted': 'os-submitted', 'In Review': 'os-inreview',
    'Processed': 'os-processed', 'Exception': 'os-exception', 'Archived': 'os-archived',
  }[form.status] ?? 'os-submitted';

  return (
    <div className="od-wrapper">

      {/* ── Top bar ── */}
      <div className="od-topbar">
        <div className="od-topbar-left">
          <button className="od-back" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Orders
          </button>
          <span className="od-topbar-sep" />
          <span className="od-topbar-title">Order information</span>
          <span className={`order-status-badge ${statusCls}`} style={{ marginLeft: 10 }}>● {form.status}</span>
        </div>
        <div className="od-topbar-right">
          <button className="btn-outline" type="button">Change log</button>
          <button className="btn-outline" type="button" onClick={() => set('status', 'Archived')}>Archive</button>
          <button className="btn-primary" type="button">Service Request</button>
        </div>
      </div>

      {/* ── Split pane ── */}
      <div className="od-split">

        {/* ── PDF panel ── */}
        <div className="od-pdf-panel">
          <div className="pdf-toolbar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <button className="pdf-btn" title="Previous page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button className="pdf-btn" title="Next page">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <span className="pdf-page">0 / 0</span>
            <div style={{ flex: 1 }} />
            <button className="pdf-btn" title="Zoom out">−</button>
            <button className="pdf-btn" title="Zoom in">+</button>
          </div>

          <div className="pdf-body">
            {/* Replace this div with <iframe src={documentUrl} /> or react-pdf <Document> in production */}
            <div className="pdf-placeholder">
              <svg viewBox="0 0 64 80" width="52" height="65" fill="none">
                <rect x="1" y="1" width="62" height="78" rx="4" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
                <path d="M40 1v14h14" stroke="#e5e7eb" strokeWidth="1.5" />
                <path d="M40 1l14 14" stroke="#e5e7eb" strokeWidth="1.5" fill="none" />
                <rect x="10" y="24" width="44" height="3"  rx="1.5" fill="#f3f4f6" />
                <rect x="10" y="32" width="36" height="3"  rx="1.5" fill="#f3f4f6" />
                <rect x="10" y="40" width="40" height="3"  rx="1.5" fill="#f3f4f6" />
                <rect x="10" y="48" width="28" height="3"  rx="1.5" fill="#f3f4f6" />
                <rect x="10" y="56" width="38" height="3"  rx="1.5" fill="#f3f4f6" />
                <rect x="10" y="64" width="22" height="3"  rx="1.5" fill="#f3f4f6" />
              </svg>
              <div className="pdf-placeholder-label">{form.poNumber}.pdf</div>
              <div className="pdf-placeholder-sub">Connect document URL from Dataverse<br />to render the actual PDF here</div>
            </div>
          </div>

          <div className="pdf-footer">
            <span className="pdf-doc-id" title={form.documentId}>{form.documentId.slice(0, 28)}…</span>
          </div>
        </div>

        {/* ── Form panel ── */}
        <div className="od-form-panel">
          <form onSubmit={handleSave}>

            {/* Meta */}
            <div className="od-field-row od-2col">
              <div className="od-field">
                <label className="od-label">Document ID</label>
                <div className="od-readonly od-mono">{form.documentId}</div>
              </div>
              <div className="od-field">
                <label className="od-label">Submission date</label>
                <div className="od-readonly">{form.submissionDate}</div>
              </div>
            </div>

            <div className="od-divider" />

            {/* Sent to / Sent by */}
            <div className="od-field-row od-2col">
              <div className="od-field">
                <label className="od-label">Sent to <span className="od-req">*</span></label>
                <input
                  required
                  className={`od-input${!form.sentTo ? ' od-empty' : ''}`}
                  value={form.sentTo}
                  onChange={e => set('sentTo', e.target.value)}
                  placeholder="Recipient email / name"
                />
              </div>
              <div className="od-field">
                <label className="od-label">Sent by <span className="od-req">*</span></label>
                <input
                  required
                  className={`od-input${!form.sentBy ? ' od-empty' : ''}`}
                  value={form.sentBy}
                  onChange={e => set('sentBy', e.target.value)}
                  placeholder="Sender email / name"
                />
              </div>
            </div>

            {/* Customer row */}
            <div className="od-field-row od-3col">
              <div className="od-field">
                <label className="od-label">Customer account</label>
                <div className="od-readonly">{form.customerAccount}</div>
              </div>
              <div className="od-field">
                <label className="od-label">Customer name <span className="od-req">*</span></label>
                <input
                  required
                  className={`od-input${!form.customerName ? ' od-empty' : ''}`}
                  value={form.customerName}
                  onChange={e => set('customerName', e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="od-field">
                <label className="od-label">PO number</label>
                <div className="od-readonly">{form.poNumber}</div>
              </div>
            </div>

            {/* Dates / type / status */}
            <div className="od-field-row od-3col">
              <div className="od-field">
                <label className="od-label">Delivery ship date <span className="od-req">*</span></label>
                <input
                  required
                  type="date"
                  className={`od-input${!form.deliveryShipDate ? ' od-empty' : ''}`}
                  value={form.deliveryShipDate}
                  onChange={e => set('deliveryShipDate', e.target.value)}
                />
              </div>
              <div className="od-field">
                <label className="od-label">PO type <span className="od-req">*</span></label>
                <select
                  required
                  className={`od-input${!form.poType ? ' od-empty' : ''}`}
                  value={form.poType}
                  onChange={e => set('poType', e.target.value)}
                >
                  <option value="">Select…</option>
                  <option value="Standard">Standard</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Blanket">Blanket</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
              <div className="od-field">
                <label className="od-label">PO Status</label>
                <div className="od-readonly">
                  <span className={`order-status-badge ${statusCls}`}>● {form.status}</span>
                </div>
              </div>
            </div>

            <div className="od-divider" />

            {/* Line items */}
            <div className="od-section-label">Line items</div>

            <div className="od-items-wrap">
              <table className="od-items-table">
                <thead>
                  <tr>
                    <th>Item Number</th>
                    <th>Description <span className="od-req">*</span></th>
                    <th>Qty</th>
                    <th>UOM <span className="od-req">*</span></th>
                    <th>Price</th>
                    <th>Req. Ship Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.lineItems.map((li, i) => (
                    <tr key={i}>
                      <td>
                        <input className="od-cell" value={li.itemNumber} onChange={e => setLine(i, 'itemNumber', e.target.value)} placeholder="Item #" />
                      </td>
                      <td>
                        <input className={`od-cell od-cell-wide${!li.description ? ' od-empty' : ''}`} value={li.description} onChange={e => setLine(i, 'description', e.target.value)} placeholder="Required" />
                      </td>
                      <td>
                        <input className="od-cell od-cell-num" type="number" min="1" value={li.qty} onChange={e => setLine(i, 'qty', e.target.value)} />
                      </td>
                      <td>
                        <input className={`od-cell od-cell-sm${!li.uom ? ' od-empty' : ''}`} value={li.uom} onChange={e => setLine(i, 'uom', e.target.value)} placeholder="EA" />
                      </td>
                      <td>
                        <input className="od-cell od-cell-num" type="number" step="0.01" min="0" value={li.price} onChange={e => setLine(i, 'price', e.target.value)} />
                      </td>
                      <td>
                        <input className={`od-cell${!li.requestedShipDate ? ' od-empty' : ''}`} type="date" value={li.requestedShipDate} onChange={e => setLine(i, 'requestedShipDate', e.target.value)} />
                      </td>
                      <td>
                        <button type="button" className="od-del" onClick={() => removeLine(i)} title="Remove line">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} />
                    <td colSpan={2} className="od-total">
                      Total&nbsp;&nbsp;<strong>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>

              <button type="button" className="od-add-line" onClick={addLine}>
                + Add line item
              </button>
            </div>

            {/* Save bar */}
            <div className="od-save-bar">
              {saveMsg && (
                <span className={saveMsg.ok ? 'od-save-ok' : 'od-save-err'}>
                  {saveMsg.ok ? '✓' : '✗'} {saveMsg.text}
                </span>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="btn-outline" onClick={onBack}>Back</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save order'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
