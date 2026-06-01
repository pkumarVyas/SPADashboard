import { useState } from 'react';

const KPI_CARDS = [
  { label:'Orders Found', value:'0',     borderColor:'#3b82f6', iconColor:'#3b82f6',
    icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
  { label:'Selected',     value:'0',     borderColor:'#22c55e', iconColor:'#22c55e',
    icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg> },
  { label:'Pending',      value:'0',     borderColor:'#f59e0b', iconColor:'#f59e0b',
    icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { label:'Total Amount', value:'$0',    borderColor:'#6366f1', iconColor:'#6366f1',
    icon:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
];

export default function RetroactiveSPALink({ onNavigate }) {
  const [ran, setRan] = useState(false);

  return (
    <>
      <div className="page-hd">
        <div>
          <div className="page-hd-title">Retroactive SPA Link</div>
          <div className="page-hd-sub">Manage and track retroactively linked SPA records</div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-outline" onClick={() => setRan(true)}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Run Match Engine
          </button>
          <button className="btn-primary" style={{ background:'#1d4ed8', display:'flex', alignItems:'center', gap:6 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            Auto Apply SPA (0)
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="db-kpi-grid" style={{ marginBottom: 28 }}>
        {KPI_CARDS.map(k => (
          <div key={k.label} className="retro-kpi-card" style={{ borderTopColor: k.borderColor }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ color: k.iconColor }}>{k.icon}</span>
              <span className="db-kpi-label" style={{ marginBottom:0 }}>{k.label}</span>
            </div>
            <div className="db-kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!ran ? (
        <div className="retro-empty">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <p>Click <strong>Run Match Engine</strong> to find eligible sales orders for retroactive SPA linking.</p>
        </div>
      ) : (
        <div className="retro-empty">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <p>No matching sales orders found for the current SPA records.</p>
        </div>
      )}
    </>
  );
}
