import {createRoot} from 'react-dom/client';
import AppNueva from './rediseno/AppNueva.tsx';
import './index.css';
import { escucharInstalacion } from './lib/instalar';
import { VentanaInstalar } from './components/VentanaInstalar';

// El aviso de "se puede instalar" de Android llega apenas carga la página.
escucharInstalacion();

createRoot(document.getElementById('root')!).render(
  <>
    {/* Rediseño 2026-11: sesión anónima + vínculo por cédula; el staff pasa a su rol con PIN. */}
    <AppNueva />
    {/* Abierta desde el navegador del celular: primero, instalarla en la pantalla de inicio. */}
    <VentanaInstalar />
  </>
);

// Service worker (app instalable / sin conexión). Solo en producción, para no
// interferir con la recarga en caliente de `npm run dev`.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.error('No se pudo registrar el service worker', err));
  });
}
