import { useState, useEffect } from 'react';
import { getSPAAgreementLines } from '../api/spaAgreementApi';

const SPA_CODES    = ['PRPOC', 'PRCLM', 'PPINF', 'PEPOC', 'PRINF'];
const SPA_STATUSES = ['Draft', 'Open', 'Created', 'Active', 'Expired', 'Cancelled'];
const RSP_TYPES    = ['', 'New', 'Renewal', 'Amendment'];

function Field({ label, children }) {
  return (
    <div className="od-field">
      <label className="od-label">{label}</label>
      {children}
    </div>
  );
}

function ReadOnly({ value }) {
  return (
    <div className="od-readonly">
      {value || <span style={{ color: '#d1d5db' }}>—</span>}
    </div>
  );
}

function CheckCell({ value }) {
  return value
    ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
    : <span style={{ color: '#d1d5db' }}>□</span>;
}

export default function SPAAgreementDetail({ agreement, onBack }) {
  const [activeTab, setActiveTab] = useState('lines');
  const [lines,     setLines]     = useState([]);
  const [linesLoad, setLinesLoad] = useState(true);
  const [linesErr,  setLinesErr]  = useState(null);
  const [form,      setForm]      = useState({ ...agreement });

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  useEffect(() => {
    setLinesLoad(true);
    setLinesErr(null);
    getSPAAgreementLines(agreement.id)
      .then(res => setLines(res.value ?? []))
      .catch(e  => setLinesErr(e.message))
      .finally(() => setLinesLoad(false));
  }, [agreement.id]);

  return (
    <div className="spa-detail-wrapper">

      {/* ── Top bar ── */}
      <div className="od-topbar">
        <div className="od-topbar-left">
          <button className="od-back" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            SPA Agreements
          </button>
          <span className="od-topbar-sep" />
          <span className="od-topbar-title">
            {form.id} : {form.description} - {form.vendorId}
          </span>
          <span className={`spa-status-pill`} style={{ marginLeft: 8 }}>{form.status}</span>
        </div>
        <div className="od-topbar-right">
          <button className="btn-outline">SPA eligible invoices</button>
          <button className="btn-outline">Functions ▾</button>
          <button className="btn-outline">Inquiry ▾</button>
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="spa-subtabs">
        {['lines', 'header'].map(t => (
          <button
            key={t}
            className={`spa-subtab${activeTab === t ? ' active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ══════ LINES TAB ══════ */}
      {activeTab === 'lines' && (
        <div className="spa-lines-page">

          {/* ── SPA Agreement header summary ── */}
          <div className="spa-section-card">
            <div className="spa-section-title">SPA Agreement header</div>
            <div className="spa-header-grid">

              {/* Col 1 — Identity */}
              <div className="spa-col">
                <Field label="SPA Id"><ReadOnly value={form.id} /></Field>
                <Field label="SPA Agreement description">
                  <input className="od-input" value={form.description} onChange={e => set('description', e.target.value)} />
                </Field>
                <Field label="SPA code">
                  <select className="od-input" value={form.spaCode} onChange={e => set('spaCode', e.target.value)}>
                    {SPA_CODES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="SPA status">
                  <select className="od-input" value={form.status} onChange={e => set('status', e.target.value)}>
                    {SPA_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Vendor ID"><ReadOnly value={form.vendorId} /></Field>
              </div>

              {/* Col 2 — Settings */}
              <div className="spa-col">
                <Field label="Distributor Deal Id">
                  <input className="od-input" value={form.distributorDealId} onChange={e => set('distributorDealId', e.target.value)} />
                </Field>
                <Field label="Vendor Approval Id">
                  <input className="od-input" value={form.vendorApprovalId} onChange={e => set('vendorApprovalId', e.target.value)} />
                </Field>
                <Field label="Inactive (Stopped)">
                  <label className="spa-toggle">
                    <input type="checkbox" checked={form.inactive} onChange={e => set('inactive', e.target.checked)} />
                    <span className="spa-toggle-track" />
                    <span className="spa-toggle-label">{form.inactive ? 'Yes' : 'No'}</span>
                  </label>
                </Field>
                <Field label="System exchange rate">
                  <input className="od-input" type="number" step="0.01" value={form.systemExchangeRate} onChange={e => set('systemExchangeRate', e.target.value)} />
                </Field>
                <Field label="Claim currency"><ReadOnly value={form.claimCurrency} /></Field>
              </div>

              {/* Col 3 — SPA Reference */}
              <div className="spa-col">
                <div className="spa-col-header">SPA Reference</div>
                <Field label="Source SPA Id">
                  <input className="od-input" value={form.sourceSpaId} onChange={e => set('sourceSpaId', e.target.value)} />
                </Field>
                <Field label="Company ID"><ReadOnly value={form.companyId} /></Field>
                <Field label="Manufacturer">
                  <input className="od-input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
                </Field>
              </div>

              {/* Col 4 — Dates + RSP */}
              <div className="spa-col">
                <div className="spa-col-header">Dates</div>
                <Field label="Start date">
                  <input type="date" className="od-input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
                </Field>
                <Field label="End date">
                  <input type="date" className="od-input" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
                </Field>
                <div className="spa-col-header" style={{ marginTop: 14 }}>RSP</div>
                <Field label="RSP Type">
                  <select className="od-input" value={form.rspType} onChange={e => set('rspType', e.target.value)}>
                    {RSP_TYPES.map(r => <option key={r} value={r}>{r || '—'}</option>)}
                  </select>
                </Field>
                <Field label="RSP Id">
                  <input className="od-input" value={form.rspId} onChange={e => set('rspId', e.target.value)} />
                </Field>
                <Field label="RSP Company Id">
                  <input className="od-input" value={form.rspCompanyId} onChange={e => set('rspCompanyId', e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          {/* ── SPA Agreement lines ── */}
          <div className="spa-section-card">
            <div className="spa-section-title">
              SPA Agreement lines
              {!linesLoad && lines.length > 0 && (
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8, fontSize: '0.82rem' }}>
                  {lines.length} line{lines.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="spa-lines-toolbar">
              <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>+ Add line</button>
              <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>Remove</button>
              <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>SPA commission update ▾</button>
              <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>Link PO</button>
              <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>Functions ▾</button>
              <button className="btn-outline" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>Inquiry ▾</button>
            </div>

            {linesLoad ? (
              <div className="spa-loading" style={{ padding: '24px 0' }}>
                <div className="spa-spinner" /> Loading lines from Dataverse…
              </div>
            ) : linesErr ? (
              <div className="result error">{linesErr}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table spa-lines-tbl">
                  <thead>
                    <tr>
                      <th></th>
                      <th>#</th>
                      <th>SPA code</th>
                      <th>Product relation</th>
                      <th>Item / Group</th>
                      <th>UOM</th>
                      <th>Site</th>
                      <th style={{ textAlign: 'center' }}>Bundle</th>
                      <th>Customer relation</th>
                      <th style={{ textAlign: 'center' }}>Partial SPA</th>
                      <th>Customer</th>
                      <th>GAB ID</th>
                      <th style={{ textAlign: 'right' }}>Min qty</th>
                      <th style={{ textAlign: 'right' }}>Max qty</th>
                      <th>Cost type</th>
                      <th style={{ textAlign: 'right' }}>SPA cost</th>
                      <th style={{ textAlign: 'right' }}>Disc amt</th>
                      <th style={{ textAlign: 'right' }}>Disc %</th>
                      <th>Currency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={19} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px 0' }}>
                          No lines found for this SPA.
                        </td>
                      </tr>
                    ) : lines.map((ln, i) => (
                      <tr key={ln.id ?? i}>
                        <td><input type="checkbox" style={{ width: 14, height: 14 }} /></td>
                        <td style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{ln.lineNum}</td>
                        <td>
                          <span className={`spa-code-badge scode-${(ln.spaCode ?? '').toLowerCase()}`}>{ln.spaCode}</span>
                        </td>
                        <td style={{ fontSize: '0.82rem' }}>{ln.productRelation}</td>
                        <td className="sku-text">{ln.item}</td>
                        <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>{ln.uom}</td>
                        <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>{ln.siteId || '—'}</td>
                        <td style={{ textAlign: 'center' }}><CheckCell value={ln.bundle} /></td>
                        <td style={{ fontSize: '0.82rem' }}>{ln.customerRelation}</td>
                        <td style={{ textAlign: 'center' }}><CheckCell value={ln.partialSpa} /></td>
                        <td style={{ fontSize: '0.82rem' }}>{ln.customer}</td>
                        <td className="sku-text" style={{ fontSize: '0.75rem' }}>{ln.gabId || '—'}</td>
                        <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{ln.minQty}</td>
                        <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>{ln.maxQty}</td>
                        <td style={{ fontSize: '0.82rem', fontWeight: 600 }}>{ln.spaCostType}</td>
                        <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                          {(ln.spacost ?? 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                          {(ln.discountAmount ?? 0).toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '0.82rem' }}>
                          {(ln.discountPct ?? 0).toFixed(1)}%
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>{ln.claimCurrency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════ HEADER TAB ══════ */}
      {activeTab === 'header' && (
        <div className="spa-section-card" style={{ marginTop: 0 }}>
          <div className="spa-section-title">
            Full header — mserp_vysspaheaderdataentities (Dataverse)
          </div>
          <div className="spa-header-fullgrid">

            <div className="od-field-row od-3col">
              <Field label="SPA Id"><ReadOnly value={form.id} /></Field>
              <Field label="Company ID"><ReadOnly value={form.companyId} /></Field>
              <Field label="Vendor ID"><ReadOnly value={form.vendorId} /></Field>
            </div>

            <div className="od-field-row od-2col">
              <Field label="SPA Agreement description">
                <input className="od-input" value={form.description} onChange={e => set('description', e.target.value)} />
              </Field>
              <Field label="Distributor Deal Id">
                <input className="od-input" value={form.distributorDealId} onChange={e => set('distributorDealId', e.target.value)} />
              </Field>
            </div>

            <div className="od-field-row od-3col">
              <Field label="SPA code">
                <select className="od-input" value={form.spaCode} onChange={e => set('spaCode', e.target.value)}>
                  {SPA_CODES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="SPA status">
                <select className="od-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {SPA_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Vendor Approval Id">
                <input className="od-input" value={form.vendorApprovalId} onChange={e => set('vendorApprovalId', e.target.value)} />
              </Field>
            </div>

            <div className="od-field-row od-3col">
              <Field label="Start date">
                <input type="date" className="od-input" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
              </Field>
              <Field label="End date">
                <input type="date" className="od-input" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
              </Field>
              <Field label="Manufacturer">
                <input className="od-input" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} />
              </Field>
            </div>

            <div className="od-field-row od-3col">
              <Field label="Source SPA Id">
                <input className="od-input" value={form.sourceSpaId} onChange={e => set('sourceSpaId', e.target.value)} />
              </Field>
              <Field label="Claim currency"><ReadOnly value={form.claimCurrency} /></Field>
              <Field label="Currency code"><ReadOnly value={form.currencyCode} /></Field>
            </div>

            <div className="od-field-row od-3col">
              <Field label="RSP Type">
                <select className="od-input" value={form.rspType} onChange={e => set('rspType', e.target.value)}>
                  {RSP_TYPES.map(r => <option key={r} value={r}>{r || '—'}</option>)}
                </select>
              </Field>
              <Field label="RSP Id">
                <input className="od-input" value={form.rspId} onChange={e => set('rspId', e.target.value)} />
              </Field>
              <Field label="RSP Company Id">
                <input className="od-input" value={form.rspCompanyId} onChange={e => set('rspCompanyId', e.target.value)} />
              </Field>
            </div>

            <div className="od-field-row od-3col">
              <Field label="System exchange rate">
                <input className="od-input" type="number" step="0.01" value={form.systemExchangeRate} onChange={e => set('systemExchangeRate', e.target.value)} />
              </Field>
              <Field label="Inactive (Stopped)">
                <label className="spa-toggle">
                  <input type="checkbox" checked={form.inactive} onChange={e => set('inactive', e.target.checked)} />
                  <span className="spa-toggle-track" />
                  <span className="spa-toggle-label">{form.inactive ? 'Yes' : 'No'}</span>
                </label>
              </Field>
              <div />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
