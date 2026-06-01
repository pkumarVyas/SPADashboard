import { useState, useEffect } from 'react';
import { getSPAImports } from '../api/spaImportApi';

function KpiCard({ label, value, iconBg, iconColor, icon }) {
  return (
    <div className="db-kpi-card">
      <div className="db-kpi-inner">
        <div>
          <div className="db-kpi-label">{label}</div>
          <div className="db-kpi-value">{value}</div>
        </div>
        <div className="db-kpi-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, desc, onClick }) {
  return (
    <div className="db-action-card" onClick={onClick} role="button" tabIndex={0}
         onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="db-action-icon">{icon}</div>
      <div className="db-action-title">{title}</div>
      <div className="db-action-desc">{desc}</div>
      <span className="db-action-link">Get started →</span>
    </div>
  );
}

export default function Dashboard({ onNavigate }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSPAImports({ filter: '' })
      .then(res => setItems(res.value ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const total          = items.length;
  const importedToday  = items.filter(i => i.createdOn && new Date(i.createdOn).toDateString() === today).length;
  const success        = items.filter(i => (i.creationStatus ?? '').toLowerCase().includes('submit')).length;
  const needsReview    = items.filter(i => {
    const s = (i.creationStatus ?? '').toLowerCase();
    return !s || s.includes('pending') || s.includes('fail') || s.includes('review');
  }).length;

  const v = loading ? '…' : undefined;

  return (
    <>
      <div className="page-hd">
        <div>
          <div className="page-hd-title">Dashboard</div>
          <div className="page-hd-sub">Welcome to your SPA Import management center</div>
        </div>
      </div>

      {/* KPI row */}
      <div className="db-kpi-grid">
        <KpiCard
          label="Total Imported" value={v ?? total}
          iconBg="#dbeafe" iconColor="#1d4ed8"
          icon={<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
        />
        <KpiCard
          label="Imported Today" value={v ?? importedToday}
          iconBg="#d1fae5" iconColor="#059669"
          icon={<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <KpiCard
          label="Successfully Imported" value={v ?? success}
          iconBg="#e0f2fe" iconColor="#0284c7"
          icon={<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
        />
        <KpiCard
          label="Needs Review" value={v ?? needsReview}
          iconBg="#fee2e2" iconColor="#dc2626"
          icon={<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
      </div>

      {/* Quick Actions */}
      <div className="db-section-title">Quick Actions</div>
      <div className="db-actions-grid">
        <ActionCard
          title="Import New SPA"
          desc="Add new SPA records to the system"
          onClick={() => onNavigate('imports')}
          icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6b7280" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>}
        />
        <ActionCard
          title="Retroactive SPA Link"
          desc="Link SPAs to eligible sales orders"
          onClick={() => onNavigate('retro')}
          icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6b7280" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
        />
        <ActionCard
          title="Manage Renewals"
          desc="Track and process SPA renewals"
          onClick={() => onNavigate('renewal')}
          icon={<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6b7280" strokeWidth="1.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/></svg>}
        />
      </div>

      {/* Recent Activity */}
      <div className="db-section-title" style={{ marginTop: 28 }}>Recent Activity</div>
      <div className="db-activity-box">
        <div className="db-activity-empty">Activity feed will appear here</div>
      </div>
    </>
  );
}
