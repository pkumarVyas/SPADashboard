import { useState, useEffect, useCallback, useRef } from 'react';
import { getSPAImports } from '../api/spaImportApi';
import SPAImportDetail from './SPAImportDetail';

const SPA_CODE_CLS = { PRPOC:'spa-code-prpoc', PRCLM:'spa-code-prclm', PPINF:'spa-code-ppinf', PEPOC:'spa-code-pepoc', PRINF:'spa-code-prinf' };

const ACCEPT = { Excel:'.xlsx,.xls', CSV:'.csv', PDF:'.pdf', EDI:'.edi,.txt,.x12' };

function ImportModal({ onClose }) {
  const [tab,          setTab]          = useState('Excel');
  const [dragOver,     setDragOver]     = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaded,     setUploaded]     = useState(false);
  const fileRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setSelectedFile(f);
  }
  function handleSelect(e) {
    const f = e.target.files[0];
    if (f) setSelectedFile(f);
  }
  function handleUpload() {
    if (!selectedFile) return;
    setUploaded(true);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="import-modal" onClick={e => e.stopPropagation()}>
        <div className="import-modal-hd">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#374151" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>Import New SPA</span>
          </div>
          <button className="import-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* File type tabs */}
        <div className="import-tabs">
          {Object.keys(ACCEPT).map(t => (
            <button key={t} className={`import-tab${tab === t ? ' active' : ''}`} onClick={() => { setTab(t); setSelectedFile(null); setUploaded(false); }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {t}
            </button>
          ))}
        </div>

        {/* Drop zone */}
        {!uploaded ? (
          <>
            <div
              className={`import-dropzone${dragOver ? ' drag-active' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="import-drop-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              {selectedFile ? (
                <div style={{ fontWeight:600, color:'#111827' }}>{selectedFile.name}</div>
              ) : (
                <>
                  <div className="import-drop-title">Drag and drop your file here</div>
                  <div className="import-drop-sub">or click to browse your files</div>
                </>
              )}
              <button className="import-browse-btn" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Browse Files
              </button>
            </div>
            <input ref={fileRef} type="file" style={{ display:'none' }} accept={ACCEPT[tab]} onChange={handleSelect} />
          </>
        ) : (
          <div className="import-success">
            <div className="import-success-icon">✓</div>
            <div style={{ fontWeight:600 }}>File received</div>
            <div style={{ fontSize:'0.82rem', color:'#6b7280', marginTop:4 }}>{selectedFile.name}</div>
            <div style={{ fontSize:'0.78rem', color:'#9ca3af', marginTop:8 }}>Processing pipeline coming soon — file has been selected.</div>
          </div>
        )}

        <div className="import-modal-ft">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          {!uploaded && (
            <button
              className="btn-primary"
              style={{ background: selectedFile ? '#1d4ed8' : '#9ca3af', cursor: selectedFile ? 'pointer' : 'not-allowed' }}
              disabled={!selectedFile}
              onClick={handleUpload}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) return <span style={{ color:'#d1d5db' }}>—</span>;
  const s = status.toLowerCase();
  const isGreen  = s.includes('submit') || s.includes('creat');
  const isRed    = s.includes('fail') || s.includes('review') || s.includes('need');
  const bg    = isGreen ? '#f0fdf4' : isRed ? '#fef2f2' : '#f3f4f6';
  const color = isGreen ? '#15803d' : isRed ? '#dc2626' : '#6b7280';
  const border = isGreen ? '#bbf7d0' : isRed ? '#fecaca' : '#e5e7eb';
  return (
    <span style={{ background:bg, color, border:`1px solid ${border}`, borderRadius:4, padding:'2px 9px', fontSize:'0.72rem', fontWeight:700 }}>
      {status}
    </span>
  );
}

const PRESET_LABELS = {
  all:     null,
  today:   'Imported Today',
  success: 'Successfully Imported',
  review:  'Needs Review',
};

export default function SPAImports({ onNavigate, preset = 'all' }) {
  const [items,          setItems]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [search,         setSearch]         = useState('');
  const [codeFilter,     setCodeFilter]     = useState('all');
  const [selected,       setSelected]       = useState(null);
  const [showImport,     setShowImport]     = useState(false);
  const [activePreset,   setActivePreset]   = useState(preset);

  // Sync when preset prop changes (e.g. navigating from Dashboard)
  useEffect(() => { setActivePreset(preset); }, [preset]);

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
    return <SPAImportDetail doc={selected} onBack={() => setSelected(null)} onUpdate={handleUpdate} />;
  }

  const today = new Date().toDateString();
  const uniqueCodes = ['all', ...Array.from(new Set(items.map(i => i.spaCode).filter(Boolean))).sort()];
  const q = search.toLowerCase();
  const filtered = items
    .filter(i => {
      if (activePreset === 'today')   return i.createdOn && new Date(i.createdOn).toDateString() === today;
      if (activePreset === 'success') return (i.creationStatus ?? '').toLowerCase().includes('submit');
      if (activePreset === 'review') {
        const s = (i.creationStatus ?? '').toLowerCase();
        return !s || s.includes('pending') || s.includes('fail') || s.includes('review');
      }
      return true;
    })
    .filter(i => codeFilter === 'all' || i.spaCode === codeFilter)
    .filter(i => !q ||
      i.spaId.toLowerCase().includes(q) ||
      (i.description ?? '').toLowerCase().includes(q) ||
      (i.vendorId ?? '').toLowerCase().includes(q) ||
      (i.spaCode ?? '').toLowerCase().includes(q)
    );

  return (
    <>
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      <div className="page-hd">
        <div>
          <div className="page-hd-title">SPA Import</div>
          <div className="page-hd-sub">View and manage all imported SPA records</div>
        </div>
        <button className="btn-primary" style={{ background:'#1d4ed8', display:'flex', alignItems:'center', gap:6, padding:'8px 16px' }}
                onClick={() => setShowImport(true)}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Import New SPA
        </button>
      </div>

      {/* Toolbar */}
      <div className="txn-toolbar">
        <div className="txn-search-wrap" style={{ flex:1 }}>
          <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}
               viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="txn-search-input" style={{ width:'100%' }} value={search}
                 onChange={e => setSearch(e.target.value)}
                 placeholder="Search by SPA ID, item, customer, or vendor approval…" />
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <select className="txn-status-select" value={codeFilter} onChange={e => setCodeFilter(e.target.value)}>
            {uniqueCodes.map(c => <option key={c} value={c}>{c === 'all' ? 'All Codes' : c}</option>)}
          </select>
        </div>
      </div>

      {/* Active preset filter banner */}
      {activePreset !== 'all' && (
        <div className="preset-banner">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filtered by: <strong>{PRESET_LABELS[activePreset]}</strong>
          <button className="preset-clear" onClick={() => setActivePreset('all')}>✕ Clear filter</button>
        </div>
      )}

      {loading && <div className="spa-loading" style={{ marginTop:20 }}><div className="spa-spinner"/>Loading SPA records…</div>}
      {error   && <div className="result error" style={{ marginTop:16 }}>✗ {error}</div>}

      {!loading && !error && (
        <div className="box" style={{ padding:0, overflow:'hidden', marginTop:16 }}>
          <div className="txn-table-head">
            <span style={{ fontWeight:600, fontSize:'0.9rem', color:'#111827' }}>SPA Records</span>
            <span className="txn-count-badge">{filtered.length} records</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>SPA ID</th>
                <th>SPA Code</th>
                <th>Item</th>
                <th>Vendor</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Vendor Approval ID</th>
                <th>Upload Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign:'center', color:'#9ca3af', padding:'40px 0' }}>No SPA records found.</td></tr>
              ) : filtered.map(item => (
                <tr key={item.id} className="si-row so-hdr-row" onClick={() => setSelected(item)}>
                  <td><span style={{ color:'#1d4ed8', fontWeight:500 }}>{item.spaId || <span className="od-missing-badge">Missing</span>}</span></td>
                  <td>
                    {item.spaCode
                      ? <span className={`spa-code-badge ${SPA_CODE_CLS[item.spaCode] ?? ''}`}>{item.spaCode}</span>
                      : <span style={{ color:'#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ fontSize:'0.83rem', color:'#374151', maxWidth:200 }}>
                    {item.description || <span style={{ color:'#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ fontSize:'0.83rem', color:'#374151' }}>
                    {item.vendorId || <span style={{ color:'#d1d5db' }}>—</span>}
                  </td>
                  <td className="si-cell-xs">{item.startDate || '—'}</td>
                  <td className="si-cell-xs">{item.endDate   || '—'}</td>
                  <td style={{ fontSize:'0.82rem' }}>{item.vendorApprovalId || '—'}</td>
                  <td className="si-cell-xs" style={{ color:'#9ca3af', fontSize:'0.75rem' }}>
                    {item.createdOn ? new Date(item.createdOn).toLocaleDateString() : '—'}
                  </td>
                  <td><StatusBadge status={item.creationStatus}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
