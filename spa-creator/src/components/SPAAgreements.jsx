import { useState, useEffect, useCallback, useRef } from 'react';
import { getSPAAgreements } from '../api/spaAgreementApi';
import SPAAgreementDetail   from './SPAAgreementDetail';

const SPA_CODES = ['All', 'PRPOC', 'PRCLM', 'PPINF', 'PEPOC', 'PRINF'];

export default function SPAAgreements() {
  const [items,      setItems]      = useState([]);
  const [total,      setTotal]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [search,     setSearch]     = useState('');
  const [codeFilter, setCodeFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const debounceRef = useRef(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSPAAgreements({ filter: q });
      setItems(res.value ?? []);
      setTotal(res.top ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = codeFilter === 'All'
    ? items
    : items.filter(a => a.spaCode === codeFilter);

  const selected = selectedId ? items.find(a => a.id === selectedId) : null;

  function handleSearch(e) {
    const q = e.target.value;
    setSearch(q);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(q), 400);
  }

  if (selected) {
    return (
      <SPAAgreementDetail
        agreement={selected}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <>
      {/* ── Page head ── */}
      <div className="si-page-head">
        <div>
          <h2 className="si-title">SPA Agreements</h2>
          <p className="si-subtitle">
            Showing top {total ?? 100} records from D365 F&amp;O — search to find specific agreements.
          </p>
        </div>
        <div className="si-head-actions">
          {!loading && (
            <span className="si-badge" style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>
              {filtered.length} shown
            </span>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="spa-toolbar">
        <div className="order-search-wrap">
          <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
               viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={handleSearch}
            placeholder="Filter by SPA ID, description, vendor…"
            style={{ width: 300 }}
          />
        </div>
        <div className="sub-tabs" style={{ marginBottom: 0 }}>
          {SPA_CODES.map(c => (
            <button
              key={c}
              className={`sub-tab${codeFilter === c ? ' active' : ''}`}
              onClick={() => setCodeFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <button className="btn-outline" onClick={() => load(search)} style={{ marginLeft: 'auto' }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-5" />
          </svg>
          Refresh
        </button>
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="spa-loading">
          <div className="spa-spinner" />
          Loading SPA agreements from Dataverse…
        </div>
      )}

      {error && (
        <div className="result error" style={{ marginTop: 16 }}>
          ✗ {error}
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && !error && (
        <div className="box" style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SPA Id</th>
                <th>SPA Code</th>
                <th>Description</th>
                <th>Status</th>
                <th>Vendor ID</th>
                <th>Vendor Approval ID</th>
                <th style={{ textAlign: 'center' }}>Inactive</th>
                <th>Start Date</th>
                <th>End Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px 0' }}>
                    No SPA agreements found.
                  </td>
                </tr>
              ) : filtered.map(a => (
                <tr key={a.id} className="si-row">
                  <td>
                    <button className="spa-id-link" onClick={() => setSelectedId(a.id)}>
                      {a.id}
                    </button>
                  </td>
                  <td>
                    <span className={`spa-code-badge scode-${a.spaCode.toLowerCase()}`}>{a.spaCode}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{a.description}</td>
                  <td>
                    <span className="spa-status-pill">{a.status}</span>
                  </td>
                  <td className="sku-text">{a.vendorId}</td>
                  <td style={{ fontSize: '0.82rem', color: '#6b7280' }}>{a.vendorApprovalId || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {a.inactive
                      ? <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      : null
                    }
                  </td>
                  <td className="si-cell-xs">{a.startDate}</td>
                  <td className="si-cell-xs">{a.endDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
