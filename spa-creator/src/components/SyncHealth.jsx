import { syncStats, syncEvents } from '../data/mockData';

const EVENT_STATUS = {
  success:  { label: '✓ Success',  cls: 'success'  },
  error:    { label: '✗ Error',    cls: 'error'    },
  retrying: { label: '↻ Retrying', cls: 'retrying' },
};

export default function SyncHealth() {
  return (
    <>
      <div className="section-head">
        <h2>Sync Health</h2>
        <p>D365 F&amp;O sync status — last run, errors, and queue depth across all SPA write-back jobs.</p>
      </div>

      <div className="stat-grid">
        {syncStats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value${s.value.length > 5 ? ' sm' : ''}`}>{s.value}</div>
            <div className={`stat-sub c-${s.color}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="box">
        <div className="box-head">
          <h3>Recent sync events</h3>
          <button className="btn-sec" style={{ fontSize: '0.8rem', padding: '5px 12px' }}>View all</button>
        </div>
        <div className="table-wrap" style={{ marginTop: '14px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>SPA</th>
                <th>Operation</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {syncEvents.map((e, i) => {
                const { label, cls } = EVENT_STATUS[e.status] ?? EVENT_STATUS.success;
                return (
                  <tr key={i}>
                    <td style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{e.time}</td>
                    <td><span className="spa-link">{e.spa}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{e.op}</td>
                    <td><span className={`sync-status ${cls}`}>{label}</span></td>
                    <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{e.duration}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
