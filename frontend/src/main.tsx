import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { Toaster } from 'react-hot-toast';

// Basic bootstrap diagnostics
console.log('[frontend] Booting App');
window.addEventListener('error', (e) => {
  console.error('[frontend] Uncaught error', e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[frontend] Unhandled promise rejection', e.reason);
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  console.error('[frontend] Root element not found');
}

ReactDOM.createRoot(rootEl as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-right" />
  </React.StrictMode>
);
