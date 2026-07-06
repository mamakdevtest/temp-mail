import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Hata yakalayıcı - siyah ekran sorununu önler
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Uygulama hatası:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'Inter, sans-serif', background: '#f9fafb', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>⚠️ Bir hata oluştu</h1>
          <p style={{ color: '#666', marginBottom: 16 }}>{this.state.error?.message}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            🔄 Sayfayı Yenile
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
