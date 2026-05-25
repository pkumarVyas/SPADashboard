import { useState } from 'react';
import { orders } from '../../data/orderMockData';

const STATUS_CFG = {
  'Submitted': { cls: 'os-submitted', dot: '●' },
  'In Review': { cls: 'os-inreview',  dot: '●' },
  'Processed': { cls: 'os-processed', dot: '●' },
  'Archived':  { cls: 'os-archived',  dot: '●' },
  'Exception': { cls: 'os-exception', dot: '●' },
};

const SOURCE_CFG = {
  'Email':  { icon: '✉',  cls: 'src-email'  },
  'EDI':    { icon: '⇄',  cls: 'src-edi'    },
  'Portal': { icon: '⇌',  cls: 'src-portal' },
  'SFTP':   { icon: '📁', cls: 'src-sftp'   },
};

const FILTERS = [
  { key: 'all',        label: 'All'          },
  { key: 'Submitted',  label: 'Pending'      },
  { key: 'In Review',  label: 'In Review'    },
  { key: 'Processed',  label: 'Processed'    },
  { key: 'Exception',  label: 'Exceptions'   },
];

export default function OrderList({ onSelect }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const visible = orders.filter(o => {
    const matchFilter = filter === 'all' || o.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      o.poNumber.toLowerCase().includes(q) ||
      o.customerAccount.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const stats = [
    { label: 'Received today',  value: orders.length,                                         sub: 'All sources',    color: 'purple' },
    { label: 'Pending review',  value: orders.filter(o => o.status === 'Submitted').length,   sub: 'Awaiting action', color: 'orange' },
    { label: 'In review',       value: orders.filter(o => o.status === 'In Review').length,   sub: 'Being processed', color: 'purple' },
    { label: 'Exceptions',      value: orders.filter(o => o.status === 'Exception').length,   sub: 'Need attention',  color: 'red'    },
  ];

  return (
    <>
      <div className="section-head">
        <h2>Order Portal</h2>
        <p>Purchase orders received via email, EDI, portal, and SFTP — AI-extracted and ready for review.</p>
      </div>

      <div className="stat-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-sub c-${s.color}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="order-toolbar">
        <div className="sub-tabs" style={{ marginBottom: 0 }}>
          {FILTERS.map(f => {
            const count = f.key === 'all'
              ? orders.length
              : orders.filter(o => o.status === f.key).length;
            return (
              <button
                key={f.key}
                className={`sub-tab${filter === f.key ? ' active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}&nbsp;<span style={{ opacity: 0.7 }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div className="order-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search PO, customer, account…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Submitted</th>
              <th>Lines</th>
              <th>Total value</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                  No orders match the current filter.
                </td>
              </tr>
            )}
            {visible.map(o => {
              const { cls, dot } = STATUS_CFG[o.status] ?? STATUS_CFG['Submitted'];
              const { icon, cls: srcCls } = SOURCE_CFG[o.source] ?? SOURCE_CFG['Email'];
              const total = o.lineItems.reduce((s, li) => s + li.price * li.qty, 0);
              const missingFields = !o.customerName || !o.deliveryShipDate || !o.poType || o.lineItems.some(li => !li.description || !li.uom);

              return (
                <tr
                  key={o.id}
                  className="order-row"
                  onClick={() => onSelect(o.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className="po-id">{o.poNumber}</span>
                    {missingFields && <span className="od-missing-badge">Fields missing</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {o.customerName || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not extracted</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{o.customerAccount}</div>
                  </td>
                  <td>
                    <span className={`source-badge ${srcCls}`}>{icon} {o.source}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{o.submissionDate}</td>
                  <td style={{ textAlign: 'center' }}>{o.lineItems.length}</td>
                  <td><strong>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td>
                    <span className={`order-status-badge ${cls}`}>{dot} {o.status}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button
                      className="act-btn act-apply"
                      onClick={() => onSelect(o.id)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
