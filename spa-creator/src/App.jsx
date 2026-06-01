import { useState } from 'react';
import Dashboard          from './components/Dashboard';
import SPAImports         from './components/SPAImports';
import SPATransactions    from './components/SPATransactions';
import ClaimsPayments     from './components/ClaimsPayments';
import SPARenewal         from './components/SPARenewal';
import RetroactiveSPALink from './components/RetroactiveSPALink';
import './App.css';

const NAV = [
  { id: 'home',    label: 'Home',                Component: Dashboard },
  { id: 'imports', label: 'SPA Import',           Component: SPAImports },
  { id: 'trans',   label: 'SPA Transactions',     Component: SPATransactions },
  { id: 'claims',  label: 'Claims & Payments',    Component: ClaimsPayments },
  { id: 'renewal', label: 'SPA Renewal',          Component: SPARenewal },
  { id: 'retro',   label: 'Retroactive SPA Link', Component: RetroactiveSPALink },
];

const IC = {
  home:    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  imports: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  trans:   <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  claims:  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  renewal: <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/></svg>,
  retro:   <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
};

export default function App() {
  const [active,    setActive]    = useState('home');
  const [navProps,  setNavProps]  = useState({});
  const { Component } = NAV.find(n => n.id === active);

  function handleNavigate(screen, props = {}) {
    setActive(screen);
    setNavProps(props);
  }

  // Clear navProps when the user switches screens via sidebar
  function handleSidebarNav(id) {
    setActive(id);
    setNavProps({});
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-title">SPA Import</div>
            <div className="sidebar-logo-sub">Dashboard</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`sidebar-item${active === item.id ? ' active' : ''}`}
              onClick={() => handleSidebarNav(item.id)}
            >
              <span className="sidebar-item-icon">{IC[item.id]}</span>
              <span className="sidebar-item-label">{item.label}</span>
              {active === item.id && <span className="sidebar-chevron">›</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="app-main">
        <Component onNavigate={handleNavigate} {...navProps} />
      </main>
    </div>
  );
}
