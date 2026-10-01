import React, { useState } from 'react';
import { Player, AutomationRule, SentMessage } from '../types';
import { CLUB_CREST_URL, CLUB_CREST_WATERMARK } from '../data/initialData';
import { ClaveTexto, useTextos } from '../lib/textos';
import { diasProximoVencimiento } from '../lib/habilitacion';
import { diasHasta, fechaCorta, hoyISO } from '../lib/fechas';
import { rellenarPlantilla } from '../lib/whatsapp';
import { variablesMensaje } from '../lib/mensajes';
import { EnvioAviso } from '../components/EnvioAvisoModal';

export type ClavePlantilla = Extract<
  ClaveTexto,
  'plantilla_vencimiento' | 'plantilla_cuota' | 'plantilla_convocatoria' | 'plantilla_cumpleanios'
>;

export const PLANTILLAS: { clave: ClavePlantilla; titulo: string; icono: string }[] = [
  { clave: 'plantilla_vencimiento', titulo: 'Vencimiento de ficha o carné', icono: 'medical_services' },
  { clave: 'plantilla_convocatoria', titulo: 'Convocatoria / citación', icono: 'sports_soccer' },
  { clave: 'plantilla_cuota', titulo: 'Recordatorio de cuota', icono: 'payments' },
  { clave: 'plantilla_cumpleanios', titulo: 'Saludo de cumpleaños', icono: 'cake' },
];

interface AlertasVencimientosScreenProps {
  players: Player[];
  rules: AutomationRule[];
  sentMessages: SentMessage[];
  onToggleRule: (ruleId: string) => void;
  onAbrirEnvio: (envio: EnvioAviso) => void;
  onOpenNewBroadcastModal: () => void;
  /** Sin definir = no puede editar plantillas (solo admin). */
  onEditarPlantilla?: (clave: ClavePlantilla) => void;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

/** Días hasta el próximo cumpleaños (0 = hoy), o null si no hay fecha. */
function diasHastaCumple(fechaNacimiento?: string): number | null {
  if (!fechaNacimiento) return null;
  const hoy = hoyISO();
  const anio = Number(hoy.slice(0, 4));
  const mmdd = fechaNacimiento.slice(5, 10);
  const d = diasHasta(`${anio}-${mmdd}`);
  return d >= 0 ? d : diasHasta(`${anio + 1}-${mmdd}`);
}

const Tarjeta: React.FC<{
  icono: string;
  colorIcono: string;
  titulo: string;
  subtitulo: string;
  children?: React.ReactNode;
}> = ({ icono, colorIcono, titulo, subtitulo, children }) => (
  <div className="bg-[#f2f4f7] rounded-lg p-3 flex flex-col gap-2.5">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorIcono}`}>
        <span className="material-symbols-outlined text-[18px]">{icono}</span>
      </div>
      <div className="min-w-0">
        <h3 className="font-heading text-[14px] font-bold text-[#00183a] truncate">{titulo}</h3>
        <p className="font-sans text-[12px] text-[#44474f]">{subtitulo}</p>
      </div>
    </div>
    {children}
  </div>
);

const BotonAviso: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({
  onClick,
  children,
  disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full bg-[#b51a1b] hover:bg-[#d93630] text-white rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 font-heading text-[12px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all disabled:opacity-50"
  >
    <span className="material-symbols-outlined text-[18px]">notifications_active</span>
    <span>{children}</span>
  </button>
);

const Chips: React.FC<{ items: { id: string; texto: string; rojo?: boolean }[] }> = ({ items }) => (
  <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
    {items.map((i) => (
      <span
        key={i.id}
        className={`bg-white px-2 py-1 rounded-md shadow-xs shrink-0 border border-[#e0e3e6] font-heading text-[10px] font-bold ${
          i.rojo ? 'text-[#b51a1b]' : 'text-[#00183a]'
        }`}
      >
        {i.texto}
      </span>
    ))}
  </div>
);

// Qué hace cada regla: el aviso automático diario (api/avisos-automaticos) y la tarjeta de esta pantalla.
const DESCRIPCION_REGLA: Record<string, (t: ReturnType<typeof useTextos>) => string> = {
  carne_30_dias: (t) =>
    `Aviso automático al jugador cuando a su ficha médica o carné LUD le faltan ${t.dias_aviso_preventivo} días.`,
  alerta_urgente: (t) =>
    `Aviso automático cuando faltan ${t.dias_alerta_urgente} días y el día que vence. En la lista, en rojo.`,
  cumpleanios: () => 'Saludo automático el día del cumpleaños.',
  cuota_mensual: (t) =>
    `Recordatorio automático de la cuota pendiente: 3 días antes y el día ${t.cuota_dia_vencimiento}, cuando vence.`,
};

const TITULO_REGLA: Record<string, (t: ReturnType<typeof useTextos>) => string> = {
  carne_30_dias: (t) => `Vencimientos a ${t.dias_aviso_preventivo} días`,
  alerta_urgente: (t) => `Urgentes (${t.dias_alerta_urgente} días o vencidos)`,
  cumpleanios: () => 'Cumpleaños de la semana',
  cuota_mensual: () => 'Cuotas pendientes',
};

export const AlertasVencimientosScreen: React.FC<AlertasVencimientosScreenProps> = ({
  players,
  rules,
  sentMessages,
  onToggleRule,
  onAbrirEnvio,
  onOpenNewBroadcastModal,
  onEditarPlantilla,
  showToast,
}) => {
  const t = useTextos();
  const [activeSubTab, setActiveSubTab] = useState<'automaticos' | 'historial' | 'plantillas'>('automaticos');

  // Una regla sin cargar (o sin reglas) cuenta como activa.
  const activa = (clave: string) => rules.find((r) => r.key === clave)?.active ?? true;
  const diasPreventivo = Number(t.dias_aviso_preventivo) || 30;
  const diasUrgente = Number(t.dias_alerta_urgente) || 5;

  const limiteVencimientos = activa('carne_30_dias') ? diasPreventivo : activa('alerta_urgente') ? diasUrgente : -Infinity;
  const porVencer = players
    .filter((p) => diasProximoVencimiento(p) <= limiteVencimientos)
    .sort((a, b) => diasProximoVencimiento(a) - diasProximoVencimiento(b));
  const urgentes = porVencer.filter((p) => diasProximoVencimiento(p) <= diasUrgente);

  const convocados = players.filter((p) => p.matchStatus.lineupRole !== 'BAJA');
  const deudores = players.filter((p) => p.dues.debtAmount > 0 || p.dues.status === 'overdue');
  const cumpleanieros = players
    .map((p) => ({ p, d: diasHastaCumple(p.birthDate) }))
    .filter((x): x is { p: Player; d: number } => x.d !== null && x.d <= 7)
    .sort((a, b) => a.d - b.d);

  const tab = (id: typeof activeSubTab, label: string) => (
    <button
      onClick={() => setActiveSubTab(id)}
      role="tab"
      aria-selected={activeSubTab === id}
      className={`py-2 px-1 rounded-lg text-center font-heading text-[12px] font-bold transition-all duration-200 ${
        activeSubTab === id ? 'bg-white text-[#00183a] shadow-sm' : 'text-[#44474f] hover:text-[#00183a]'
      }`}
      type="button"
    >
      {label}
    </button>
  );

  const listaMensajes = (mensajes: SentMessage[]) =>
    mensajes.length === 0 ? (
      <p className="font-sans text-[13px] text-[#44474f]">Todavía no se mandó ningún aviso desde la app.</p>
    ) : (
      <div className="space-y-2">
        {mensajes.map((msg) => (
          <div
            key={msg.id}
            className="p-2.5 rounded-lg bg-[#f2f4f7] flex items-center justify-between gap-3 border border-[#e0e3e6]/30"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img className="w-10 h-10 rounded-full object-cover" src={msg.playerAvatar} alt={msg.playerName} />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 ${msg.avatarIndicatorColor} rounded-full border border-white`}
                ></span>
              </div>
              <div className="min-w-0">
                <h4 className="font-heading text-[12px] font-bold text-[#00183a] truncate">{msg.playerName}</h4>
                <p className="font-sans text-[11px] text-[#44474f] truncate">{msg.topic}</p>
              </div>
            </div>
            <span className="font-heading text-[10px] font-bold text-[#44474f] bg-white px-2 py-1 rounded-md border border-[#e0e3e6] shrink-0">
              {msg.status}
            </span>
          </div>
        ))}
      </div>
    );

  return (
    <div className="flex flex-col w-full space-y-4 pb-28">
      {/* Crest & Identity Sub-header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0d2d59] to-[#00183a] text-white p-4 shadow-md">
        <div className="absolute -right-4 -bottom-6 w-28 h-28 opacity-15 pointer-events-none flex items-center justify-center">
          <img src={CLUB_CREST_WATERMARK} alt="" className="w-full h-full object-contain filter brightness-200" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-14 rounded-lg bg-white p-1 shadow-sm flex items-center justify-center shrink-0">
            <img src={CLUB_CREST_URL} alt="Escudo Oficial Club Elbio Fernández" className="h-12 w-auto object-contain drop-shadow" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-[10px] uppercase tracking-wider text-[#fabc4d]">
                Liga Universitaria
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#fabc4d]"></span>
              <span className="font-heading font-extrabold text-[10px] uppercase tracking-wider text-[#e0e3e6]">
                {t.categoria}
              </span>
            </div>
            <h2 className="font-heading font-bold text-[20px] tracking-tight text-white truncate">Avisos al plantel</h2>
            <p className="font-sans text-[12px] text-[#7b96c8]">Vencimientos, convocatorias y avisos por notificación</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 p-1 bg-[#e6e8eb] rounded-xl" role="tablist">
        {tab('automaticos', 'Avisos')}
        {tab('historial', 'Historial')}
        {tab('plantillas', 'Plantillas')}
      </div>

      {activeSubTab === 'automaticos' && (
        <>
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-3 border border-[#e0e3e6]/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-2.5 w-2.5 rounded-full ${urgentes.length ? 'bg-[#b51a1b] animate-pulse' : 'bg-emerald-600'}`}
                ></span>
                <span className="font-heading font-extrabold text-[10px] uppercase tracking-wider text-[#b51a1b]">
                  Para hacer hoy
                </span>
              </div>
              <span className="font-heading text-[10px] bg-[#ffdad6] text-[#410002] px-2 py-0.5 rounded-full font-bold">
                {urgentes.length} urgentes
              </span>
            </div>

            {limiteVencimientos > -Infinity && (
              <Tarjeta
                icono="medical_services"
                colorIcono="bg-[#ffdad6] text-[#ba1a1a]"
                titulo="Fichas y carnés por vencer"
                subtitulo={
                  porVencer.length
                    ? `${porVencer.length} en los próximos ${limiteVencimientos} días (${urgentes.length} urgentes o vencidos)`
                    : `Nada vence en los próximos ${limiteVencimientos} días`
                }
              >
                {porVencer.length > 0 && (
                  <>
                    <Chips
                      items={porVencer.map((p) => {
                        const d = diasProximoVencimiento(p);
                        return {
                          id: p.id,
                          texto: `${p.firstName[0]}. ${p.lastName} (${d <= 0 ? 'vencido' : `${d}d`})`,
                          rojo: activa('alerta_urgente') && d <= diasUrgente,
                        };
                      })}
                    />
                    <BotonAviso
                      onClick={() =>
                        onAbrirEnvio({
                          titulo: 'Aviso de vencimiento',
                          tema: 'Aviso de vencimiento',
                          plantilla: t.plantilla_vencimiento,
                          destinatarios: porVencer,
                        })
                      }
                    >
                      Avisar ({porVencer.length})
                    </BotonAviso>
                  </>
                )}
              </Tarjeta>
            )}

            <Tarjeta
              icono="sports_soccer"
              colorIcono="bg-[#d7e3ff] text-[#00183a]"
              titulo={`Convocatoria: ${t.fecha} vs ${t.rival}`}
              subtitulo={`${t.partido_dia} ${t.partido_hora} • ${t.cancha} • ${convocados.length} convocados`}
            >
              <BotonAviso
                onClick={() =>
                  onAbrirEnvio({
                    titulo: 'Convocatoria',
                    tema: `Convocatoria ${t.fecha}`,
                    plantilla: t.plantilla_convocatoria,
                    destinatarios: convocados,
                  })
                }
              >
                Convocar
              </BotonAviso>
            </Tarjeta>

            {activa('cuota_mensual') && deudores.length > 0 && (
              <Tarjeta
                icono="payments"
                colorIcono="bg-[#fff8e1] text-[#b76e00]"
                titulo="Cuotas pendientes"
                subtitulo={`${deudores.length} jugadores deben cuotas`}
              >
                <BotonAviso
                  onClick={() =>
                    onAbrirEnvio({
                      titulo: 'Recordatorio de cuota',
                      tema: 'Recordatorio de cuota',
                      plantilla: t.plantilla_cuota,
                      destinatarios: deudores,
                    })
                  }
                >
                  Recordar ({deudores.length})
                </BotonAviso>
              </Tarjeta>
            )}

            {activa('cumpleanios') && cumpleanieros.length > 0 && (
              <Tarjeta
                icono="cake"
                colorIcono="bg-[#ffe082]/50 text-[#7a5900]"
                titulo="Cumpleaños de la semana"
                subtitulo={cumpleanieros
                  .map(({ p, d }) => `${p.firstName} ${p.lastName} (${d === 0 ? 'hoy' : `en ${d}d`})`)
                  .join(' · ')}
              >
                <BotonAviso
                  onClick={() =>
                    onAbrirEnvio({
                      titulo: 'Saludo de cumpleaños',
                      tema: 'Saludo de cumpleaños',
                      plantilla: t.plantilla_cumpleanios,
                      destinatarios: cumpleanieros.map((x) => x.p),
                    })
                  }
                >
                  Saludar
                </BotonAviso>
              </Tarjeta>
            )}
          </div>

          {/* Reglas: qué tarjetas muestra la app */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-heading font-bold text-[18px] text-[#00183a]">Avisos activos</h3>
                <p className="font-sans text-[12px] text-[#44474f]">
                  Salen solos todos los días a la mañana, por notificación, a quienes las activaron.
                </p>
              </div>
              <span className="font-heading text-[10px] bg-[#d7e3ff] text-[#00183a] px-2 py-0.5 rounded-full font-bold">
                {rules.filter((r) => r.active).length} ACTIVOS
              </span>
            </div>

            <div className="space-y-2">
              {rules.map((rule) => {
                const titulo = (rule.key && TITULO_REGLA[rule.key]?.(t)) || rule.title;
                return (
                <div
                  key={rule.id}
                  className="rounded-xl bg-white p-3.5 shadow-sm flex items-center justify-between gap-3 border border-[#e0e3e6]/40"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${rule.iconBgClass} ${rule.iconColorClass} flex items-center justify-center shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{rule.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-heading text-[14px] font-bold text-[#00183a]">
                        {titulo}
                      </h4>
                      <p className="font-sans text-[12px] text-[#44474f] mt-0.5">
                        {(rule.key && DESCRIPCION_REGLA[rule.key]?.(t)) || rule.description}
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-1">
                    <input
                      type="checkbox"
                      checked={rule.active}
                      aria-label={titulo}
                      onChange={() => {
                        onToggleRule(rule.id);
                        showToast(
                          `${titulo}: ${!rule.active ? 'activado' : 'pausado'}`,
                          rule.active ? 'toggle_off' : 'toggle_on',
                          rule.active ? 'warning' : 'success'
                        );
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#e0e3e6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d2d59]"></div>
                  </label>
                </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm space-y-3 border border-[#e0e3e6]/50">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-[18px] text-[#00183a]">Últimos envíos</h3>
              <button
                onClick={() => setActiveSubTab('historial')}
                className="font-heading text-[10px] text-[#00183a] font-bold underline uppercase"
              >
                Ver todos
              </button>
            </div>
            {listaMensajes(sentMessages.slice(0, 3))}
          </div>
        </>
      )}

      {activeSubTab === 'historial' && (
        <div className="rounded-xl bg-white p-4 shadow-sm space-y-3 border border-[#e0e3e6]/50">
          <div>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">Historial de envíos</h3>
            <p className="font-sans text-[12px] text-[#44474f]">
              Avisos mandados desde la app ({sentMessages.length}).
            </p>
          </div>
          {listaMensajes(sentMessages)}
        </div>
      )}

      {activeSubTab === 'plantillas' && (
        <div className="space-y-3">
          {PLANTILLAS.map(({ clave, titulo, icono }) => {
            const ejemplo = rellenarPlantilla(t[clave], {
              ...variablesMensaje(t, players[0]),
              ...(players[0] ? {} : { nombre: 'Juan', vencimiento: fechaCorta(hoyISO()), documento: 'ficha médica', deuda: '1.400' }),
            });
            return (
              <div key={clave} className="rounded-xl bg-white p-4 shadow-sm space-y-3 border border-[#e0e3e6]/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00183a] text-[20px]">{icono}</span>
                  <h3 className="font-heading font-bold text-[16px] text-[#00183a]">{titulo}</h3>
                </div>
                <div className="bg-[#f3f7ff] rounded-lg p-3 shadow-xs border border-[#d7e3ff]">
                  <p className="font-sans text-[13px] text-[#191c1e] leading-relaxed whitespace-pre-line">{ejemplo}</p>
                </div>
                <div className="flex items-center gap-2">
                  {onEditarPlantilla && (
                    <button
                      onClick={() => onEditarPlantilla(clave)}
                      className="flex-1 py-2.5 px-3 bg-[#e6e8eb] hover:bg-[#eceef1] text-[#00183a] rounded-lg font-heading text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      Editar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <p className="font-sans text-[11px] text-[#747780] px-1">
            El ejemplo usa los datos de {players[0] ? `${players[0].firstName} ${players[0].lastName}` : 'un jugador'}.
          </p>
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={onOpenNewBroadcastModal}
          className="w-full bg-[#00183a] hover:bg-[#0d2d59] text-white h-13 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">campaign</span>
          <span className="font-heading text-[14px] font-bold uppercase tracking-wider">Crear mensaje al plantel</span>
        </button>
      </div>
    </div>
  );
};
