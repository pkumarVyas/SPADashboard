import { useState, useEffect, useCallback, useRef } from 'react';
import { getSalesOrders } from '../api/salesOrderApi';
import SalesOrderDetail from './SalesOrderDetail';

const STATUS_TABS = [
  { key: 'all',        label: 'All'         },
  { key: 'Open order', label: 'Open'        },
  { key: 'Invoiced',   label: 'Invoiced'    },
  { key: 'Delivered',  label: 'Delivered'   },
  { key: 'Cancelled',  label: 'Cancelled'   },
];

function SortTh({ col, sort, onSort, align, children }) {
  const active = sort.col === col;
  return (
    <th onClick={() => onSort(col)} style={{ cursor: 'pointer', userSelect: 'none', textAlign: align, whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        <span style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1, opacity: active ? 1 : 0.3 }}>
          <span style={{ fontSize: '0.55rem', lineHeight: 1, color: active && sort.dir === 'asc'  ? '#2563eb' : 'inherit' }}>▲</span>
          <span style={{ fontSize: '0.55rem', lineHeight: 1, color: active && sort.dir === 'desc' ? '#2563eb' : 'inherit' }}>▼</span>
        </span>
      </span>
    </th>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Open order': { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' },
    'Invoiced':   { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    'Delivered':  { background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' },
    'Cancelled':  { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  };
  const s = styles[status] ?? { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' };
  return (
    <span style={{ ...s, borderRadius: 4, padding: '2px 7px', fontSize: '0.72rem', fontWeight: 600 }}>
      {status || '—'}
    </span>
  );
}

export default function SalesOrders() {
  const [headers,    setHeaders]    = useState([]);
  const [total,      setTotal]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState('');
  const [statusTab,  setStatusTab]  = useState('all');
  const [selectedSO, setSelectedSO] = useState(null);
  const [sort,       setSort]       = useState({ col: 'soId', dir: 'desc' });
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

  if (selectedSO) {
    return <SalesOrderDetail header={selectedSO} onBack={() => setSelectedSO(null)} />;
  }

  // Status tab filter only (search is now server-side)
  let filtered = statusTab !== 'all'
    ? headers.filter(h => h.status === statusTab)
    : headers;

  // Sort
  function handleSort(col) {
    setSort(s => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
  }
  const SORT_VAL = {
    soId:        h => h.soId,
    customer:    h => (h.customerName || h.customerAccount || '').toLowerCase(),
    status:      h => h.status || '',
    orderDate:   h => h.orderDate || '',
  };
  const fn     = SORT_VAL[sort.col] ?? (h => h.soId);
  const sorted = [...filtered].sort((a, b) => {
    const av = fn(a), bv = fn(b);
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  // Tab counts
  const tabCounts = STATUS_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'all' ? headers.length : headers.filter(h => h.status === t.key).length;
    return acc;
  }, {});

  return (
    <>
      <div className="si-page-head">
        <div>
          <h2 className="si-title">Sales Orders</h2>
          <p className="si-subtitle">
            Showing top {total ?? 100} records from D365 F&amp;O — search to find specific orders.
          </p>
        </div>
        <div className="si-head-actions">
          {!loading && <span className="si-badge" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>{filtered.length} shown</span>}
        </div>
      </div>

      <div className="spa-toolbar" style={{ alignItems: 'center' }}>
        <div className="order-search-wrap">
          <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
               viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Search SO number, customer… (hits D365)"
            style={{ width: 300 }}
          />
        </div>

        <div className="sub-tabs" style={{ marginBottom: 0 }}>
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              className={`sub-tab${statusTab === t.key ? ' active' : ''}`}
              onClick={() => setStatusTab(t.key)}
            >
              {t.label}
              {!loading && <span className="so-tab-count">{tabCounts[t.key]}</span>}
            </button>
          ))}
        </div>

        <button className="btn-outline" onClick={() => load(search)} style={{ marginLeft: 'auto' }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-5" />
          </svg>
          Refresh
        </button>
      </div>

      {loading && (
        <div className="spa-loading" style={{ marginTop: 20 }}>
          <div className="spa-spinner" /> Loading sales orders…
        </div>
      )}
      {error && <div className="result error" style={{ marginTop: 16 }}>✗ {error}</div>}

      {!loading && !error && (
        <div className="box" style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
          <table className="data-table so-table">
            <thead>
              <tr>
                <SortTh col="soId"      sort={sort} onSort={handleSort}>Sales Order</SortTh>
                <SortTh col="customer"  sort={sort} onSort={handleSort}>Customer</SortTh>
                <SortTh col="status"    sort={sort} onSort={handleSort}>Status</SortTh>
                <SortTh col="orderDate" sort={sort} onSort={handleSort}>Order Date</SortTh>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#9ca3af', padding: '36px 0' }}>
                    No sales orders found.
                  </td>
                </tr>
              ) : sorted.map(h => (
                <tr key={h.soId} className="so-row so-hdr-row" onClick={() => setSelectedSO(h)}>
                  <td>
                    <div className="so-so-cell">
                      <span className="so-id so-id-link">{h.soId}</span>
                      <span className="so-line">{h.companyId}</span>
                    </div>
                  </td>
                  <td>
                    <div className="so-cust-cell">
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{h.customerName || h.customerAccount}</span>
                      {h.customerName && <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{h.customerAccount}</span>}
                    </div>
                  </td>
                  <td><StatusBadge status={h.status} /></td>
                  <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                    {h.orderDate ? new Date(h.orderDate).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ textAlign: 'right', color: '#9ca3af', fontSize: '0.82rem' }}>›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
