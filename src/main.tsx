import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <AuthGate>
    {/* key: al cambiar de usuario, la app arranca de cero con sus datos. */}
    {(perfil, salir) => <App key={perfil?.email ?? 'demo'} perfil={perfil} onLogout={salir} />}
  </AuthGate>
);

// Service worker (app instalable / sin conexión). Solo en producción, para no
// interferir con la recarga en caliente de `npm run dev`.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('No se pudo registrar el service worker', err));
  });
}
