import { useState } from 'react';

const MOCK = [
  { spaId:'SPA-001', vendor:'MedSupply Inc',   item:'Medical Device A',     customer:'City Hospital',          daysLeft:5,  status:'Critical' },
  { spaId:'SPA-002', vendor:'SurgiCorp',        item:'Surgical Kit B',       customer:'Regional Medical Ctr',   daysLeft:8,  status:'Critical' },
  { spaId:'SPA-003', vendor:'DiagTech Ltd',     item:'Diagnostic Equipment', customer:'Metro Healthcare',        daysLeft:12, status:'Review'   },
  { spaId:'SPA-004', vendor:'PharmaCo',         item:'Pharmaceutical X',     customer:'Community Clinic',       daysLeft:15, status:'Review'   },
  { spaId:'SPA-005', vendor:'LabEquip Pro',     item:'Lab Supplies',         customer:'University Hospital',    daysLeft:22, status:'Due Soon' },
  { spaId:'SPA-006', vendor:'ImagingTech',      item:'Imaging System',       customer:'Diagnostic Center',      daysLeft:35, status:'Due Soon' },
  { spaId:'SPA-007', vendor:'MonitorMed',       item:'Patient Monitor',      customer:'Care Plus Hospital',     daysLeft:42, status:'Due Soon' },
  { spaId:'SPA-008', vendor:'SterileSolutions', item:'Sterilization Unit',   customer:'Surgical Center',        daysLeft:48, status:'Due Soon' },
  { spaId:'SPA-009', vendor:'BreatheTech',      item:'Ventilator System',    customer:'ICU Medical',            daysLeft:55, status:'On Track' },
  { spaId:'SPA-010', vendor:'SonoMed',          item:'Ultrasound Machine',   customer:"Women's Health Clinic",  daysLeft:62, status:'On Track' },
  { spaId:'SPA-011', vendor:'DentSupply',       item:'Dental Equipment',     customer:'Smile Dental',           daysLeft:3,  status:'Critical' },
  { spaId:'SPA-012', vendor:'OrthoMed',         item:'Orthopedic Implant',   customer:'Bone & Joint Center',    daysLeft:18, status:'Review'   },
  { spaId:'SPA-013', vendor:'CardioTech',       item:'Cardiac Monitor',      customer:'Heart Care Hospital',    daysLeft:29, status:'Due Soon' },
  { spaId:'SPA-014', vendor:'InfuseMed',        item:'Infusion Pump',        customer:'Pediatric Center',       daysLeft:70, status:'On Track' },
  { spaId:'SPA-015', vendor:'VisionCare',       item:'Ophthalmic Device',    customer:'Eye Care Clinic',        daysLeft:7,  status:'Critical' },
];

const STATUS_STYLE = {
  'Critical': { bg:'#fef2f2', color:'#dc2626', border:'#fecaca' },
  'Review':   { bg:'#fffbeb', color:'#d97706', border:'#fde68a' },
  'Due Soon': { bg:'#eff6ff', color:'#1d4ed8', border:'#bfdbfe' },
  'On Track': { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0' },
};

const KPI = [
  { key:'Critical', label:'Critical', iconBg:'#fee2e2', iconColor:'#dc2626', icon:'⚠' },
  { key:'Review',   label:'Review',   iconBg:'#fef3c7', iconColor:'#d97706', icon:'○' },
  { key:'Due Soon', label:'Due Soon', iconBg:'#dbeafe', iconColor:'#1d4ed8', icon:'⏱' },
  { key:'On Track', label:'On Track', iconBg:'#dcfce7', iconColor:'#15803d', icon:'✓' },
];

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] ?? { bg:'#f3f4f6', color:'#6b7280', border:'#e5e7eb' };
  return (
    <span style={{ background:s.bg, color:s.color, border:`1px solid ${s.border}`,
                   borderRadius:4, padding:'2px 9px', fontSize:'0.72rem', fontWeight:700 }}>
      {status}
    </span>
  );
}

export default function SPARenewal({ onNavigate }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const q = search.toLowerCase();
  const filtered = MOCK
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => !q || r.spaId.toLowerCase().includes(q) || r.vendor.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q));

  const counts = KPI.reduce((acc, k) => {
    acc[k.key] = MOCK.filter(r => r.status === k.key).length;
    return acc;
  }, {});

  return (
    <>
      <div className="page-hd">
        <div>
          <div className="page-hd-title">SPA Renewal</div>
          <div className="page-hd-sub">Manage and track SPA renewal workflows</div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="db-kpi-grid">
        {KPI.map(k => (
          <div key={k.key} className="db-kpi-card" style={{ cursor:'pointer' }} onClick={() => setStatusFilter(k.key === statusFilter ? 'all' : k.key)}>
            <div className="db-kpi-inner">
              <div>
                <div className="db-kpi-label">{k.label}</div>
                <div className="db-kpi-value">{counts[k.key]}</div>
              </div>
              <div className="db-kpi-icon" style={{ background:k.iconBg, color:k.iconColor, fontSize:'1.1rem' }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="txn-toolbar" style={{ marginTop:20 }}>
        <div className="txn-search-wrap">
          <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }}
               viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input className="txn-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search renewals…" />
        </div>
        <select className="txn-status-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {Object.keys(STATUS_STYLE).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="box" style={{ padding:0, overflow:'hidden', marginTop:16 }}>
        <div className="txn-table-head">
          <span className="txn-table-icon">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/>
            </svg>
          </span>
          <span style={{ fontWeight:600, fontSize:'0.9rem', color:'#111827' }}>Renewal Queue</span>
          <span className="txn-count-badge">{filtered.length} records</span>
        </div>
        <table className="data-table txn-table">
          <thead>
            <tr>
              <th>SPA ID</th>
              <th>Vendor</th>
              <th>Item</th>
              <th>Customer</th>
              <th>Days Left</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign:'center', color:'#9ca3af', padding:'40px 0' }}>No renewals found.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.spaId} className="so-hdr-row">
                <td><span style={{ color:'#1d4ed8', fontWeight:500 }}>{r.spaId}</span></td>
                <td style={{ color:'#d97706', fontSize:'0.85rem' }}>{r.vendor}</td>
                <td style={{ fontSize:'0.85rem' }}>{r.item}</td>
                <td style={{ fontSize:'0.85rem', color: r.daysLeft <= 10 ? '#1d4ed8' : '#374151' }}>{r.customer}</td>
                <td style={{ fontSize:'0.85rem', fontWeight:500 }}>{r.daysLeft} days</td>
                <td><StatusBadge status={r.status}/></td>
                <td>
                  <button className="renew-btn">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/>
                    </svg>
                    Renew
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
