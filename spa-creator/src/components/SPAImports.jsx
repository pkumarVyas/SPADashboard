import { useState, useEffect, useCallback } from 'react';
import { getSPAImports } from '../api/spaImportApi';
import SPAImportDetail from './SPAImportDetail';

const SPA_CODE_CLS = {
  PRPOC: 'spa-code-prpoc',
  PRCLM: 'spa-code-prclm',
  PPINF: 'spa-code-ppinf',
  PEPOC: 'spa-code-pepoc',
  PRINF: 'spa-code-prinf',
};

export default function SPAImports({ onNewSPA }) {
  const [items,                setItems]                = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [error,                setError]                = useState(null);
  const [search,               setSearch]               = useState('');
  const [creationStatusFilter, setCreationStatusFilter] = useState('all');
  const [selected,             setSelected]             = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await getSPAImports({ filter: '' });
      setItems(res.value ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(updated) {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelected(updated);
  }

  if (selected) {
    return (
      <SPAImportDetail
        doc={selected}
        onBack={() => setSelected(null)}
        onUpdate={handleUpdate}
      />
    );
  }

  // Derive unique CreationStatus values from loaded records for the dropdown
  const creationStatusOptions = ['all', ...Array.from(
    new Set(items.map(i => i.creationStatus).filter(Boolean))
  ).sort()];

  // Filter
  const q = search.toLowerCase();
  let filtered = items;
  if (q) {
    filtered = filtered.filter(i =>
      i.spaId.toLowerCase().includes(q)       ||
      i.description.toLowerCase().includes(q) ||
      i.vendorId.toLowerCase().includes(q)    ||
      i.spaCode.toLowerCase().includes(q)
    );
  }
  if (creationStatusFilter !== 'all') {
    filtered = filtered.filter(i => i.creationStatus === creationStatusFilter);
  }


  return (
    <>
      <div className="si-page-head">
        <div>
          <h2 className="si-title">SPA Imports</h2>
          <p className="si-subtitle">
            SPA templates extracted by Power Automate and stored in Dataverse — awaiting review and approval.
          </p>
        </div>
        <div className="si-head-actions" />
      </div>

      {/* Toolbar */}
      <div className="spa-toolbar" style={{ alignItems: 'center' }}>
        <div className="order-search-wrap">
          <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
               viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by SPA ID, vendor, code…"
            style={{ width: 270 }}
          />
        </div>

        {/* Creation Status filter */}
        <div className="si-cs-filter">
          <label className="si-cs-label">Creation Status</label>
          <select
            className="si-cs-select"
            value={creationStatusFilter}
            onChange={e => setCreationStatusFilter(e.target.value)}
          >
            {creationStatusOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All statuses' : opt}
              </option>
            ))}
          </select>
        </div>

        <button className="btn-outline" onClick={load} style={{ marginLeft: 'auto' }}>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-5" />
          </svg>
          Refresh
        </button>
      </div>

      {loading && (
        <div className="spa-loading" style={{ marginTop: 20 }}>
          <div className="spa-spinner" /> Loading SPA imports…
        </div>
      )}
      {error && <div className="result error" style={{ marginTop: 16 }}>✗ {error}</div>}

      {!loading && !error && (
        <div className="box" style={{ padding: 0, overflow: 'hidden', marginTop: 14 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SPA ID</th>
                <th>Description</th>
                <th>SPA Code</th>
                <th>Vendor</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Imported</th>
                <th>Creation Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: '#9ca3af', padding: '36px 0' }}>
                    No SPA imports found.
                  </td>
                </tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="si-row so-hdr-row" onClick={() => setSelected(item)}>
                  <td>
                    <span className="so-id so-id-link">{item.spaId || <span className="od-missing-badge">Missing</span>}</span>
                  </td>
                  <td style={{ fontSize: '0.83rem', color: '#374151', maxWidth: 220 }}>
                    {item.description || <span style={{ color: '#d1d5db' }}>—</span>}
                  </td>
                  <td>
                    {item.spaCode
                      ? <span className={`spa-code-badge ${SPA_CODE_CLS[item.spaCode] ?? ''}`}>{item.spaCode}</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                  <td className="si-cell-sm">{item.vendorId || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                  <td className="si-cell-xs">{item.startDate || '—'}</td>
                  <td className="si-cell-xs">{item.endDate   || '—'}</td>
                  <td className="si-cell-xs" style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                    {item.createdOn ? new Date(item.createdOn).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    {item.creationStatus
                      ? <span className="si-cs-pill">{item.creationStatus}</span>
                      : <span style={{ color: '#d1d5db' }}>—</span>
                    }
                  </td>
                  <td>
                    <button
                      className="act-btn act-apply"
                      onClick={e => { e.stopPropagation(); setSelected(item); }}
                    >
                      Review →
                    </button>
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
