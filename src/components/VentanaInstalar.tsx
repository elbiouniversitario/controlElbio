import React, { useEffect, useState } from 'react';
import { alCambiarInstalacion, instalarNativo, ModoInstalar, modoInstalar } from '../lib/instalar';

/** Ícono de Compartir de Apple (cuadrado con flecha hacia arriba). */
const IconoCompartir = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 inline-block text-[#007aff]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="M7.5 7.5 12 3l4.5 4.5" />
    <path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" />
  </svg>
);

/** Ícono de "Agregar a inicio" (cuadrado con +). */
const IconoAgregar = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 inline-block text-[#191c1e]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <path d="M12 8.5v7M8.5 12h7" />
  </svg>
);

const Paso: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <li className="flex items-center gap-3 text-left">
    <span className="w-7 h-7 rounded-full bg-[#00183a] text-white font-heading text-[13px] font-bold flex items-center justify-center shrink-0">
      {n}
    </span>
    <span className="font-sans text-[14px] text-[#191c1e] leading-snug">{children}</span>
  </li>
);

/**
 * Ventana que pide instalar la app en la pantalla de inicio cuando se abre
 * desde el navegador del celular. "Ahora no" la cierra hasta la próxima vez
 * que se abra la app; instalada (abierta desde el ícono), no aparece más.
 */
export const VentanaInstalar: React.FC = () => {
  const [modo, setModo] = useState<ModoInstalar>(() => modoInstalar());
  const [cerrada, setCerrada] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const actualizar = () => setModo(modoInstalar());
    const quitar = alCambiarInstalacion(actualizar);
    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        setCerrada(false);
        actualizar();
      }
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      quitar();
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  if (cerrada || modo === 'listo') return null;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#00183a]/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 flex flex-col items-center text-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="w-16 h-16 rounded-2xl shadow-md" />
        <h2 className="font-heading font-bold text-[20px] text-[#00183a] leading-tight">Instalá la app del club</h2>
        <p className="font-sans text-[13px] text-[#44474f]">
          Queda en tu pantalla de inicio como cualquier app, y así te pueden llegar los avisos del club.
        </p>

        {modo === 'nativo' && (
          <button
            type="button"
            onClick={() => void instalarNativo()}
            className="w-full py-3.5 rounded-xl bg-[#b51a1b] text-white font-heading text-[14px] font-bold flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[22px]">install_mobile</span>
            Instalar app
          </button>
        )}

        {modo === 'android-manual' && (
          <ol className="w-full flex flex-col gap-2.5 bg-[#f2f4f7] rounded-xl p-3">
            <Paso n={1}>
              Tocá el menú <strong>⋮</strong> de Chrome (arriba a la derecha).
            </Paso>
            <Paso n={2}>
              Elegí <strong>“Instalar app”</strong> o <strong>“Agregar a la pantalla principal”</strong>.
            </Paso>
            <Paso n={3}>Abrí la app desde el ícono nuevo.</Paso>
          </ol>
        )}

        {modo === 'ios-safari' && (
          <>
            <ol className="w-full flex flex-col gap-2.5 bg-[#f2f4f7] rounded-xl p-3">
              <Paso n={1}>
                Tocá <IconoCompartir /> <strong>Compartir</strong>, abajo en Safari (si no lo ves, está dentro de{' '}
                <strong>•••</strong>).
              </Paso>
              <Paso n={2}>
                Bajá y elegí <IconoAgregar /> <strong>“Agregar a inicio”</strong>.
              </Paso>
              <Paso n={3}>
                Tocá <strong>Agregar</strong> y abrí la app desde el ícono nuevo.
              </Paso>
            </ol>
            <span className="material-symbols-outlined text-[36px] text-[#007aff] animate-bounce" aria-hidden="true">
              arrow_downward
            </span>
          </>
        )}

        {modo === 'ios-otro' && (
          <div className="w-full flex flex-col gap-2 bg-[#f2f4f7] rounded-xl p-3">
            <p className="font-sans text-[14px] text-[#191c1e]">
              En iPhone la app se instala desde <strong>Safari</strong>. Copiá el link, abrilo en Safari y seguí los
              pasos.
            </p>
            <button
              type="button"
              onClick={copiarLink}
              className="h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">{copiado ? 'check' : 'content_copy'}</span>
              {copiado ? 'Link copiado' : 'Copiar link'}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setCerrada(true)}
          className="font-heading text-[12px] font-bold text-[#747780] underline"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
};
