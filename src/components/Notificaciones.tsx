import React, { useCallback, useEffect, useState } from 'react';
import { VentanaImprimible } from './VentanaImprimible';
import { alCambiarInstalacion, modoInstalar } from '../lib/instalar';
import QRCode from 'qrcode';
import { activarPush, desactivarPush, esIOS, EstadoPush, estadoPush } from '../lib/push';
import { useTextos } from '../lib/textos';

/** Estado de las notificaciones en este celular, con acciones para cambiarlo. */
function useNotificaciones() {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(() => {
    estadoPush()
      .then(setEstado)
      .catch(() => setEstado('no-soportado'));
  }, []);
  useEffect(refrescar, [refrescar]);

  const activar = async () => {
    setOcupado(true);
    setError(null);
    try {
      setEstado(await activarPush());
    } catch (err) {
      setError(err instanceof Error ? err.message : String((err as { message?: unknown })?.message ?? err));
    } finally {
      setOcupado(false);
    }
  };

  const desactivar = async () => {
    setOcupado(true);
    setError(null);
    try {
      await desactivarPush();
      setEstado('inactivo');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOcupado(false);
    }
  };

  return { estado, ocupado, error, activar, desactivar, refrescar };
}

/** Pasos para agregar la app a la pantalla de inicio (en iPhone es obligatorio para recibir avisos). */
export const PasosInstalar: React.FC<{ compacto?: boolean }> = ({ compacto }) => {
  const iphone = esIOS();
  const texto = compacto ? 'text-[12px]' : 'text-[13px]';
  return (
    <ol className={`list-decimal pl-5 flex flex-col gap-1 font-sans ${texto} text-[#191c1e]`}>
      {iphone ? (
        <>
          <li>
            Abrí esta página en <strong>Safari</strong>.
          </li>
          <li>
            Tocá <strong>Compartir</strong> (el cuadrado con la flecha hacia arriba).
          </li>
          <li>
            Elegí <strong>“Agregar a inicio”</strong> y confirmá.
          </li>
          <li>Abrí la app desde el ícono nuevo y activá las notificaciones.</li>
        </>
      ) : (
        <>
          <li>
            En Chrome, tocá el menú <strong>⋮</strong>.
          </li>
          <li>
            Elegí <strong>“Instalar app”</strong> o <strong>“Agregar a la pantalla principal”</strong>.
          </li>
          <li>Abrí la app desde el ícono y activá las notificaciones.</li>
        </>
      )}
    </ol>
  );
};

/** Tarjeta de Mi ficha: activar o desactivar los avisos en este celular. */
export const TarjetaNotificaciones: React.FC = () => {
  const { estado, ocupado, error, activar, desactivar } = useNotificaciones();
  // Sin claves configuradas no se muestra nada (el admin lo ve en el README).
  if (estado === null || estado === 'sin-configurar') return null;

  return (
    <section className="bg-white rounded-xl p-4 shadow-sm border border-[#e0e3e6]/60 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[22px] text-[#00183a]">
          {estado === 'activo' ? 'notifications_active' : 'notifications'}
        </span>
        <h3 className="font-heading font-bold text-[16px] text-[#00183a]">Notificaciones</h3>
        {estado === 'activo' && (
          <span className="ml-auto font-heading text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            Activadas
          </span>
        )}
      </div>

      {estado === 'activo' && (
        <>
          <p className="font-sans text-[13px] text-[#44474f]">
            Te llegan los avisos del club en este celular: convocatorias, cuotas y vencimientos.
          </p>
          <button
            type="button"
            onClick={desactivar}
            disabled={ocupado}
            className="self-start font-heading text-[12px] font-bold text-[#747780] underline disabled:opacity-50"
          >
            Desactivar en este celular
          </button>
        </>
      )}

      {estado === 'inactivo' && (
        <>
          <p className="font-sans text-[13px] text-[#44474f]">
            Activalas para que te lleguen la convocatoria, los recordatorios de cuota y los vencimientos.
          </p>
          <button
            type="button"
            onClick={activar}
            disabled={ocupado}
            className="h-12 rounded-lg bg-[#b51a1b] text-white font-heading text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            {ocupado ? 'Activando…' : 'Activar notificaciones'}
          </button>
        </>
      )}

      {estado === 'instalar-primero' && (
        <>
          <p className="font-sans text-[13px] text-[#44474f]">
            En iPhone los avisos solo llegan si la app está en la pantalla de inicio:
          </p>
          <PasosInstalar />
        </>
      )}

      {estado === 'bloqueado' && (
        <p className="font-sans text-[13px] text-[#44474f]">
          Las bloqueaste en este celular. Para activarlas: Ajustes del celular → Notificaciones → Elbio LUD →
          Permitir. Después volvé a abrir la app.
        </p>
      )}

      {estado === 'no-soportado' && (
        <p className="font-sans text-[13px] text-[#44474f]">
          Este navegador no permite notificaciones. Instalá la app en el celular (desde Chrome en Android o Safari
          en iPhone) para recibir los avisos.
        </p>
      )}

      {error && <p className="font-sans text-[12px] text-[#ba1a1a]">{error}</p>}
    </section>
  );
};

/**
 * Ventana que aparece al abrir la app (o al volver a ella) mientras las
 * notificaciones no estén activadas en ese celular. "Ahora no" la cierra
 * hasta la próxima vez que se abra la app; activadas, no aparece más.
 */
export const VentanaNotificaciones: React.FC = () => {
  const { estado, ocupado, error, activar, refrescar } = useNotificaciones();
  const [cerrada, setCerrada] = useState(false);
  const [listo, setListo] = useState(false);
  const [, setInstalacion] = useState(0);
  useEffect(() => alCambiarInstalacion(() => setInstalacion((n) => n + 1)), []);

  // Volver a la app (desde otra app o desde Ajustes) cuenta como abrirla de nuevo.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') {
        setCerrada(false);
        refrescar();
      }
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [refrescar]);

  // Recién activadas: se muestra "¡Listo!" un momento y se cierra sola.
  useEffect(() => {
    if (estado !== 'activo' || !listo) return;
    const t = setTimeout(() => setListo(false), 1800);
    return () => clearTimeout(t);
  }, [estado, listo]);

  const pendiente = estado === 'inactivo' || estado === 'instalar-primero' || estado === 'bloqueado';
  // En el celular, primero se instala la app (VentanaInstalar); las notificaciones se piden después.
  if (!listo && (cerrada || !pendiente || modoInstalar() !== 'listo')) return null;

  const tocarActivar = async () => {
    // El cartel de Apple / Android solo aparece si se pide al tocar un botón.
    await activar();
    setListo(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-[#00183a]/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 flex flex-col items-center text-center gap-3">
        <img src="/escudo.png" alt="" className="h-16 w-auto" />
        {listo && estado === 'activo' ? (
          <>
            <span className="material-symbols-outlined text-[44px] text-emerald-600">check_circle</span>
            <h2 className="font-heading font-bold text-[20px] text-[#00183a]">¡Notificaciones activadas!</h2>
            <p className="font-sans text-[13px] text-[#44474f]">Te van a llegar los avisos del club en este celular.</p>
          </>
        ) : (
          <>
            <h2 className="font-heading font-bold text-[20px] text-[#00183a] leading-tight">Activá las notificaciones</h2>
            <p className="font-sans text-[13px] text-[#44474f]">
              Así te enterás de la convocatoria, los vencimientos de tu ficha y las cuotas, sin tener que entrar a la app.
            </p>

            {estado === 'inactivo' && (
              <button
                type="button"
                onClick={tocarActivar}
                disabled={ocupado}
                className="w-full h-13 py-3.5 rounded-xl bg-[#b51a1b] text-white font-heading text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[22px]">notifications_active</span>
                {ocupado ? 'Activando…' : 'Activar notificaciones'}
              </button>
            )}

            {estado === 'instalar-primero' && (
              <div className="w-full text-left bg-[#f2f4f7] rounded-lg p-3 flex flex-col gap-2">
                <p className="font-heading text-[12px] font-bold text-[#00183a]">
                  En iPhone, primero agregá la app a la pantalla de inicio:
                </p>
                <PasosInstalar compacto />
              </div>
            )}

            {estado === 'bloqueado' && (
              <div className="w-full text-left bg-[#ffdad6]/60 rounded-lg p-3 flex flex-col gap-1">
                <p className="font-heading text-[12px] font-bold text-[#410002]">Las notificaciones están bloqueadas</p>
                <p className="font-sans text-[12px] text-[#410002]">
                  {esIOS()
                    ? 'Abrí Ajustes del iPhone → Notificaciones → Elbio LUD → activá "Permitir notificaciones". Después volvé a la app.'
                    : 'Tocá el candado al lado de la dirección (o Ajustes → Apps → Chrome / Elbio LUD → Notificaciones) y permitilas. Después volvé a la app.'}
                </p>
              </div>
            )}

            {error && <p className="font-sans text-[12px] text-[#ba1a1a]">{error}</p>}

            <button
              type="button"
              onClick={() => {
                setCerrada(true);
                setListo(false);
              }}
              className="font-heading text-[12px] font-bold text-[#747780] underline"
            >
              Ahora no
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/** Cartel para imprimir o mandar al grupo: QR a la app y los pasos para instalarla y activar los avisos. */
export const CartelModal: React.FC<{ abierto: boolean; onClose: () => void }> = ({ abierto, onClose }) => {
  const t = useTextos();
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const url = window.location.origin;

  useEffect(() => {
    if (!abierto) return;
    QRCode.toDataURL(url, { width: 520, margin: 1, color: { dark: '#00183a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [abierto, url]);

  if (!abierto) return null;

  const textoGrupo =
    `📲 *App del plantel — Elbio Fernández*\n\n` +
    `1. Entrá a ${url}\n` +
    `2. Agregala al inicio:\n` +
    `   • iPhone (Safari): Compartir → "Agregar a inicio"\n` +
    `   • Android (Chrome): menú ⋮ → "Instalar app"\n` +
    `3. Abrila desde el ícono, entrá con tu celular y tu cédula\n` +
    `4. Tocá *"Activar notificaciones"*\n\n` +
    `Ahí te van a llegar la convocatoria, los avisos y los recordatorios. ¡Arriba Elbio!`;

  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'App del plantel — Elbio Fernández', text: textoGrupo });
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }
    await copiar();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoGrupo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <VentanaImprimible className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4">
      <div className="area-impresion w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="no-imprimir flex items-center justify-between border-b border-[#e0e3e6] px-5 py-3">
          <h3 className="font-heading font-bold text-[16px] text-[#00183a]">Cartel para el plantel</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* El cartel */}
        <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <span className="font-heading text-[12px] font-extrabold uppercase tracking-widest text-[#b51a1b]">
              Club Elbio Fernández · {t.categoria}
            </span>
            <h2 className="font-heading font-black text-[26px] leading-tight text-[#00183a]">
              Bajate la app del plantel
            </h2>
            <p className="font-sans text-[13px] text-[#44474f]">
              Convocatorias, cuotas y avisos del club, directo en tu celular.
            </p>
          </div>

          {qr ? (
            <img src={qr} alt={`Código QR a ${url}`} className="w-56 h-56" />
          ) : (
            <div className="w-56 h-56 bg-[#f2f4f7] rounded-lg" />
          )}
          <span className="font-heading text-[14px] font-bold text-[#00183a] break-all">
            {url.replace(/^https?:\/\//, '')}
          </span>

          <ol className="w-full text-left flex flex-col gap-2.5">
            {[
              ['qr_code_scanner', 'Escaneá el código con la cámara.'],
              ['add_to_home_screen', 'iPhone (Safari): Compartir → “Agregar a inicio”. Android (Chrome): menú ⋮ → “Instalar app”.'],
              ['login', 'Abrila desde el ícono y entrá con tu celular y tu cédula.'],
              ['notifications_active', 'Tocá “Activar notificaciones”. ¡Listo!'],
            ].map(([icono, paso], i) => (
              <li key={icono} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#00183a] text-white font-heading text-[13px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="font-sans text-[13px] text-[#191c1e] pt-1">{paso}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="no-imprimir border-t border-[#e0e3e6] px-5 py-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Imprimir / guardar PDF
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={compartir}
              className="flex-1 h-11 rounded-lg bg-[#b51a1b] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              Compartir
            </button>
            <button
              type="button"
              onClick={copiar}
              className="h-11 px-3 rounded-lg bg-[#e6e8eb] text-[#00183a] font-heading text-[12px] font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">{copiado ? 'check' : 'content_copy'}</span>
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </VentanaImprimible>
  );
};
