import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { getSPAImportLines, submitSPAToD365 } from '../api/spaImportApi';

const TEMPLATE_URL = import.meta.env.VITE_SPA_TEMPLATE_URL;

const EXT_MAP = {
  'application/pdf':                                                            { ext: '.pdf',  label: 'PDF'   },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':         { ext: '.xlsx', label: 'Excel' },
  'application/vnd.ms-excel':                                                   { ext: '.xls',  label: 'Excel' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':   { ext: '.docx', label: 'Word'  },
  'application/msword':                                                          { ext: '.doc',  label: 'Word'  },
  'text/plain':                                                                  { ext: '.txt',  label: 'Text'  },
  'text/csv':                                                                    { ext: '.csv',  label: 'CSV'   },
};

function getFileMeta(contentType) {
  const base = (contentType ?? '').split(';')[0].trim().toLowerCase();
  return EXT_MAP[base] ?? { ext: '', label: 'File' };
}

async function detectByMagicBytes(blob) {
  try {
    const buf   = await blob.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buf);
    // PDF: %PDF
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)
      return 'application/pdf';
    // OLE2 compound doc: old XLS / DOC (D0 CF 11 E0)
    if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0)
      return 'application/vnd.ms-excel';
    // ZIP container: XLSX, DOCX, PPTX all start with PK (50 4B)
    if (bytes[0] === 0x50 && bytes[1] === 0x4B)
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  } catch { /* ignore */ }
  return null;
}

const STATUS_META = {
  'Pending Review': { cls: 'si-pending',   bg: '#fef3c7', fg: '#92400e', dot: '#f59e0b' },
  'Extracted':      { cls: 'si-extracted', bg: '#eff6ff', fg: '#1d4ed8', dot: '#3b82f6' },
  'Approved':       { cls: 'si-approved',  bg: '#dcfce7', fg: '#15803d', dot: '#22c55e' },
  'Exception':      { cls: 'si-exception', bg: '#fef2f2', fg: '#dc2626', dot: '#ef4444' },
};

const SPA_CODE_COLORS = {
  PRPOC: { bg: '#ede9fe', fg: '#5b21b6' },
  PRCLM: { bg: '#dbeafe', fg: '#1e40af' },
  PPINF: { bg: '#fce7f3', fg: '#9d174d' },
  PEPOC: { bg: '#d1fae5', fg: '#065f46' },
  PRINF: { bg: '#ffedd5', fg: '#9a3412' },
};

function FieldCard({ label, value, mono, span }) {
  return (
    <div className="spi-field-card" style={span ? { gridColumn: `span ${span}` } : {}}>
      <div className="spi-field-label">{label}</div>
      <div className={`spi-field-value${mono ? ' spi-mono' : ''}`}>
        {value || <span className="spi-field-empty">—</span>}
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, type = 'text', span, mono, readOnly, placeholder, hint }) {
  return (
    <div className="spi-field-card" style={span ? { gridColumn: `span ${span}` } : {}}>
      <div className="spi-field-label">{label}</div>
      {readOnly
        ? <div className={`spi-field-value${mono ? ' spi-mono' : ''}`}>{value || <span className="spi-field-empty">—</span>}</div>
        : <>
            <input
              type={type}
              value={value ?? ''}
              placeholder={placeholder}
              onChange={e => onChange(e.target.value)}
              className={`spi-edit-input${mono ? ' spi-mono' : ''}`}
            />
            {hint && <div className="spi-field-hint">{hint}</div>}
          </>
      }
    </div>
  );
}

export default function SPAImportDetail({ doc, onBack, onUpdate }) {
  const [lines,     setLines]     = useState([]);
  const [linesLoad, setLinesLoad] = useState(true);
  const [linesErr,  setLinesErr]  = useState(null);
  const [status,    setStatus]    = useState(doc.status);
  const [saveMsg,   setSaveMsg]   = useState(null);
  const [zoom,        setZoom]        = useState(1);
  const [editMode,    setEditMode]    = useState(false);
  const [editHeader,  setEditHeader]  = useState({});
  const [editLines,   setEditLines]   = useState([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitResult,setSubmitResult]= useState(null);
  const [file, setFile] = useState({
    loading: !!TEMPLATE_URL,
    objectUrl:   null,  // used for PDF iframe + download
    htmlContent: null,  // rendered HTML for Excel / Word
    textContent: null,  // plain text for TXT / CSV
    sheets:      [],    // Excel sheet names
    activeSheet: 0,     // Excel active sheet index
    contentType: null,
    error:       null,
  });

  const EXT_TO_MIME = {
    '.pdf':  'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls':  'application/vnd.ms-excel',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc':  'application/msword',
    '.txt':  'text/plain',
    '.csv':  'text/csv',
  };
  function mimeFromFilename(filename) {
    const m = (filename ?? '').match(/\.([a-z0-9]+)$/i);
    return m ? (EXT_TO_MIME[`.${m[1].toLowerCase()}`] ?? null) : null;
  }

  // Reset zoom when switching documents
  useEffect(() => { setZoom(1); }, [doc.id]);

  // Fetch template and render according to file type
  useEffect(() => {
    if (!TEMPLATE_URL || !doc.id) return;
    let objectUrl = null;
    setFile({ loading: true, objectUrl: null, htmlContent: null, textContent: null, sheets: [], activeSheet: 0, contentType: null, error: null });

    fetch(`${TEMPLATE_URL}?id=${doc.id}`)
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let contentType = (res.headers.get('Content-Type') || 'application/octet-stream').split(';')[0].trim().toLowerCase();
        let blob = await res.blob();

        // Resolve content type: filename field → magic bytes → server header
        const fromFilename = mimeFromFilename(doc.templateFilename);
        if (fromFilename) {
          contentType = fromFilename;
        } else if (!EXT_MAP[contentType]) {
          const detected = await detectByMagicBytes(blob);
          if (detected) contentType = detected;
        }

        const arrayBuffer = await blob.arrayBuffer();

        // PDF — blob URL for iframe
        if (contentType === 'application/pdf') {
          const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
          objectUrl = URL.createObjectURL(pdfBlob);
          setFile({ loading: false, objectUrl, htmlContent: null, textContent: null, sheets: [], activeSheet: 0, contentType, error: null });
          return;
        }

        // Excel (XLSX / XLS) — SheetJS → HTML table per sheet
        if (contentType.includes('spreadsheet') || contentType.includes('excel') || contentType === 'text/csv') {
          const wb     = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
          const sheets = wb.SheetNames;
          const htmlSheets = sheets.map(name => XLSX.utils.sheet_to_html(wb.Sheets[name], { header: '' }));
          // blob URL so download works
          objectUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: contentType }));
          setFile({ loading: false, objectUrl, htmlContent: htmlSheets, textContent: null, sheets, activeSheet: 0, contentType, error: null });
          return;
        }

        // Word (DOCX / DOC) — Mammoth → HTML
        if (contentType.includes('wordprocessingml') || contentType.includes('msword')) {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          objectUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: contentType }));
          setFile({ loading: false, objectUrl, htmlContent: [result.value], textContent: null, sheets: ['Document'], activeSheet: 0, contentType, error: null });
          return;
        }

        // Plain text / CSV
        if (contentType.startsWith('text/')) {
          const text = new TextDecoder().decode(arrayBuffer);
          objectUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: contentType }));
          setFile({ loading: false, objectUrl, htmlContent: null, textContent: text, sheets: [], activeSheet: 0, contentType, error: null });
          return;
        }

        // Unknown — just offer download
        objectUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: contentType }));
        setFile({ loading: false, objectUrl, htmlContent: null, textContent: null, sheets: [], activeSheet: 0, contentType, error: null });
      })
      .catch(e => setFile({ loading: false, objectUrl: null, htmlContent: null, textContent: null, sheets: [], activeSheet: 0, contentType: null, error: e.message }));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [doc.id]);

  useEffect(() => {
    let cancelled = false;
    setLinesLoad(true); setLinesErr(null);
    getSPAImportLines(doc.spaId)
      .then(res => { if (!cancelled) setLines(res.value ?? []); })
      .catch(e  => { if (!cancelled) setLinesErr(e.message); })
      .finally(() => { if (!cancelled) setLinesLoad(false); });
    return () => { cancelled = true; };
  }, [doc.spaId]);

  const sm       = STATUS_META[status] ?? STATUS_META['Pending Review'];
  const cc       = SPA_CODE_COLORS[doc.spaCode] ?? { bg: '#f3f4f6', fg: '#374151' };
  const fileMeta = getFileMeta(file.contentType);
  const isPdf    = file.contentType?.includes('pdf');
  const isExcel  = file.contentType?.includes('spreadsheet') || file.contentType?.includes('excel') || file.contentType === 'text/csv';
  const isWord   = file.contentType?.includes('wordprocessingml') || file.contentType?.includes('msword');
  const isText   = !isPdf && !isExcel && !isWord && file.textContent != null;
  const isHtml   = (isExcel || isWord) && Array.isArray(file.htmlContent);

  function handleDownload() {
    if (!file.objectUrl) return;
    const a = document.createElement('a');
    a.href     = file.objectUrl;
    a.download = doc.templateFilename || `${doc.spaId}${fileMeta.ext}`;
    a.click();
  }

  const zoomIn    = () => setZoom(z => Math.min(3,   +(z + 0.25).toFixed(2)));
  const zoomOut   = () => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)));
  const zoomReset = () => setZoom(1);
  const hasFile   = !file.loading && (file.objectUrl || isHtml || file.textContent);

  function enterEdit() {
    setEditHeader({
      spaId:            doc.spaId,
      spaCode:          doc.spaCode,
      description:      doc.description,
      vendorId:         doc.vendorId,
      vendorApprovalId: doc.vendorApprovalId,
      startDate:        doc.startDate,
      endDate:          doc.endDate,
    });
    setEditLines(lines.map(l => ({ ...l })));
    setSubmitResult(null);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setSubmitResult(null);
  }

  function setLineField(i, field, value) {
    setEditLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleSubmit() {
    if (!editHeader.vendorId) { setSubmitResult({ ok: false, text: 'Vendor ID is required.' }); return; }
    if (!editHeader.startDate || !editHeader.endDate) { setSubmitResult({ ok: false, text: 'Start Date and End Date are required.' }); return; }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const result = await submitSPAToD365(editHeader, editLines, doc.id);
      if (result.success) {
        // Merge all edited header values into the doc so the list row stays in sync
        const updatedDoc = {
          ...doc,
          spaId:           result.assignedSpaId || editHeader.spaId,
          spaCode:         editHeader.spaCode,
          description:     editHeader.description,
          vendorId:        editHeader.vendorId,
          vendorApprovalId:editHeader.vendorApprovalId,
          startDate:       editHeader.startDate,
          endDate:         editHeader.endDate,
          status:          'Approved',
        };
        setStatus('Approved');
        onUpdate?.(updatedDoc);
        setEditMode(false);
        const spaRef = result.assignedSpaId ? ` as SPA ${result.assignedSpaId}` : '';
        const msg = result.warning
          ? `Submitted${spaRef} with warnings: ${result.warning}`
          : `SPA${spaRef} submitted to D365 F&O and Dataverse record updated.`;
        setSaveMsg({ ok: !result.warning, text: msg });
      } else {
        setSubmitResult({ ok: false, text: result.error ?? 'Submission failed.' });
      }
    } catch (e) {
      setSubmitResult({ ok: false, text: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  function handleApprove() {
    const updated = { ...doc, status: 'Approved' };
    setStatus('Approved');
    setSaveMsg({ ok: true, text: 'SPA approved and published to repository.' });
    onUpdate?.(updated);
  }

  function handleFlagException() {
    const updated = { ...doc, status: 'Exception' };
    setStatus('Exception');
    setSaveMsg({ ok: false, text: 'Flagged as exception — routed to manual review queue.' });
    onUpdate?.(updated);
  }

  return (
    <div className="od-wrapper">

      {/* ── Top bar ── */}
      <div className="od-topbar">
        <div className="od-topbar-left">
          <button className="od-back" onClick={onBack}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            SPA Imports
          </button>
          <span className="od-topbar-sep" />
          <span className="od-topbar-title">{doc.spaId}</span>
          <span className="spi-topbar-status" style={{ background: sm.bg, color: sm.fg }}>
            <span style={{ background: sm.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
            {status}
          </span>
        </div>
        <div className="od-topbar-right">
          {editMode ? (
            <>
              <button className="btn-outline" onClick={cancelEdit} disabled={submitting}>Cancel</button>
              <button className="btn-d365" onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? <><span className="btn-spinner" /> Submitting…</>
                  : <>▶ Submit to D365</>
                }
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-outline"
                onClick={enterEdit}
                disabled={linesLoad || status === 'Approved'}
                title={status === 'Approved' ? 'Already submitted' : 'Edit and submit to D365 F&O'}
              >
                ✎ Edit &amp; Submit
              </button>
              <button
                className="btn-outline"
                onClick={handleFlagException}
                disabled={status === 'Exception' || status === 'Approved'}
              >
                Flag Exception
              </button>
              <button
                className="btn-primary"
                onClick={handleApprove}
                disabled={status === 'Approved'}
              >
                {status === 'Approved' ? '✓ Approved' : 'Approve SPA'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Split pane ── */}
      <div className="od-split">

        {/* ── Left: file viewer ── */}
        <div className="od-pdf-panel">
          <div className="pdf-toolbar">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span style={{ fontSize: '0.73rem', color: '#d1d5db', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.templateFilename || doc.spaId + fileMeta.ext}
            </span>
            {file.contentType && (
              <span style={{ fontSize: '0.65rem', background: '#374151', color: '#9ca3af', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                {fileMeta.label}
              </span>
            )}
            {hasFile && (
              <>
                <button className="pdf-btn fv-zoom-btn" title="Zoom out" onClick={zoomOut} disabled={zoom <= 0.5}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </button>
                <span className="fv-zoom-label" title="Reset zoom" onClick={zoomReset}>
                  {Math.round(zoom * 100)}%
                </span>
                <button className="pdf-btn fv-zoom-btn" title="Zoom in" onClick={zoomIn} disabled={zoom >= 3}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </button>
              </>
            )}
            {file.objectUrl && (
              <button className="pdf-btn" title={`Download ${fileMeta.label}`} onClick={handleDownload}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            )}
          </div>

          <div className="pdf-body" style={{ background: isPdf ? '#525659' : '#ffffff' }}>

            {/* Loading */}
            {file.loading && (
              <div className="pdf-placeholder" style={{ background: '#525659' }}>
                <div className="spa-spinner" style={{ borderTopColor: '#9ca3af' }} />
                <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Loading file…</div>
              </div>
            )}

            {/* PDF — inline iframe */}
            {/* PDF — scale wrapper so zoom affects visible area */}
            {!file.loading && isPdf && file.objectUrl && (
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
                <iframe
                  src={file.objectUrl}
                  title="SPA Template"
                  style={{
                    border: 'none', display: 'block',
                    width:  `${100 / zoom}%`,
                    height: `${100 / zoom}%`,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            )}

            {/* Excel / Word — rendered HTML with optional sheet tabs */}
            {!file.loading && isHtml && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {file.sheets.length > 1 && (
                  <div className="fv-sheet-tabs">
                    {file.sheets.map((name, i) => (
                      <button
                        key={name}
                        className={`fv-sheet-tab${file.activeSheet === i ? ' fv-sheet-tab-active' : ''}`}
                        onClick={() => setFile(f => ({ ...f, activeSheet: i }))}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
                <div
                  className="fv-html-body"
                  style={{ zoom }}
                  dangerouslySetInnerHTML={{ __html: file.htmlContent[file.activeSheet] ?? '' }}
                />
              </div>
            )}

            {/* Plain text / CSV */}
            {!file.loading && isText && (
              <pre className="fv-text-body" style={{ fontSize: `${zoom * 0.78}rem` }}>{file.textContent}</pre>
            )}

            {/* Unknown type — download only */}
            {!file.loading && file.objectUrl && !isPdf && !isHtml && !isText && (
              <div className="pdf-placeholder" style={{ background: '#525659' }}>
                <div style={{ fontSize: 48, lineHeight: 1 }}>📎</div>
                <div style={{ fontSize: '0.85rem', color: '#e5e7eb', fontWeight: 600 }}>
                  {doc.templateFilename || doc.spaId + fileMeta.ext}
                </div>
                <div style={{ fontSize: '0.73rem', color: '#9ca3af' }}>This file type cannot be previewed</div>
                <button className="act-btn act-apply" onClick={handleDownload} style={{ marginTop: 8 }}>
                  Download {fileMeta.label}
                </button>
              </div>
            )}

            {/* Error / no file */}
            {!file.loading && (file.error || (!file.objectUrl && !isHtml && !isText)) && (
              <div className="pdf-placeholder" style={{ background: '#525659' }}>
                <svg viewBox="0 0 64 80" width="48" height="60" fill="none">
                  <rect x="1" y="1" width="62" height="78" rx="4" fill="#374151" stroke="#4b5563" strokeWidth="1.5" />
                  <path d="M40 1v14h14" stroke="#4b5563" strokeWidth="1.5" />
                  <rect x="10" y="28" width="44" height="3" rx="1.5" fill="#4b5563" />
                  <rect x="10" y="36" width="36" height="3" rx="1.5" fill="#4b5563" />
                  <rect x="10" y="44" width="40" height="3" rx="1.5" fill="#4b5563" />
                </svg>
                <div style={{ fontSize: '0.82rem', color: '#9ca3af', textAlign: 'center' }}>
                  {file.error ?? 'No template attached'}
                </div>
              </div>
            )}
          </div>

          <div className="pdf-footer">
            <span className="pdf-doc-id">
              {doc.id.slice(0, 8)}… · {doc.createdOn ? new Date(doc.createdOn).toLocaleString() : ''}
            </span>
          </div>
        </div>

        {/* ── Right: extracted data ── */}
        <div className="od-form-panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* Banner */}
          <div className="spi-banner">
            <div className="spi-banner-top">
              <div>
                <div className="spi-banner-id">{doc.spaId}</div>
                <div className="spi-banner-desc">{doc.description || 'No description'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span className="spi-code-pill" style={{ background: cc.bg, color: cc.fg }}>{doc.spaCode || '—'}</span>
                <span className="spi-topbar-status" style={{ background: sm.bg, color: sm.fg }}>
                  <span style={{ background: sm.dot, width: 6, height: 6, borderRadius: '50%', display: 'inline-block' }} />
                  {status}
                </span>
              </div>
            </div>
            <div className="spi-banner-meta">
              <span>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                </svg>
                Vendor {doc.vendorId || '—'}
              </span>
              <span>
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {doc.startDate || '—'} → {doc.endDate || '—'}
              </span>
              {doc.templateName && (
                <span>
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                  {doc.templateName}
                </span>
              )}
            </div>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 0' }}>

            {saveMsg && (
              <div className={`result ${saveMsg.ok ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
                {saveMsg.ok ? '✓' : '✗'} {saveMsg.text}
              </div>
            )}

            {/* Header section */}
            <div className="spi-section-head">
              <div className="spi-section-icon">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              Header
            </div>

            <div className="spi-fields-grid">
              {editMode ? (
                <>
                  <EditField label="SPA ID" value={editHeader.spaId} mono onChange={v => setEditHeader(h => ({ ...h, spaId: v }))} placeholder="(auto-generate)" hint="Leave blank to use D365 number sequence" />
                  <EditField label="SPA Code"           value={editHeader.spaCode}           mono onChange={v => setEditHeader(h => ({ ...h, spaCode: v }))} />
                  <EditField label="Description"        value={editHeader.description}        span={2} onChange={v => setEditHeader(h => ({ ...h, description: v }))} />
                  <EditField label="Vendor ID"          value={editHeader.vendorId}          mono onChange={v => setEditHeader(h => ({ ...h, vendorId: v }))} />
                  <EditField label="Vendor Approval ID" value={editHeader.vendorApprovalId}  mono onChange={v => setEditHeader(h => ({ ...h, vendorApprovalId: v }))} />
                  <EditField label="Start Date"         value={editHeader.startDate}         type="date" onChange={v => setEditHeader(h => ({ ...h, startDate: v }))} />
                  <EditField label="End Date"           value={editHeader.endDate}           type="date" onChange={v => setEditHeader(h => ({ ...h, endDate: v }))} />
                </>
              ) : (
                <>
                  <FieldCard label="SPA ID"             value={doc.spaId}            mono />
                  <FieldCard label="SPA Code"           value={doc.spaCode}          mono />
                  <FieldCard label="Description"        value={doc.description}       span={2} />
                  <FieldCard label="Vendor ID"          value={doc.vendorId}          mono />
                  <FieldCard label="Vendor Approval ID" value={doc.vendorApprovalId}  mono />
                  <FieldCard label="Start Date"         value={doc.startDate} />
                  <FieldCard label="End Date"           value={doc.endDate} />
                </>
              )}
            </div>

            {/* Agreement Lines section */}
            <div className="spi-section-head" style={{ marginTop: 20 }}>
              <div className="spi-section-icon">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </div>
              Agreement Lines
              {!linesLoad && <span className="spi-count-pill">{lines.length}</span>}
            </div>

            {submitResult && (
              <div className={`result ${submitResult.ok ? 'success' : 'error'}`} style={{ margin: '8px 0' }}>
                {submitResult.ok ? '✓' : '✗'} {submitResult.text}
              </div>
            )}

            {linesLoad && (
              <div className="spa-loading" style={{ margin: '12px 0' }}>
                <div className="spa-spinner" /> Loading lines…
              </div>
            )}
            {linesErr && <div className="result error">{linesErr}</div>}

            {!linesLoad && !linesErr && (editMode ? editLines : lines).length === 0 && (
              <div className="si-no-lines">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>No agreement lines found for this SPA.</span>
              </div>
            )}

            {!linesLoad && !linesErr && (editMode ? editLines : lines).length > 0 && (
              <div className="od-items-wrap spi-lines-wrap">
                <table className="spi-lines-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item ID {editMode && <span className="edit-col-hint">editable</span>}</th>
                      <th>Customer</th>
                      <th>Cost Type</th>
                      <th>SPA Cost</th>
                      <th>Disc %</th>
                      <th>Disc Amt</th>
                      <th>Min Qty</th>
                      <th>Max Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editMode ? editLines : lines).map((line, i) => (
                      <tr key={line.id ?? i} className={editMode ? 'spi-edit-row' : ''}>
                        <td className="spi-line-num">{line.lineNum ?? i + 1}</td>
                        <td>
                          {editMode
                            ? <input className="spi-cell-input spi-mono" value={line.itemId ?? ''} onChange={e => setLineField(i, 'itemId', e.target.value)} />
                            : <span className="sku-text">{line.itemId || '—'}</span>
                          }
                        </td>
                        <td>
                          {editMode
                            ? <input className="spi-cell-input" value={line.customer ?? ''} onChange={e => setLineField(i, 'customer', e.target.value)} />
                            : (line.customer || '—')
                          }
                        </td>
                        <td>
                          {editMode
                            ? <input className="spi-cell-input spi-mono" style={{ width: 56 }} value={line.spaCostType ?? ''} onChange={e => setLineField(i, 'spaCostType', e.target.value)} />
                            : (line.spaCostType ? <span className="spi-cost-type">{line.spaCostType}</span> : '—')
                          }
                        </td>
                        <td className="spi-num">
                          {editMode
                            ? <input className="spi-cell-input spi-num" type="number" step="0.01" value={line.spaCost ?? ''} onChange={e => setLineField(i, 'spaCost', e.target.value)} />
                            : (line.spaCost != null ? Number(line.spaCost).toFixed(2) : '—')
                          }
                        </td>
                        <td className="spi-num">
                          {editMode
                            ? <input className="spi-cell-input spi-num" type="number" step="0.01" value={line.discountPct ?? ''} onChange={e => setLineField(i, 'discountPct', e.target.value)} />
                            : (line.discountPct != null ? `${line.discountPct}%` : '—')
                          }
                        </td>
                        <td className="spi-num">
                          {editMode
                            ? <input className="spi-cell-input spi-num" type="number" step="0.01" value={line.discountAmount ?? ''} onChange={e => setLineField(i, 'discountAmount', e.target.value)} />
                            : (line.discountAmount != null ? line.discountAmount : '—')
                          }
                        </td>
                        <td className="spi-num">
                          {editMode
                            ? <input className="spi-cell-input spi-num" type="number" value={line.minQty ?? ''} onChange={e => setLineField(i, 'minQty', e.target.value)} />
                            : (line.minQty ?? '—')
                          }
                        </td>
                        <td className="spi-num">
                          {editMode
                            ? <input className="spi-cell-input spi-num" type="number" value={line.maxQty ?? ''} onChange={e => setLineField(i, 'maxQty', e.target.value)} />
                            : (line.maxQty ?? '—')
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>

          {/* Save bar */}
          <div className="od-save-bar">
            <div style={{ flex: 1 }} />
            {editMode ? (
              <>
                <button type="button" className="btn-outline" onClick={cancelEdit} disabled={submitting}>Cancel</button>
                <button type="button" className="btn-d365" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><span className="btn-spinner" /> Submitting…</> : '▶ Submit to D365'}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-outline" onClick={onBack}>Back</button>
                <button type="button" className="btn-primary" disabled={status === 'Approved'} onClick={handleApprove}>
                  {status === 'Approved' ? '✓ Approved' : 'Approve SPA'}
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
