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
        <div style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'radial-gradient(circle at top, rgba(59,130,255,0.12), transparent 35%), linear-gradient(180deg, #060d1f 0%, #040918 100%)',
          color: '#F6FAFF',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 520,
            borderRadius: 28,
            border: '1px solid rgba(27,45,82,0.55)',
            background: 'rgba(10,19,41,0.88)',
            boxShadow: '0 28px 80px rgba(0,0,0,0.32)',
            padding: 32,
            textAlign: 'center',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 20,
              margin: '0 auto 18px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(135deg, rgba(59,130,255,0.24), rgba(52,215,255,0.2))',
              border: '1px solid rgba(59,130,255,0.22)',
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: 28, marginBottom: 10, letterSpacing: '-0.03em' }}>Bir hata oluştu</h1>
            <p style={{ color: '#9ab0d3', marginBottom: 22, lineHeight: 1.6 }}>{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(90deg, #3b82ff 0%, #4b8cff 100%)',
                color: '#fff',
                border: '1px solid rgba(59,130,255,0.42)',
                borderRadius: 16,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 16px 36px rgba(59,130,255,0.24)',
              }}
            >
              Sayfayı Yenile
            </button>
          </div>
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
