import { useState } from 'react';
import SPAImports     from './components/SPAImports';
import SPAAgreements  from './components/SPAAgreements';
import ClaimsPayments from './components/ClaimsPayments';
import SalesOrders    from './components/SalesOrders';
import './App.css';

const TABS = [
  { id: 'imports',  label: 'SPA Imports',       Component: SPAImports,     color: { idle: '#e0e7ff', idleFg: '#3730a3', active: '#4338ca', activeFg: '#ffffff' } },
  { id: 'overview', label: 'SPA Agreements',    Component: SPAAgreements,  color: { idle: '#dcfce7', idleFg: '#166534', active: '#16a34a', activeFg: '#ffffff' } },
  { id: 'claims',   label: 'Claims & Payments', Component: ClaimsPayments, color: { idle: '#fef3c7', idleFg: '#92400e', active: '#d97706', activeFg: '#ffffff' } },
  { id: 'repo',     label: 'Sales Orders',       Component: SalesOrders,    color: { idle: '#fce7f3', idleFg: '#9d174d', active: '#db2777', activeFg: '#ffffff' } },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('imports');

  const { Component } = TABS.find(t => t.id === activeTab);

  return (
    <div className="app">
      <nav className="nav">
        {TABS.map(t => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              className={`nav-tab${isActive ? ' active' : ''}`}
              style={{
                background: isActive ? t.color.active : t.color.idle,
                color:      isActive ? t.color.activeFg : t.color.idleFg,
              }}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
      <main className="main">
        <Component />
      </main>
    </div>
  );
}
