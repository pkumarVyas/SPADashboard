import { useState, useEffect, useCallback, useRef } from 'react';
import { getSalesOrders } from '../api/salesOrderApi';
import SalesOrderDetail from './SalesOrderDetail';

const STATUS_STYLE = {
  'Open order': { label: 'Open',     bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Invoiced':   { label: 'Invoiced', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Delivered':  { label: 'Linked',   bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Cancelled':  { label: 'Failed',   bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? { label: status || '—', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                   borderRadius: 4, padding: '2px 9px', fontSize: '0.72rem', fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

export default function SPATransactions({ onNavigate }) {
  const [headers,   setHeaders]   = useState([]);
  const [total,     setTotal]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [search,    setSearch]    = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [selected,  setSelected]  = useState(null);
  const debounceRef = useRef(null);

  const load = useCallback(async (q = '') => {
    setLoading(true); setError(null);
    try {
      const res = await getSalesOrders({ filter: q });
      setHeaders(res.value ?? []);
      setTotal(res.top ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e) {
    const q = e.target.value;
    setSearch(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q), 400);
  }

  if (selected) return <SalesOrderDetail header={selected} onBack={() => setSelected(null)} />;

  const uniqueStatuses = ['all', ...new Set(headers.map(h => h.status).filter(Boolean))];
  const filtered = statusTab !== 'all' ? headers.filter(h => h.status === statusTab) : headers;

  return (
    <>
      <div className="page-hd">
        <div>
          <div className="page-hd-title">SPA Transactions</div>
          <div className="page-hd-sub">Track and manage all SPA transaction history</div>
        </div>
        <button className="btn-outline" onClick={() => load(search)}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      {/* Toolbar */}
      <div className="txn-toolbar">
        <div className="txn-search-wrap">
          <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}
               viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="txn-search-input" value={search} onChange={handleSearch} placeholder="Search transactions…" />
        </div>
        <select className="txn-status-select" value={statusTab} onChange={e => setStatusTab(e.target.value)}>
          {uniqueStatuses.map(s => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Statuses' : (STATUS_STYLE[s]?.label ?? s)}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="spa-loading" style={{ marginTop: 20 }}><div className="spa-spinner"/>Loading transactions…</div>}
      {error   && <div className="result error" style={{ marginTop: 16 }}>✗ {error}</div>}

      {!loading && !error && (
        <div className="box" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
          <div className="txn-table-head">
            <span className="txn-table-icon">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>Transaction History</span>
            <span className="txn-count-badge">{filtered.length} records</span>
          </div>
          <table className="data-table txn-table">
            <thead>
              <tr>
                <th>Sales Order</th>
                <th>Customer</th>
                <th>Company</th>
                <th>Order Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign:'center', color:'#9ca3af', padding:'40px 0' }}>No transactions found.</td></tr>
              ) : filtered.map(h => (
                <tr key={h.soId} className="so-hdr-row" onClick={() => setSelected(h)}>
                  <td><span style={{ color:'#1d4ed8', fontWeight:500, cursor:'pointer' }}>{h.soId}</span></td>
                  <td>
                    <div style={{ fontSize:'0.85rem', fontWeight:500 }}>{h.customerName || h.customerAccount}</div>
                    {h.customerName && <div style={{ fontSize:'0.72rem', color:'#9ca3af' }}>{h.customerAccount}</div>}
                  </td>
                  <td style={{ fontSize:'0.82rem', color:'#6b7280' }}>{h.companyId || '—'}</td>
                  <td style={{ fontSize:'0.82rem', color:'#6b7280' }}>
                    {h.orderDate ? new Date(h.orderDate).toLocaleDateString() : '—'}
                  </td>
                  <td><StatusBadge status={h.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
