import { useState, useEffect, useCallback } from 'react';
import { getClaimsData } from '../api/claimsApi';
import ClaimsChart from './ClaimsChart';

// ── Horizontal vendor bar chart (SVG) ─────────────────────────────────────────
function VendorChart({ vendors }) {
  if (!vendors?.length) return <div className="cp-empty">No vendor data</div>;
  const max = Math.max(...vendors.map(v => v.claimed), 1);
  const ROW = 36, PAD_L = 90, PAD_R = 80, W = 480, BAR_H = 10, GAP = 4;
  const H = vendors.length * ROW + 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }} aria-label="Top vendors chart">
      {vendors.map((v, i) => {
        const y      = i * ROW + 8;
        const cWidth = W - PAD_L - PAD_R;
        const clW    = Math.max(2, (v.claimed / max) * cWidth);
        const pdW    = Math.max(v.paid > 0 ? 2 : 0, (v.paid / max) * cWidth);
        const label  = v.vendor.length > 12 ? v.vendor.slice(0,11)+'…' : v.vendor;
        return (
          <g key={v.vendor}>
            <text x={PAD_L - 6} y={y + BAR_H} textAnchor="end" fontSize="10" fill="#374151">{label}</text>
            {/* Claimed bar */}
            <rect x={PAD_L} y={y} width={clW} height={BAR_H} fill="#6366f1" rx="2" opacity="0.85">
              <title>Claimed: {v.claimedFmt}</title>
            </rect>
            {/* Paid bar */}
            <rect x={PAD_L} y={y + BAR_H + GAP} width={pdW} height={BAR_H} fill="#22c55e" rx="2" opacity="0.85">
              <title>Paid: {v.paidFmt}</title>
            </rect>
            <text x={PAD_L + clW + 4} y={y + BAR_H} fontSize="9" fill="#6b7280">{v.claimedFmt}</text>
            <text x={PAD_L + pdW + 4} y={y + BAR_H + GAP + BAR_H} fontSize="9" fill="#6b7280">{v.paidFmt}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Status breakdown bars ─────────────────────────────────────────────────────
const STATUS_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316'];

function StatusBreakdown({ statuses }) {
  if (!statuses?.length) return <div className="cp-empty">No status data</div>;
  const maxAmt = Math.max(...statuses.map(s => s.amount), 1);
  return (
    <div className="cp-status-list">
      {statuses.map((s, i) => (
        <div key={s.status} className="cp-status-row">
          <div className="cp-status-label">
            <span className="cp-status-dot" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
            <span className="cp-status-name">{s.status || 'Unknown'}</span>
            <span className="cp-status-count">{s.count} claims</span>
          </div>
          <div className="cp-status-bar-wrap">
            <div className="cp-status-bar-track">
              <div
                className="cp-status-bar-fill"
                style={{ width:`${s.pct}%`, background: STATUS_COLORS[i % STATUS_COLORS.length] }}
              />
            </div>
            <span className="cp-status-amt">{s.amountFmt}</span>
            <span className="cp-status-pct">{s.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ small }) {
  return <div className={small ? 'cp-spinner-ring-sm' : 'cp-spinner-ring'} />;
}

function ChartLoader({ height = 160 }) {
  return (
    <div className="cp-chart-placeholder" style={{ height }}>
      <Spinner />
      <span>Loading…</span>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ title, value, sub, accent, progress, loading }) {
  return (
    <div className={`cp-kpi-card cp-kpi-${accent}`}>
      <div className="cp-kpi-title">{title}</div>
      {loading ? (
        <>
          <div className="cp-kpi-skel-val" />
          <div className="cp-kpi-skel-sub" />
        </>
      ) : (
        <>
          <div className="cp-kpi-value">{value ?? '—'}</div>
          {sub && <div className="cp-kpi-sub">{sub}</div>}
          {progress != null && (
            <div className="cp-kpi-progress-track">
              <div className="cp-kpi-progress-fill" style={{ width:`${Math.min(100, progress)}%` }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ClaimsPayments() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try   { setData(await getClaimsData()); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis            = data?.kpis           ?? {};
  const chartData       = data?.chartData      ?? [];
  const vendors         = data?.vendors        ?? [];
  const statusBreakdown = data?.statusBreakdown ?? [];
  const agingBuckets    = data?.agingBuckets   ?? [];
  const counts          = data?.counts         ?? {};

  const noData = !loading && !error && data?.kpis?.totalClaimed?.raw === 0;

  return (
    <>
      {/* ── Header ── */}
      <div className="cp-page-header">
        <div>
          <h2>Claims &amp; Payments</h2>
          <p className="cp-page-sub">
            SPA claims analytics · {counts.journal ?? 0} claims · {counts.payments ?? 0} payments
          </p>
        </div>
        <button className="btn-outline" onClick={load} disabled={loading}>
          {loading ? <span className="btn-spinner" /> : '↺'} Refresh
        </button>
      </div>

      {error && (
        <div className="cp-error-banner">
          <strong>Error:</strong> {error}
          <button className="btn-outline" style={{ marginLeft:12 }} onClick={load}>Retry</button>
        </div>
      )}

      {noData && !error && (
        <div className="cp-warn-banner">
          <strong>Amounts are $0.</strong> The journal entity may have returned no records, or the amount field mapping may need refreshing.
          {counts.journal === 0 && <span> Journal returned <strong>0 records</strong> — check the table name or company filter.</span>}
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="cp-kpi-row">
        <KpiCard loading={loading} title="Total Claimed"    value={kpis.totalClaimed?.label}  sub="All-time claim value"        accent="indigo" />
        <KpiCard loading={loading} title="Total Paid"       value={kpis.totalPaid?.label}      sub="Vendor payments received"    accent="green" />
        <KpiCard loading={loading} title="Outstanding"      value={kpis.outstanding?.label}    sub="Unpaid claim balance"        accent="amber" />
        <KpiCard loading={loading} title="Pay Rate"         value={kpis.payRate?.label}        sub="Paid ÷ Claimed"             accent="blue"   progress={kpis.payRate?.raw} />
        <KpiCard loading={loading} title="Avg Days to Pay"  value={kpis.avgDaysToPay?.label}   sub="Claim date → payment date"  accent="purple" />
      </div>

      {/* ── Trend chart ── */}
      <div className="chart-card">
        <div className="cp-card-header">
          <div>
            <div className="chart-title">Monthly Claims vs Payments</div>
            <div className="chart-sub">Last 12 months — $ thousands</div>
          </div>
          <div className="legend">
            <span className="legend-item"><span className="legend-dot" style={{ background:'#6366f1' }} />Claimed</span>
            <span className="legend-item"><span className="legend-dot" style={{ background:'#22c55e' }} />Paid</span>
          </div>
        </div>
        {loading && !chartData.length
          ? <ChartLoader height={200} />
          : <ClaimsChart data={chartData} />
        }
      </div>

      {/* ── Vendor + Status side-by-side ── */}
      <div className="cp-two-col">
        <div className="chart-card">
          <div className="chart-title">Top Vendors by Claim Amount</div>
          <div className="chart-sub">Claimed (indigo) vs Paid (green)</div>
          {loading ? <ChartLoader /> : <VendorChart vendors={vendors} />}
        </div>
        <div className="chart-card">
          <div className="chart-title">Claims by Status</div>
          <div className="chart-sub">Count and value per status</div>
          {loading ? <ChartLoader /> : <StatusBreakdown statuses={statusBreakdown} />}
        </div>
      </div>

      {/* ── Aging analysis ── */}
      <div className="chart-card">
        <div className="chart-title">Aging Analysis</div>
        <div className="chart-sub">Outstanding unpaid claims by age since claim date</div>
        {loading ? (
          <div className="cp-aging-loading">
            <Spinner small />
            <span>Loading aging data…</span>
          </div>
        ) : (
          <table className="aging-table">
            <tbody>
              {(agingBuckets.length ? agingBuckets : [{label:'No data',claims:0,amountFmt:'—',pct:0,tier:'low',danger:false}]).map(b => (
                <tr key={b.label}>
                  <td className={`aging-label${b.danger?' danger':''}`}>{b.label}</td>
                  <td className="aging-bar-cell">
                    <div className="aging-track">
                      <div className={`aging-fill ${b.tier}`} style={{ width:`${b.pct}%` }} />
                    </div>
                  </td>
                  <td className="aging-count">{b.c ?? b.claims} claims</td>
                  <td className={`aging-amount${b.danger?' danger':''}`}>{b.amountFmt ?? b.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </>
  );
}
