import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { bloquearPorDeuda, estadoHabilitacion } from '../lib/habilitacion';
import { useTextos } from '../lib/textos';
import { fechaCorta } from '../lib/fechas';
import { corteTexto, describirEstudio, estadoEstudio } from '../lib/estudio';

export interface FichaMedicaForm {
  vencimiento: string;
  clinica: string;
}

export interface EstudioForm {
  /** Último examen aprobado ('YYYY-MM-DD'). */
  ultimoExamen: string | null;
  excepcion: 'recibido' | 'articulo' | null;
}

export interface CarneLudForm {
  idFederado: number | null;
  vencimiento: string | null;
  archivo: File | null;
}

interface DocumentosModalProps {
  player: Player | null;
  /** false = modo demo: los archivos no se guardan. */
  persistent: boolean;
  onClose: () => void;
  onGuardarHabilitacion: (override: Player['eligibilityOverride']) => Promise<boolean>;
  onCargarFichaMedica: (f: FichaMedicaForm) => Promise<boolean>;
  onGuardarCarneLud: (c: CarneLudForm) => Promise<boolean>;
  onGuardarEstudio: (e: EstudioForm) => Promise<boolean>;
  onVerArchivo: (ruta: string) => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

type Seccion = 'hab' | 'ficha' | 'estudio' | 'carne';

const inputClass =
  'h-11 w-full px-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] text-[#191c1e] outline-none focus:bg-white focus:border-[#00183a] select-text';
const labelClass = 'font-heading text-[11px] font-bold text-[#00183a] uppercase tracking-wide';
const btnPrimario =
  'h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold uppercase disabled:opacity-60';

const Seccion: React.FC<{ titulo: string; icono: string; children: React.ReactNode }> = ({ titulo, icono, children }) => (
  <section className="flex flex-col gap-3 border border-[#e0e3e6] rounded-xl p-3.5">
    <h4 className="flex items-center gap-1.5 font-heading font-bold text-[14px] text-[#00183a]">
      <span className="material-symbols-outlined text-[20px] text-[#b51a1b]">{icono}</span>
      {titulo}
    </h4>
    {children}
  </section>
);

/** Valida un archivo elegido: imagen o PDF de hasta 10 MB. Devuelve el error o null. */
function errorArchivo(f: File | null): string | null {
  if (!f) return null;
  if (!/^image\/|^application\/pdf$/.test(f.type) && !/\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(f.name))
    return 'El archivo tiene que ser una foto o un PDF.';
  if (f.size > MAX_BYTES) return 'El archivo pesa más de 10 MB. Probá con una foto más liviana.';
  return null;
}

const SelectorArchivo: React.FC<{ archivo: File | null; onChange: (f: File | null) => void; disabled?: boolean }> = ({
  archivo,
  onChange,
  disabled,
}) => (
  <label
    className={`flex items-center gap-2 h-11 px-3 rounded-lg border border-dashed border-[#747780] font-sans text-[13px] text-[#44474f] ${
      disabled ? 'opacity-50' : 'cursor-pointer hover:bg-[#f2f4f7]'
    }`}
  >
    <span className="material-symbols-outlined text-[20px] text-[#00183a]">{archivo ? 'task' : 'add_a_photo'}</span>
    <span className="truncate">{archivo ? archivo.name : 'Foto o PDF (opcional)'}</span>
    <input
      type="file"
      accept="image/*,application/pdf"
      className="hidden"
      disabled={disabled}
      onChange={(e) => onChange(e.target.files?.[0] ?? null)}
    />
  </label>
);

/** Habilitación manual y carga de ficha médica / carné LUD (admin y DT). */
export const DocumentosModal: React.FC<DocumentosModalProps> = ({
  player,
  persistent,
  onClose,
  onGuardarHabilitacion,
  onCargarFichaMedica,
  onGuardarCarneLud,
  onGuardarEstudio,
  onVerArchivo,
}) => {
  const t = useTextos();
  const [modo, setModo] = useState<'auto' | 'habilitado' | 'inhabilitado'>('auto');
  const [motivo, setMotivo] = useState('');
  const [ficha, setFicha] = useState<FichaMedicaForm>({ vencimiento: '', clinica: '' });
  const [estudio, setEstudio] = useState<EstudioForm>({ ultimoExamen: null, excepcion: null });
  const [carne, setCarne] = useState<CarneLudForm>({ idFederado: null, vencimiento: null, archivo: null });
  const [guardando, setGuardando] = useState<Seccion | null>(null);
  const [error, setError] = useState<{ seccion: Seccion; texto: string } | null>(null);

  useEffect(() => {
    if (!player) return;
    setModo(player.eligibilityOverride?.status ?? 'auto');
    setMotivo(player.eligibilityOverride?.reason ?? '');
    setFicha({ vencimiento: '', clinica: player.medicalCertificate.clinic });
    setEstudio({ ultimoExamen: player.study?.lastExam ?? null, excepcion: player.study?.exception ?? null });
    setCarne({
      idFederado: player.ludRegistration.federatedId || null,
      vencimiento: player.ludRegistration.cardExpiry ?? null,
      archivo: null,
    });
    setError(null);
  }, [player]);

  if (!player) return null;

  const automatico = estadoHabilitacion(
    { ...player, eligibilityOverride: undefined },
    { bloquearPorDeuda: bloquearPorDeuda(t.bloquear_por_deuda) }
  );
  const mc = player.medicalCertificate;

  const guardar = async (seccion: Seccion, accion: () => Promise<boolean>) => {
    setError(null);
    setGuardando(seccion);
    await accion();
    setGuardando(null);
  };

  const handleHabilitacion = () =>
    guardar('hab', () =>
      onGuardarHabilitacion(modo === 'auto' ? undefined : { status: modo, reason: motivo.trim() || undefined })
    );

  const handleFicha = () => {
    if (!ficha.vencimiento) return setError({ seccion: 'ficha', texto: 'Poné la fecha de vencimiento de la ficha.' });
    return guardar('ficha', async () => {
      const ok = await onCargarFichaMedica(ficha);
      if (ok) setFicha((f) => ({ ...f, vencimiento: '' }));
      return ok;
    });
  };

  const handleEstudio = () => guardar('estudio', () => onGuardarEstudio(estudio));
  const est = estadoEstudio(player);

  const handleCarne = () => {
    const e = errorArchivo(carne.archivo);
    if (e) return setError({ seccion: 'carne', texto: e });
    return guardar('carne', async () => {
      const ok = await onGuardarCarneLud(carne);
      if (ok) setCarne((c) => ({ ...c, archivo: null }));
      return ok;
    });
  };

  const Error = ({ seccion }: { seccion: Seccion }) =>
    error?.seccion === seccion ? (
      <p role="alert" className="rounded-lg bg-[#ffdad6] text-[#410002] px-3 py-2 font-sans text-[13px]">
        {error.texto}
      </p>
    ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[#e0e3e6] px-5 py-3">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-[16px] text-[#00183a] truncate">
              {player.firstName} {player.lastName}
            </h3>
            <p className="font-sans text-[11px] text-[#747780]">Habilitación y documentos</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1] shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {!persistent && (
            <p className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 font-sans text-[12px] text-amber-900">
              Modo demo: los cambios no se guardan y no se puede subir la foto del carné.
            </p>
          )}

          <Seccion titulo="Habilitación" icono="verified_user">
            <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Habilitación">
              {(
                [
                  ['auto', 'Automática', automatico.habilitado ? 'Hoy: habilitado' : `Hoy: no habilitado (${automatico.motivo})`],
                  ['habilitado', 'Habilitado', 'Aunque tenga algo vencido'],
                  ['inhabilitado', 'Inhabilitado', 'Por ejemplo: suspensión o lesión'],
                ] as const
              ).map(([valor, titulo, ayuda]) => (
                <label
                  key={valor}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer ${
                    modo === valor ? 'border-[#00183a] bg-[#f2f4f7]' : 'border-[#e0e3e6]'
                  }`}
                >
                  <input
                    type="radio"
                    name="habilitacion"
                    className="mt-1 accent-[#00183a]"
                    checked={modo === valor}
                    onChange={() => setModo(valor)}
                  />
                  <span className="flex flex-col">
                    <span className="font-heading text-[13px] font-bold text-[#00183a]">{titulo}</span>
                    <span className="font-sans text-[11px] text-[#44474f]">{ayuda}</span>
                  </span>
                </label>
              ))}
            </div>
            {modo !== 'auto' && (
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Motivo</span>
                <input
                  className={inputClass}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder={modo === 'inhabilitado' ? 'Ej. Suspendido 2 fechas' : 'Ej. Ficha en trámite, autorizada por la liga'}
                />
              </label>
            )}
            <Error seccion="hab" />
            <button type="button" onClick={handleHabilitacion} disabled={guardando !== null} className={btnPrimario}>
              {guardando === 'hab' ? 'Guardando…' : 'Guardar habilitación'}
            </button>
          </Seccion>

          <Seccion titulo="Carné de salud (ficha médica)" icono="medical_services">
            <div className="flex items-center justify-between gap-2 bg-[#f2f4f7] rounded-lg px-3 py-2">
              <div className="font-sans text-[12px] text-[#44474f]">
                {mc.expiryDate ? (
                  <>
                    <strong className={mc.daysRemaining <= 0 ? 'text-[#ba1a1a]' : 'text-[#00183a]'}>
                      {mc.daysRemaining <= 0 ? 'Vencida el' : 'Vence el'} {fechaCorta(mc.expiryDate)}
                    </strong>
                  </>
                ) : (
                  'Sin ficha médica cargada'
                )}
              </div>
            </div>
            <p className="font-heading text-[11px] font-bold text-[#44474f]">Cargar ficha nueva</p>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Vence *</span>
              <input
                type="date"
                className={inputClass}
                value={ficha.vencimiento}
                onChange={(e) => setFicha({ ...ficha, vencimiento: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClass}>Clínica / prestador</span>
              <input
                className={inputClass}
                value={ficha.clinica}
                onChange={(e) => setFicha({ ...ficha, clinica: e.target.value })}
              />
            </label>
            <Error seccion="ficha" />
            <button type="button" onClick={handleFicha} disabled={guardando !== null} className={btnPrimario}>
              {guardando === 'ficha' ? 'Guardando…' : 'Guardar ficha médica'}
            </button>
          </Seccion>

          <Seccion titulo="Estudio" icono="school">
            <div
              className={`rounded-lg px-3 py-2 font-sans text-[12px] ${
                est.estado === 'vencido'
                  ? 'bg-[#ffdad6] text-[#410002]'
                  : est.estado === 'sin_dato'
                  ? 'bg-amber-50 text-amber-900'
                  : 'bg-[#f2f4f7] text-[#44474f]'
              }`}
            >
              <strong>{describirEstudio(est)}</strong>
              <span className="block text-[11px] mt-0.5">
                La LUD pide un examen aprobado posterior al {corteTexto()}. Si está recibido o con artículo, no se
                mira la fecha.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Último examen</span>
                <input
                  type="date"
                  className={inputClass}
                  value={estudio.ultimoExamen ?? ''}
                  onChange={(e) => setEstudio({ ...estudio, ultimoExamen: e.target.value || null })}
                />
              </label>
              <div className="flex flex-col gap-2 justify-end pb-1">
                {(['recibido', 'articulo'] as const).map((exc) => (
                  <label key={exc} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-[#00183a]"
                      checked={estudio.excepcion === exc}
                      onChange={(e) => setEstudio({ ...estudio, excepcion: e.target.checked ? exc : null })}
                    />
                    <span className="font-sans text-[13px] text-[#191c1e]">{exc === 'recibido' ? 'Recibido' : 'Con artículo'}</span>
                  </label>
                ))}
              </div>
            </div>
            <Error seccion="estudio" />
            <button type="button" onClick={handleEstudio} disabled={guardando !== null} className={btnPrimario}>
              {guardando === 'estudio' ? 'Guardando…' : 'Guardar estudio'}
            </button>
          </Seccion>

          <Seccion titulo="Carné LUD" icono="badge">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Nº de carné</span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={carne.idFederado ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '');
                    setCarne({ ...carne, idFederado: v ? Number(v) : null });
                  }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className={labelClass}>Vence</span>
                <input
                  type="date"
                  className={inputClass}
                  value={carne.vencimiento ?? ''}
                  onChange={(e) => setCarne({ ...carne, vencimiento: e.target.value || null })}
                />
              </label>
            </div>
            {player.ludRegistration.cardFilePath && (
              <button
                type="button"
                onClick={() => onVerArchivo(player.ludRegistration.cardFilePath!)}
                className="self-start font-heading text-[11px] font-bold text-[#445e8d] underline"
              >
                Ver foto del carné
              </button>
            )}
            <SelectorArchivo
              archivo={carne.archivo}
              onChange={(archivo) => setCarne({ ...carne, archivo })}
              disabled={!persistent}
            />
            <Error seccion="carne" />
            <button type="button" onClick={handleCarne} disabled={guardando !== null} className={btnPrimario}>
              {guardando === 'carne' ? 'Guardando…' : 'Guardar carné LUD'}
            </button>
          </Seccion>
        </div>
      </div>
    </div>
  );
};
