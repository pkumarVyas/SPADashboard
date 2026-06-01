import { useState, useEffect, useCallback, useRef } from 'react';
import { getSPATransactions } from '../api/spaTransactionApi';

const STATUS_STYLE = {
  Linked:   { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  Invoiced: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Failed:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                   borderRadius: 4, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
      {status || '—'}
    </span>
  );
}

export default function SPATransactions({ onNavigate }) {
  const [rows,        setRows]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const debounceRef = useRef(null);

  const load = useCallback(async (q = '') => {
    setLoading(true); setError(null);
    try {
      const res = await getSPATransactions({ filter: q });
      setRows(res.value ?? []);
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

  const filtered = statusFilter !== 'all'
    ? rows.filter(r => r.status === statusFilter)
    : rows;

  // Generate display transaction ID (TXN-001 format) from index or use raw transId
  function txnLabel(row, idx) {
    if (row.transId && row.transId.trim()) return row.transId;
    return `TXN-${String(idx + 1).padStart(3, '0')}`;
  }

  return (
    <>
      <div className="page-hd">
        <div>
          <div className="page-hd-title">SPA Transactions</div>
          <div className="page-hd-sub">Track and manage all SPA transaction history</div>
        </div>
        <button className="btn-outline" onClick={() => load(search)}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <path d="M7 10l5 5 5-5"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      {/* Toolbar */}
      <div className="txn-toolbar">
        <div className="txn-search-wrap" style={{ flex: 1 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
               viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="txn-search-input" style={{ width: '100%' }}
                 value={search} onChange={handleSearch} placeholder="Search transactions…" />
        </div>
        <select className="txn-status-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="Linked">Linked</option>
          <option value="Invoiced">Invoiced</option>
          <option value="Failed">Failed</option>
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
                <th>Transaction ID</th>
                <th>SPA ID</th>
                <th>Sales Order ID</th>
                <th>Item</th>
                <th>Customer</th>
                <th>Vendor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>
                    No transactions found.
                    {rows.length === 0 && !search && (
                      <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#d1d5db' }}>
                        Check that the SPA journal and transaction tables have records for company {import.meta.env.VITE_COMPANY_ID || 'USMF'}.
                      </div>
                    )}
                  </td>
                </tr>
              ) : filtered.map((row, idx) => (
                <tr key={row.transId || idx} className="so-hdr-row">
                  <td style={{ fontWeight: 500, color: '#111827', fontSize: '0.84rem' }}>
                    {txnLabel(row, idx)}
                  </td>
                  <td style={{ color: '#6b7280', fontSize: '0.83rem' }}>
                    {row.spaId || <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td>
                    {row.salesOrderId
                      ? <span style={{ color: '#1d4ed8', fontWeight: 500, cursor: 'pointer' }}>{row.salesOrderId}</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                  <td style={{ fontSize: '0.83rem', color: '#374151' }}>
                    {row.item || <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '0.83rem', color: '#374151' }}>
                    {row.customer || <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '0.83rem', color: '#d97706' }}>
                    {row.vendor || <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td><StatusBadge status={row.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
