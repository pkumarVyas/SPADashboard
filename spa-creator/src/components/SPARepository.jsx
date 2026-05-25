import { spaRepo } from '../data/mockData';

const STATUS_LABELS = {
  active:   { label: '● Active',   cls: 'active'   },
  expiring: { label: '● Expiring', cls: 'expiring' },
  expired:  { label: '● Expired',  cls: 'expired'  },
  draft:    { label: '● Draft',    cls: 'draft'     },
};

const repoStats = [
  { label: 'Active',         value: '312', sub: 'Current',         color: 'green'  },
  { label: 'Expiring 30 d',  value: '14',  sub: 'Renew soon',      color: 'orange' },
  { label: 'Draft',          value: '8',   sub: 'Pending approval', color: 'gray'   },
  { label: 'Expired (90 d)', value: '47',  sub: 'Archivable',      color: 'gray'   },
];

export default function SPARepository() {
  return (
    <>
      <div className="section-head">
        <h2>SPA Repository</h2>
        <p>All active, expiring, draft, and expired SPAs across all vendors and customers.</p>
      </div>

      <div className="stat-grid">
        {repoStats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-sub c-${s.color}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>SPA ID</th>
              <th>Name</th>
              <th>Vendor</th>
              <th>Customer</th>
              <th>Effective</th>
              <th>Expiry</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {spaRepo.map(s => {
              const { label, cls } = STATUS_LABELS[s.status] ?? STATUS_LABELS.active;
              return (
                <tr key={s.id}>
                  <td><span className="spa-link">{s.id}</span></td>
                  <td>{s.name}</td>
                  <td>{s.vendor}</td>
                  <td>{s.customer}</td>
                  <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{s.effective}</td>
                  <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>{s.expiry}</td>
                  <td><strong>{s.value}</strong></td>
                  <td><span className={`status-badge ${cls}`}>{label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
