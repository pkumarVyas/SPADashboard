import { useState, useEffect } from 'react';
import { getSalesOrderLines } from '../api/salesOrderApi';

function ConfidenceBar({ value }) {
  const color = value >= 90 ? '#22c55e' : value >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <div className="conf-wrap">
      <div className="conf-track">
        <div className="conf-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color, minWidth: 34 }}>{value}%</span>
    </div>
  );
}

const LBL = ({ children }) => (
  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
    {children}
  </div>
);

export default function SalesOrderDetail({ header, onBack }) {
  const [lines,   setLines]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    getSalesOrderLines(header.soId, header.customerAccount)
      .then(res => { if (!cancelled) setLines(res.value ?? []); })
      .catch(e  => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [header.soId, header.customerAccount]);

  function handleApply(lineId) {
    setLines(prev => prev.map(l => l.id === lineId ? { ...l, applied: true } : l));
  }

  const autoCount     = lines.filter(l => l.matchType === 'auto').length;
  const reviewCount   = lines.filter(l => l.matchType === 'review').length;
  const eligibleValue = lines.filter(l => l.eligibleSpa).reduce((s, l) => s + (l.lineAmount ?? 0), 0);

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button className="btn-outline" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px' }}>
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Sales Orders
        </button>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>{header.soId}</span>
      </div>

      {/* Header card */}
      <div className="box" style={{ marginBottom: 14, padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px 24px' }}>
          <div>
            <LBL>Sales Order</LBL>
            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{header.soId}</div>
          </div>
          <div>
            <LBL>Customer</LBL>
            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{header.customerName || header.customerAccount}</div>
            {header.customerName && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{header.customerAccount}</div>}
          </div>
          <div>
            <LBL>Company</LBL>
            <div style={{ fontWeight: 500 }}>{header.companyId}</div>
          </div>
          <div>
            <LBL>Status</LBL>
            <div style={{ fontWeight: 500 }}>{header.status || '—'}</div>
          </div>
        </div>

        {!loading && (autoCount > 0 || reviewCount > 0 || eligibleValue > 0) && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {autoCount > 0 && (
              <span className="so-match-badge so-match-auto">{autoCount} auto-match</span>
            )}
            {reviewCount > 0 && (
              <span className="so-match-badge so-match-review">{reviewCount} needs review</span>
            )}
            {eligibleValue > 0 && (
              <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem', fontWeight: 600 }}>
                ${eligibleValue.toLocaleString()} eligible
              </span>
            )}
          </div>
        )}
      </div>

      {/* Lines */}
      {loading && (
        <div className="spa-loading"><div className="spa-spinner" /> Loading order lines…</div>
      )}
      {error && <div className="result error">✗ {error}</div>}

      {!loading && !error && (
        <div className="box" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table so-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Line</th>
                <th>Item</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>UOM</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th>Eligible SPA</th>
                <th>Reason</th>
                <th>Confidence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#9ca3af', padding: '36px 0' }}>
                    No lines found for this order.
                  </td>
                </tr>
              ) : lines.map(line => (
                <tr key={line.id ?? `${line.soId}-${line.lineNum}`} className={`so-row${line.applied ? ' so-applied' : ''}`}>
                  <td style={{ fontWeight: 600, fontSize: '0.82rem', color: '#6b7280' }}>{line.lineNum}</td>
                  <td><span className="sku-text">{line.item}</span></td>
                  <td style={{ fontSize: '0.8rem', color: '#374151', maxWidth: 200 }}>{line.itemDescription || line.description || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{(line.qty ?? 0).toLocaleString()}</td>
                  <td style={{ fontSize: '0.78rem', color: '#6b7280' }}>{line.uom}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    ${(line.lineAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td>
                    {line.eligibleSpa ? (
                      <div className="so-spa-cell">
                        <span className="spa-id-link" style={{ cursor: 'default' }}>{line.eligibleSpa}</span>
                        {line.spaDesc && <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{line.spaDesc}</span>}
                        {line.expiresInDays > 0 && line.expiresInDays <= 30 && (
                          <span className="so-expiry-warn">Expires in {line.expiresInDays}d</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#d1d5db', fontSize: '0.82rem' }}>No match</span>
                    )}
                  </td>
                  <td className="so-reason">{line.reason}</td>
                  <td>
                    {line.matchType !== 'none'
                      ? <ConfidenceBar value={line.confidence} />
                      : <span style={{ color: '#d1d5db', fontSize: '0.78rem' }}>—</span>
                    }
                  </td>
                  <td>
                    {line.applied
                      ? <span style={{ color: '#16a34a', fontSize: '0.78rem', fontWeight: 600 }}>✓ Applied</span>
                      : line.matchType === 'auto'
                        ? <button className="act-btn act-apply" onClick={() => handleApply(line.id)}>Apply</button>
                        : line.matchType === 'review'
                          ? <button className="act-btn act-review">Review</button>
                          : <span style={{ color: '#d1d5db', fontSize: '0.78rem' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
