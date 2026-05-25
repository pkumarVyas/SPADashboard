import { useState, useEffect } from 'react';
import { getExceptions } from '../api/spaApi';

export default function ExceptionDashboard() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getExceptions(20);
      setMessages(data.messages || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="exception-dashboard">
      <div className="dash-header">
        <h2>Exception Queue</h2>
        <div className="dash-actions">
          {lastRefresh && (
            <span className="last-refresh">
              Refreshed {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={load} disabled={loading} className="refresh-btn">
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="result error">
          <strong>Failed to load exceptions:</strong> {error}
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <div className="empty-state">No exceptions in queue.</div>
      )}

      {messages.map((msg, i) => (
        <div key={msg.id || i} className="exception-card">
          <div className="exc-header">
            <span className="exc-id">ID: {msg.id || 'N/A'}</span>
            <span className="exc-time">
              {msg.enqueuedAt ? new Date(msg.enqueuedAt).toLocaleString() : ''}
            </span>
          </div>
          {msg.body?.error && (
            <div className="exc-error">{msg.body.error}</div>
          )}
          {msg.body?.payload && (
            <details className="exc-payload">
              <summary>Payload</summary>
              <pre>{JSON.stringify(msg.body.payload, null, 2)}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
