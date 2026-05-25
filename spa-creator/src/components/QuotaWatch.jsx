import { atRiskSPAs } from '../data/mockData';

export default function QuotaWatch() {
  return (
    <>
      <div className="section-head">
        <h2>SPAs at risk</h2>
        <p>Sorted by % consumed — flag any &gt;90% with &gt;30 days remaining.</p>
      </div>

      {atRiskSPAs.map(spa => (
        <div className="quota-card" key={spa.id}>
          <div className="quota-top">
            <div className="quota-left">
              <span className="quota-id">{spa.id}</span>
              <span className="quota-parties">{spa.parties}</span>
            </div>
            <div className="quota-right">
              <span className="quota-expiry">Expires {spa.expiry}</span>
              <button className={`btn-req ${spa.color}`}>Request increase</button>
            </div>
          </div>

          <div className="quota-bar-row">
            <div className="quota-track">
              <div className={`quota-fill ${spa.color}`} style={{ width: `${spa.pct}%` }} />
            </div>
            <span className={`quota-pct c-${spa.color}`}>{spa.pct}%</span>
          </div>

          <div className="quota-meta">
            <span>{spa.used.toLocaleString()} / {spa.total.toLocaleString()} units</span>
            <span className="quota-value-label">SPA value {spa.value}</span>
          </div>
        </div>
      ))}
    </>
  );
}
