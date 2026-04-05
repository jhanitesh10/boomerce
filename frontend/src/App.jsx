import React, { useEffect, useState } from 'react';
import api from './api';
import './App.css';

function App() {
  const [status, setStatus] = useState("Checking backend...");
  const [theme, setTheme] = useState('light');

  // Automatically detect system preference or load saved theme
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('bloomerce-theme');
    
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (prefersDark) {
      setTheme('dark');
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bloomerce-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    api.get('/status')
      .then(res => setStatus(res.data.message))
      .catch(err => setStatus("Backend not reachable."));
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand-section">
          <img src="/boomerce_logo.svg" alt="Bloomerce" className="brand-logo" />
          <h1 className="brand-title">Bloomerce</h1>
        </div>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Night Mode' : '☀️ Day Mode'}
        </button>
      </header>
      
      <main className="content">
        <p>System Status: <strong>{status}</strong></p>
      </main>
    </div>
  );
}

export default App;
