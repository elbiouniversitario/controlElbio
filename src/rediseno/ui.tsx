/**
 * Piezas de UI del rediseño 2026-11 (DISENO-2026-11.md): tarjetas, botones,
 * hoja inferior, chips de estado (siempre con icono + texto, nunca solo color),
 * campos con label visible y toasts.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Clock, Loader2, X, XCircle, type LucideIcon } from 'lucide-react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// ---- Contenedores -----------------------------------------------------------
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  // Sin tailwind-merge: si className trae su propio fondo, padding o anillo, la base no lo pone
  // (dos utilidades de la misma propiedad no se pisan por orden en el className).
  const c = className ?? '';
  return (
    <section
      className={cx(
        'rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.06)]',
        !/(^|\s)bg-/.test(c) && 'bg-white',
        !/(^|\s)p-\d/.test(c) && 'p-4',
        !/(^|\s)ring-0(\s|$)/.test(c) && 'ring-1',
        !/(^|\s)ring-(?!0(\s|$)|1(\s|$))/.test(c) && 'ring-borde',
        c
      )}
    >
      {children}
    </section>
  );
}

export function Titulo({ children, accion }: { children: ReactNode; accion?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-cond text-xl font-bold uppercase tracking-wide text-navy">{children}</h2>
      {accion}
    </div>
  );
}

export function Pantalla({ titulo, accion, children }: { titulo: string; accion?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 pt-1">
        <h1 className="font-cond text-[28px] font-extrabold uppercase leading-none text-navy">{titulo}</h1>
        {accion}
      </div>
      {children}
    </div>
  );
}

// ---- Botones ----------------------------------------------------------------
type Variante = 'primario' | 'secundario' | 'peligro' | 'texto';
const VARIANTE: Record<Variante, string> = {
  primario: 'bg-marca text-white hover:bg-[#9c1617] active:bg-[#861314]',
  secundario: 'bg-white text-navy ring-1 ring-borde hover:bg-fondo',
  peligro: 'bg-white text-bad ring-1 ring-bad/40 hover:bg-red-50',
  texto: 'bg-transparent text-navy underline-offset-2 hover:underline',
};

export function Boton({
  variante = 'primario',
  cargando,
  icono: Icono,
  bloque,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean; icono?: LucideIcon; bloque?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || cargando}
      className={cx(
        'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTE[variante],
        bloque && 'w-full',
        className
      )}
    >
      {cargando ? <Loader2 className="size-5 animate-spin" aria-hidden /> : Icono && <Icono className="size-5" aria-hidden />}
      {children}
    </button>
  );
}

// ---- Estado -----------------------------------------------------------------
export type Tono = 'ok' | 'warn' | 'bad' | 'neutro';
const TONO: Record<Tono, { clase: string; icono: LucideIcon }> = {
  ok: { clase: 'bg-green-50 text-ok ring-ok/30', icono: CheckCircle2 },
  warn: { clase: 'bg-amber-50 text-warn ring-warn/30', icono: Clock },
  bad: { clase: 'bg-red-50 text-bad ring-bad/30', icono: XCircle },
  neutro: { clase: 'bg-slate-100 text-gris ring-slate-300', icono: AlertTriangle },
};

export function Chip({ tono, children, icono }: { tono: Tono; children: ReactNode; icono?: LucideIcon | null }) {
  const Icono = icono === null ? null : (icono ?? TONO[tono].icono);
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ring-1', TONO[tono].clase)}>
      {Icono && <Icono className="size-4" aria-hidden />}
      {children}
    </span>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-gris" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden /> {texto}
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-fondo px-4 py-6 text-center text-gris">{children}</p>;
}

export function ErrorCaja({ children, reintentar }: { children: ReactNode; reintentar?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl bg-red-50 p-4 text-bad ring-1 ring-bad/30">
      <p className="flex items-start gap-2">
        <XCircle className="mt-0.5 size-5 shrink-0" aria-hidden /> {children}
      </p>
      {reintentar && (
        <Boton variante="secundario" onClick={reintentar}>
          Reintentar
        </Boton>
      )}
    </div>
  );
}

// ---- Formularios ------------------------------------------------------------
export function Campo({
  label,
  ayuda,
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; ayuda?: string; error?: string | null }) {
  const id = rest.id ?? `c-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        aria-invalid={!!error || undefined}
        className={cx(
          'min-h-11 w-full rounded-xl bg-white px-3 text-base text-tinta ring-1 ring-borde placeholder:text-slate-400',
          'focus:outline-none focus:ring-2 focus:ring-navy',
          error && 'ring-bad'
        )}
      />
      {error ? (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      ) : (
        ayuda && <p className="text-sm text-gris">{ayuda}</p>
      )}
    </div>
  );
}

export function AreaTexto({
  label,
  ayuda,
  value,
  onChange,
  filas = 4,
  placeholder,
}: {
  label: string;
  ayuda?: string;
  value: string;
  onChange: (v: string) => void;
  filas?: number;
  placeholder?: string;
}) {
  const id = `a-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {label}
      </label>
      <textarea
        id={id}
        rows={filas}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white px-3 py-2 text-base text-tinta ring-1 ring-borde placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-navy"
      />
      {ayuda && <p className="text-sm text-gris">{ayuda}</p>}
    </div>
  );
}

/** Botones de opción (radio) grandes, para elegir entre 2-4 cosas. */
export function Opciones<T extends string>({
  label,
  valor,
  onChange,
  opciones,
}: {
  label: string;
  valor: T;
  onChange: (v: T) => void;
  opciones: { valor: T; texto: string }[];
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-semibold text-tinta">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={valor === o.valor}
            onClick={() => onChange(o.valor)}
            className={cx(
              'min-h-11 cursor-pointer rounded-xl px-3 text-base font-semibold ring-1 transition-colors',
              valor === o.valor ? 'bg-navy text-white ring-navy' : 'bg-white text-navy ring-borde hover:bg-fondo'
            )}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// ---- Hoja inferior ----------------------------------------------------------
export function Hoja({ titulo, onCerrar, children, pie }: { titulo: string; onCerrar: () => void; children: ReactNode; pie?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 cursor-default bg-navy/50" onClick={onCerrar} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="hoja app-nueva relative flex max-h-[92dvh] w-full max-w-[480px] flex-col rounded-t-3xl bg-white outline-none"
      >
        <div className="flex items-center justify-between gap-2 border-b border-borde px-4 py-3">
          <h2 className="font-cond text-2xl font-bold uppercase text-navy">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid size-11 cursor-pointer place-items-center rounded-full text-gris hover:bg-fondo">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">{children}</div>
        {pie && <div className="border-t border-borde px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">{pie}</div>}
      </div>
    </div>
  );
}

// ---- Toasts -----------------------------------------------------------------
type TipoToast = 'ok' | 'error';
const ToastCtx = createContext<(texto: string, tipo?: TipoToast) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ texto: string; tipo: TipoToast; n: number } | null>(null);
  const avisar = useCallback((texto: string, tipo: TipoToast = 'ok') => setToast({ texto, tipo, n: Date.now() }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <ToastCtx.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
        {toast && (
          <div
            key={toast.n}
            className={cx(
              'pointer-events-auto flex max-w-[448px] items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-white shadow-lg',
              toast.tipo === 'ok' ? 'bg-navy' : 'bg-bad'
            )}
          >
            {toast.tipo === 'ok' ? <CheckCircle2 className="size-5 shrink-0" aria-hidden /> : <XCircle className="size-5 shrink-0" aria-hidden />}
            {toast.texto}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

// ---- Datos asíncronos -------------------------------------------------------
/** Carga datos con estado de carga/error y una función para recargar. */
export function useDatos<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    setError(null);
    cargar()
      .then((d) => vivo && setDatos(d))
      .catch((e) => vivo && setError(e));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n]);
  const recargar = useCallback(() => setN((x) => x + 1), []);
  return { datos, error, recargar };
}

/** Nombre para mostrar. */
export const nombreDe = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();
