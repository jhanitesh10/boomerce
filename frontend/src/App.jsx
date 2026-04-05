import React, { useEffect, useState } from 'react';
import MasterTab from './components/MasterTab';
import './App.css';

function App() {
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('master');

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('bloomerce-theme');
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (prefersDark) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bloomerce-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <div className="app-container">
      <header className="header flex-row-between">
        <div className="brand-section">
          <img src="/boomerce_logo.svg" alt="Bloomerce" className="brand-logo-img" />
          <h1 className="brand-title">Bloomerce</h1>
        </div>
        
        <nav className="header-nav flex gap-6 px-8">
          <button 
            className={`nav-link ${activeTab === 'master' ? 'active' : ''}`}
            onClick={() => setActiveTab('master')}
          >
            Product Master
          </button>
          <button 
            className={`nav-link ${activeTab === 'pricing' ? 'active' : ''}`}
            onClick={() => setActiveTab('pricing')}
          >
            Pricing & Offers
          </button>
          <button 
            className={`nav-link ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventory Management
          </button>
        </nav>

        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Night' : '☀️ Day'}
        </button>
      </header>
      
      <main className="main-content">
        {activeTab === 'master' && <MasterTab />}
        {activeTab === 'pricing' && <div className="card p-8 text-center text-gray-500">Pricing Module Coming Soon</div>}
        {activeTab === 'inventory' && <div className="card p-8 text-center text-gray-500">Inventory Module Coming Soon</div>}
      </main>
    </div>
  );
}

export default App;
