/**
 * Bienvenida animada al abrir la app (~2,3 s): el escudo sube y se asienta, un
 * brillo lo cruza, las cinco estrellas caen de la central hacia afuera y destellan,
 * y la pantalla se funde con la app. Un toque la saltea. Con "reducir movimiento"
 * activado en el teléfono no se muestra.
 *
 * Las posiciones salen de public/escudo-layout.json (lo genera
 * CLAUDE TOOLS/scripts-python/elbio_escudo_recorte.py): fracciones del escudo completo.
 */
import { useEffect, useState } from 'react';

const ASPECTO = 0.7317; // ancho / alto del escudo completo
const CUERPO = { x: 0.0287, y: 0.1709, w: 0.9384, h: 0.8291 };
const ESTRELLAS = [
  { x: 0.0029, y: 0.0031, w: 0.1877, h: 0.1363 },
  { x: 0.2034, y: 0.0031, w: 0.1905, h: 0.1373 },
  { x: 0.3997, y: 0.0021, w: 0.1948, h: 0.1384 },
  { x: 0.6017, y: 0.0021, w: 0.1934, h: 0.1384 },
  { x: 0.8023, y: 0.0021, w: 0.1948, h: 0.1384 },
];
// Orden de caída: la central primero, después hacia los costados.
const RETARDO_ESTRELLA = [2, 1, 0, 1, 2];

const DURACION_MS = 2300;
const SALIDA_MS = 380;

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

function reducirMovimiento() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export default function Bienvenida() {
  const [fase, setFase] = useState<'entra' | 'sale' | 'fin'>(() => (reducirMovimiento() ? 'fin' : 'entra'));

  useEffect(() => {
    if (fase === 'entra') {
      const t = setTimeout(() => setFase('sale'), DURACION_MS);
      return () => clearTimeout(t);
    }
    if (fase === 'sale') {
      const t = setTimeout(() => setFase('fin'), SALIDA_MS);
      return () => clearTimeout(t);
    }
  }, [fase]);

  if (fase === 'fin') return null;

  return (
    <div
      className={`bienvenida ${fase === 'sale' ? 'bienvenida--sale' : ''}`}
      onClick={() => setFase('sale')}
      role="presentation"
      aria-hidden="true"
    >
      <div className="bienvenida__halo" />
      <div className="bienvenida__escudo" style={{ aspectRatio: String(ASPECTO) }}>
        <div
          className="bienvenida__cuerpo"
          style={{ left: pct(CUERPO.x), top: pct(CUERPO.y), width: pct(CUERPO.w), height: pct(CUERPO.h) }}
        >
          <img src="/escudo-cuerpo.png" alt="" draggable={false} />
          <span className="bienvenida__brillo" />
        </div>
        {ESTRELLAS.map((e, i) => (
          <img
            key={i}
            src="/estrella.png"
            alt=""
            draggable={false}
            className="bienvenida__estrella"
            style={{
              left: pct(e.x),
              top: pct(e.y),
              width: pct(e.w),
              height: pct(e.h),
              animationDelay: `${720 + RETARDO_ESTRELLA[i] * 110}ms, ${1350 + RETARDO_ESTRELLA[i] * 110}ms`,
            }}
          />
        ))}
      </div>
      <p className="bienvenida__marca">Control Elbio</p>
    </div>
  );
}
