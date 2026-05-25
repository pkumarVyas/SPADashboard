import { useState } from 'react';
import { retroStats, retroOrders } from '../data/mockData';

function confClass(pct) {
  if (pct >= 90) return 'high';
  if (pct >= 70) return 'med';
  return 'low';
}

const FILTERS = [
  { label: 'All',          key: 'all'    },
  { label: 'Auto-match',   key: 'apply'  },
  { label: 'Needs review', key: 'review' },
];

export default function RetroLinks() {
  const [filter, setFilter] = useState('all');

  const visible = filter === 'all'
    ? retroOrders
    : retroOrders.filter(o => o.action === filter);

  return (
    <>
      <div className="section-head">
        <h2>Retroactive Linking</h2>
        <p>Orders eligible for an SPA where the SPA was created later, customer aliasing changed, or back-dated approval applies.</p>
      </div>

      <div className="section-actions">
        <button className="btn-sec">Bulk apply auto-match</button>
        <button className="btn-sec-dark">Run match engine</button>
      </div>

      <div className="stat-grid">
        {retroStats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-sub c-${s.color}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="sub-tabs">
        {FILTERS.map(f => {
          const count = f.key === 'all' ? retroOrders.length : retroOrders.filter(o => o.action === f.key).length;
          return (
            <button
              key={f.key}
              className={`sub-tab${filter === f.key ? ' active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label} {count}
            </button>
          );
        })}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>PO</th>
              <th>Customer</th>
              <th>Vendor</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Value</th>
              <th>Eligible SPA</th>
              <th>Reason</th>
              <th>Confidence</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(row => (
              <tr key={row.po}>
                <td><span className="po-id">{row.po}</span></td>
                <td>{row.customer}</td>
                <td>{row.vendor}</td>
                <td><span className="sku-text">{row.sku}</span></td>
                <td>{row.qty}</td>
                <td><strong>{row.value}</strong></td>
                <td><span className="spa-link">{row.spa}</span></td>
                <td><span className="reason-text">{row.reason}</span></td>
                <td>
                  <div className="conf-wrap">
                    <div className="conf-track">
                      <div className={`conf-fill ${confClass(row.confidence)}`} style={{ width: `${row.confidence}%` }} />
                    </div>
                    <span>{row.confidence}%</span>
                  </div>
                </td>
                <td>
                  <button className={`act-btn ${row.action === 'apply' ? 'act-apply' : 'act-review'}`}>
                    {row.action === 'apply' ? 'Apply' : 'Review'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
