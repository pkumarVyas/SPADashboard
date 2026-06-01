import { useState, useEffect, useCallback } from 'react';
import { getClaimsData } from '../api/claimsApi';
import ClaimsChart from './ClaimsChart';

function KpiCard({ label, value, loading, iconBg, iconColor, icon }) {
  return (
    <div className="cp2-kpi-card">
      <div className="cp2-kpi-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div>
        <div className="cp2-kpi-label">{label}</div>
        {loading
          ? <div className="cp-kpi-skel-val" style={{ marginTop: 6 }} />
          : <div className="cp2-kpi-value">{value ?? '—'}</div>
        }
      </div>
    </div>
  );
}

function PayRateBadge({ rate }) {
  const n = parseFloat(rate);
  const bg    = n >= 90 ? '#f0fdf4' : n >= 85 ? '#eff6ff' : n >= 80 ? '#fffbeb' : '#fef2f2';
  const color = n >= 90 ? '#15803d' : n >= 85 ? '#1d4ed8' : n >= 80 ? '#d97706' : '#dc2626';
  const border= n >= 90 ? '#bbf7d0' : n >= 85 ? '#bfdbfe' : n >= 80 ? '#fde68a' : '#fecaca';
  return (
    <span style={{ background:bg, color, border:`1px solid ${border}`, borderRadius:4,
                   padding:'2px 8px', fontSize:'0.72rem', fontWeight:700 }}>
      {isNaN(n) ? '—' : `${n.toFixed(1)}%`}
    </span>
  );
}

function VendorTable({ vendors, loading }) {
  if (loading) return (
    <div className="cp-aging-loading"><div className="cp-spinner-ring-sm"/><span>Loading…</span></div>
  );
  if (!vendors?.length) return <div className="cp-empty" style={{ padding:'24px 0', textAlign:'center', color:'#9ca3af' }}>No vendor data</div>;

  return (
    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
      <thead>
        <tr style={{ borderBottom:'1px solid #f3f4f6' }}>
          <th style={{ textAlign:'left', padding:'8px 0', color:'#6b7280', fontWeight:600 }}>Vendor</th>
          <th style={{ textAlign:'right', padding:'8px 8px', color:'#6b7280', fontWeight:600 }}>Amount Paid</th>
          <th style={{ textAlign:'right', padding:'8px 8px', color:'#6b7280', fontWeight:600 }}>Claims</th>
          <th style={{ textAlign:'right', padding:'8px 0', color:'#6b7280', fontWeight:600 }}>Pay Rate</th>
        </tr>
      </thead>
      <tbody>
        {vendors.map(v => {
          const rate = v.claimed > 0 ? (v.paid / v.claimed * 100) : 0;
          return (
            <tr key={v.vendor} style={{ borderBottom:'1px solid #f9fafb' }}>
              <td style={{ padding:'10px 0', color:'#111827', fontWeight:500 }}>{v.vendor}</td>
              <td style={{ textAlign:'right', padding:'10px 8px', color:'#374151' }}>{v.paidFmt}</td>
              <td style={{ textAlign:'right', padding:'10px 8px', color:'#6b7280' }}>{v.count ?? '—'}</td>
              <td style={{ textAlign:'right', padding:'10px 0' }}><PayRateBadge rate={rate}/></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ClaimsPayments({ onNavigate }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [year,    setYear]    = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try   { setData(await getClaimsData()); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis      = data?.kpis      ?? {};
  const chartData = data?.chartData ?? [];
  const vendors   = data?.vendors   ?? [];
  const counts    = data?.counts    ?? {};

  const yearOptions = [year - 1, year, year + 1];

  return (
    <>
      <div className="page-hd">
        <div>
          <div className="page-hd-title">Claims &amp; Payments</div>
          <div className="page-hd-sub">Track claims, payments, and financial performance</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <select
            style={{ border:'1px solid #e5e7eb', borderRadius:6, padding:'6px 10px', fontSize:'0.85rem', color:'#374151' }}
            value={year} onChange={e => setYear(+e.target.value)}
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-outline" onClick={load} disabled={loading}>
            {loading ? <div className="cp-spinner-ring-sm"/> : '↺'} Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="cp-error-banner">
          <strong>Error:</strong> {error}
          <button className="btn-outline" style={{ marginLeft:12 }} onClick={load}>Retry</button>
        </div>
      )}

      {/* KPI row */}
      <div className="cp2-kpi-row">
        <KpiCard loading={loading} label="Amount Claimed" value={kpis.totalClaimed?.label}
          iconBg="#dbeafe" iconColor="#1d4ed8"
          icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
        />
        <KpiCard loading={loading} label="Amount Paid" value={kpis.totalPaid?.label}
          iconBg="#d1fae5" iconColor="#059669"
          icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
        />
        <KpiCard loading={loading} label="Pending" value={kpis.outstanding?.label}
          iconBg="#fef3c7" iconColor="#d97706"
          icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <KpiCard loading={loading} label="Written Off" value="—"
          iconBg="#fee2e2" iconColor="#dc2626"
          icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
        />
        <KpiCard loading={loading} label="Pay Rate" value={kpis.payRate?.label}
          iconBg="#f3e8ff" iconColor="#7c3aed"
          icon={<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>}
        />
      </div>

      {/* Two-column: chart + vendor table */}
      <div className="cp2-main-row">
        {/* Monthly chart */}
        <div className="chart-card" style={{ flex:'1 1 58%' }}>
          <div className="cp-card-header" style={{ marginBottom:12 }}>
            <div>
              <div className="chart-title">Monthly Claims vs Payments</div>
            </div>
            <div className="legend">
              <span className="legend-item"><span className="legend-dot" style={{ background:'#f97316' }}/>Amount Claimed</span>
              <span className="legend-item"><span className="legend-dot" style={{ background:'#0d9488' }}/>Amount Paid</span>
            </div>
          </div>
          {loading && !chartData.length
            ? <div className="cp-chart-placeholder" style={{ height:220 }}><div className="cp-spinner-ring"/><span>Loading…</span></div>
            : <ClaimsChart data={chartData}/>
          }
        </div>

        {/* Vendor table */}
        <div className="chart-card" style={{ flex:'1 1 38%' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#374151" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            <span className="chart-title" style={{ marginBottom:0 }}>Vendor Payment Details</span>
          </div>
          <VendorTable vendors={vendors} loading={loading}/>
        </div>
      </div>
    </>
  );
}
