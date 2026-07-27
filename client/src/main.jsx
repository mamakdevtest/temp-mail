import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { createTranslator, normalizeLanguage } from './i18n';
import './theme.css';
import './index.css';

// Hata yakalayıcı - siyah ekran sorununu önler
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Uygulama hatası:', error, info); }
  render() {
    if (this.state.hasError) {
      const t = createTranslator(normalizeLanguage(document.documentElement.lang));
      return (
        <div className="error-fallback">
          <div className="error-fallback-card">
            <div className="error-fallback-icon">⚠️</div>
            <h1>{t('app.errorOccurred')}</h1>
            <p>{this.state.error?.message}</p>
            <button
              type="button"
              className="error-fallback-btn"
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            >
              {t('app.reloadPage')}
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
