const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local de hoy como YYYY-MM-DD. */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Período (YYYY-MM) del mes actual. */
export function periodoActual(): string {
  return hoyISO().slice(0, 7);
}

/** '2025-04' → 'Abril 2025'. */
export function nombrePeriodo(period: string): string {
  const [anio, mes] = period.split('-').map(Number);
  return MESES[mes - 1] ? `${MESES[mes - 1]} ${anio}` : period;
}

/** Días desde hoy hasta una fecha YYYY-MM-DD (negativo si ya pasó). */
export function diasHasta(fechaISO: string): number {
  const [a, m, d] = fechaISO.split('-').map(Number);
  if (!a || !m || !d) return 0;
  const [ha, hm, hd] = hoyISO().split('-').map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86_400_000);
}

/** Timestamp → 'dd/mm'. */
export function diaMes(timestamp: string): string {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** Timestamp → 'Hoy 08:31' / 'Ayer 19:24' / '12/04 10:00'. */
export function momentoRelativo(timestamp: string): string {
  const d = new Date(timestamp);
  const hora = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const dias = -diasHasta(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  if (dias === 0) return `Hoy ${hora}`;
  if (dias === 1) return `Ayer ${hora}`;
  return `${diaMes(timestamp)} ${hora}`;
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** '2025-10-22' → '22 Oct 2025' (vacío si la fecha no es válida). */
export function fechaCorta(fechaISO: string): string {
  const [a, m, d] = fechaISO.split('-').map(Number);
  return a && m && d ? `${d} ${MESES_CORTOS[m - 1]} ${a}` : '';
}

/** '2025-10-22' → 'Oct 2025'. */
export function mesAnioCorto(fechaISO: string): string {
  const [a, m] = fechaISO.split('-').map(Number);
  return a && m ? `${MESES_CORTOS[m - 1]} ${a}` : '';
}

/** Suma (o resta) meses a un período YYYY-MM. */
export function sumarMeses(period: string, meses: number): string {
  const [a, m] = period.split('-').map(Number);
  const total = a * 12 + (m - 1) + meses;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}
