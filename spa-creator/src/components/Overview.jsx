import { overviewStats } from '../data/mockData';

export default function Overview() {
  return (
    <>
      <div className="section-head">
        <h2>Overview</h2>
        <p>High-level SPA program health across all vendors and customers.</p>
      </div>
      <div className="stat-grid">
        {overviewStats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-sub c-${s.color}`}>{s.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
}
