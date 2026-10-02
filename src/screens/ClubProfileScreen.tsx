import React, { useState } from 'react';
import { VentanaImprimible } from '../components/VentanaImprimible';
import { CLUB_CREST_URL } from '../data/initialData';
import { ClubRole, Player, RolClub } from '../types';
import { bloquearPorDeuda, estadoHabilitacion } from '../lib/habilitacion';
import { fechaCorta } from '../lib/fechas';
import { linkWhatsApp, normalizarCelular } from '../lib/whatsapp';
import { Textos } from '../lib/textos';
import { TextosEditor } from '../components/TextosEditor';
import { MiembrosList } from '../components/MiembrosList';
import { RolesPlantel } from '../components/RolesPlantel';
import { Miembro } from '../lib/db';

interface ClubProfileScreenProps {
  players: Player[];
  /** Tu ficha de jugador (si también jugás). Sin definir en modo demo. */
  miPerfilJugador?: {
    jugador?: Player;
    onVer: () => void;
    /** Asocia tu email a una ficha del plantel. */
    onAsociar: (jugadorId: string) => Promise<boolean>;
  };
  roles: ClubRole[];
  textos: Textos;
  onSaveTextos: (textos: Textos) => Promise<boolean>;
  persistent: boolean;
  miembros: Miembro[];
  miEmail?: string;
  onQuitarMiembro: (email: string) => Promise<void>;
  onOpenAssignRoleModal: () => void;
  /** Rol de un jugador en el club. */
  onAsignarRol: (p: Player, rol: RolClub) => Promise<boolean>;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ClubProfileScreen: React.FC<ClubProfileScreenProps> = ({
  players,
  miPerfilJugador,
  roles,
  textos,
  onSaveTextos,
  persistent,
  miembros,
  miEmail,
  onQuitarMiembro,
  onOpenAssignRoleModal,
  onAsignarRol,
  showToast,
}) => {
  // Parámetros: se guardan en "Textos de la app" (dias_aviso_preventivo, dias_alerta_urgente, bloquear_por_deuda).
  const [preventivoDays, setPreventivoDays] = useState(Number(textos.dias_aviso_preventivo) || 30);
  const [inhabilitacionDays, setInhabilitacionDays] = useState(Number(textos.dias_alerta_urgente) || 5);
  const [blockOnDebt, setBlockOnDebt] = useState(bloquearPorDeuda(textos.bloquear_por_deuda));
  const [guardandoParametros, setGuardandoParametros] = useState(false);
  const [verActa, setVerActa] = useState(false);
  const [rolAbierto, setRolAbierto] = useState<string | null>(null);
  const [fichaElegida, setFichaElegida] = useState('');
  const [asociando, setAsociando] = useState(false);

  const parametrosCambiados =
    String(preventivoDays) !== textos.dias_aviso_preventivo ||
    String(inhabilitacionDays) !== textos.dias_alerta_urgente ||
    blockOnDebt !== bloquearPorDeuda(textos.bloquear_por_deuda);

  const guardarParametros = async () => {
    if (preventivoDays < 1 || inhabilitacionDays < 0 || inhabilitacionDays > preventivoDays) {
      showToast('Revisá los días: la alerta urgente no puede ser mayor que el aviso preventivo', 'error', 'error');
      return;
    }
    setGuardandoParametros(true);
    await onSaveTextos({
      ...textos,
      dias_aviso_preventivo: String(preventivoDays),
      dias_alerta_urgente: String(inhabilitacionDays),
      bloquear_por_deuda: blockOnDebt ? 'si' : 'no',
    });
    setGuardandoParametros(false);
  };

  const opcionesHab = { bloquearPorDeuda: bloquearPorDeuda(textos.bloquear_por_deuda) };

  /** Planilla del plantel en CSV (abre bien en Excel: separador ";" y acentos). */
  const handleExportCsv = () => {
    const columnas = [
      'Apellido', 'Nombre', 'Cédula', 'Número', 'Posición', 'Nacimiento', 'Celular', 'Email',
      'Ficha médica vence', 'Carné LUD nº', 'Carné LUD vence', 'Habilitado', 'Motivo', 'Planilla', 'Deuda',
    ];
    const celda = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = players.map((p) => {
      const e = estadoHabilitacion(p, opcionesHab);
      return [
        p.lastName, p.firstName, p.documento, p.number, p.position, p.birthDate ?? p.birthYear, p.phone, p.email,
        p.medicalCertificate.expiryDate, p.ludRegistration.federatedId || '', p.ludRegistration.cardExpiry,
        e.habilitado ? 'Sí' : 'No', e.habilitado ? '' : e.motivo, p.matchStatus.lineupRole, p.dues.debtAmount,
      ].map(celda).join(';');
    });
    const csv = '\ufeff' + [columnas.map(celda).join(';'), ...filas].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantel_elbio_${textos.categoria.toLowerCase()}_${textos.temporada}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    showToast(`Planilla descargada (${players.length} jugadores)`, 'table_view', 'success');
  };

  const handleExportPdf = () => setVerActa(true);

  const cantidadRol = (key?: string) =>
    key === 'jugador' ? players.length : miembros.filter((m) => m.rol === key).length;

  return (
    <div className="flex flex-col w-full pb-28">
      {/* Top Admin Hero Banner */}
      <section className="relative overflow-hidden bg-[#00183a] px-4 pt-5 pb-8 text-white rounded-b-3xl shadow-md">
        {/* Ambient institutional background graphic */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-[#0d2d59] opacity-40 blur-2xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-32 h-32 rounded-full bg-[#b51a1b] opacity-15 blur-xl pointer-events-none"></div>

        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-14 shrink-0 bg-white p-1 rounded-xl shadow-md flex items-center justify-center">
              <img
                src={CLUB_CREST_URL}
                alt="Escudo Oficial Club Elbio Fernández"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d93630] text-white font-heading font-extrabold text-[9px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  Superusuario
                </span>
                <span className="text-[#fabc4d] text-xs font-heading font-bold">★ ★ ★</span>
              </div>
              <h2 className="font-heading font-bold text-[20px] text-white truncate">
                Configuración General
              </h2>
              <p className="font-sans text-[12px] text-[#7b96c8] truncate">
                Club Elbio Fernández · Gestión Elbio U
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#0d2d59] text-[#7b96c8] flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[20px]">
                admin_panel_settings
              </span>
            </div>
          </div>
        </div>

        {/* Quick Vital Metrics Ribbon */}
        <div className="grid grid-cols-3 gap-2 bg-[#0d2d59]/70 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
          <div className="flex flex-col items-center text-center p-1">
            <span className="font-heading font-bold text-[18px] text-[#fabc4d]">{miembros.length}</span>
            <span className="font-heading font-extrabold text-[10px] text-[#7b96c8] uppercase tracking-tight">
              Staff
            </span>
          </div>
          <div className="flex flex-col items-center text-center p-1 bg-[#00183a]/40 rounded-lg">
            <span className="font-heading font-bold text-[18px] text-white">{players.length}</span>
            <span className="font-heading font-extrabold text-[10px] text-[#7b96c8] uppercase tracking-tight">
              Jugadores
            </span>
          </div>
          <div className="flex flex-col items-center text-center p-1">
            <div className="flex items-center gap-1">
              <span className="font-heading font-bold text-[18px] text-white">
                {players.filter((p) => estadoHabilitacion(p, opcionesHab).habilitado).length}
              </span>
            </div>
            <span className="font-heading font-extrabold text-[10px] text-[#7b96c8] uppercase tracking-tight">
              Habilitados
            </span>
          </div>
        </div>
      </section>

      {/* Content Container */}
      <div className="px-4 flex flex-col gap-5 mt-4">
        {miPerfilJugador && (
          <section className="bg-white rounded-xl p-4 shadow-sm border border-[#e0e3e6]/60 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#b51a1b] text-[22px]">sports_soccer</span>
              <h3 className="font-heading font-bold text-[16px] text-[#00183a]">Tu perfil de jugador</h3>
            </div>
            {miPerfilJugador.jugador ? (
              <button
                onClick={miPerfilJugador.onVer}
                className="h-12 rounded-lg bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[13px] font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">badge</span>
                Ver como jugador ({miPerfilJugador.jugador.firstName} {miPerfilJugador.jugador.lastName})
              </button>
            ) : (
              <>
                <p className="font-sans text-[12px] text-[#44474f]">
                  Si también jugás, elegite del plantel para asociar tu ficha a tu email y poder verla como jugador.
                </p>
                <select
                  value={fichaElegida}
                  onChange={(e) => setFichaElegida(e.target.value)}
                  className="h-11 px-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6] font-sans text-[16px] sm:text-[14px] text-[#00183a]"
                >
                  <option value="">Elegí tu nombre…</option>
                  {[...players]
                    .sort((a, b) => a.lastName.localeCompare(b.lastName))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.lastName}, {p.firstName}
                      </option>
                    ))}
                </select>
                <button
                  disabled={!fichaElegida || asociando}
                  onClick={async () => {
                    setAsociando(true);
                    await miPerfilJugador.onAsociar(fichaElegida);
                    setAsociando(false);
                  }}
                  className="h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold disabled:opacity-50"
                >
                  {asociando ? 'Asociando…' : 'Soy yo: asociar mi ficha'}
                </button>
              </>
            )}
          </section>
        )}

        <TextosEditor textos={textos} onSave={onSaveTextos} persistent={persistent} showToast={showToast} />

        {/* Section 1: Role & Permission Management */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-[#00183a] text-[22px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                badge
              </span>
              <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
                Gestión de Roles
              </h3>
            </div>
            <span className="font-heading text-[10px] text-[#44474f] bg-[#e6e8eb] px-2 py-0.5 rounded-full font-bold">
              {roles.length} Perfiles
            </span>
          </div>

          <RolesPlantel players={players} onAsignar={onAsignarRol} />

          {/* Staff que no juega (o entra con email): admin, cuerpo técnico, tesorería */}
          <button
            onClick={onOpenAssignRoleModal}
            className="w-full h-12 bg-[#00183a] hover:bg-[#0d2d59] text-white rounded-lg font-heading text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            + Dar acceso al staff
          </button>

          <MiembrosList miembros={miembros} miEmail={miEmail} onQuitar={onQuitarMiembro} />

          {/* Roles Stack */}
          <div className="flex flex-col gap-2.5 mt-1">
            {roles.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-xl p-4 shadow-sm relative overflow-hidden border border-[#e0e3e6]/60"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg ${role.iconBg} flex items-center justify-center shrink-0 shadow-xs`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {role.icon}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-[14px] text-[#00183a] truncate leading-tight">
                        {role.title}
                      </h4>
                      <p className="font-heading font-bold text-[10px] text-[#b51a1b]">
                        {role.subtitle}
                      </p>
                    </div>
                  </div>
                  <span className="font-heading text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#d7e3ff] text-[#00183a] flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">group</span>
                    {role.key ? cantidadRol(role.key) : role.activeCount} {role.key === 'jugador' ? 'en el plantel' : 'activos'}
                  </span>
                </div>
                <p className="font-sans text-[12px] text-[#44474f] mb-3">
                  {role.description}
                </p>
                <div className="flex items-center justify-between pt-2 bg-[#f2f4f7] px-3 py-2 rounded-lg border border-[#e0e3e6]/60">
                  <span className="font-heading text-[11px] text-[#44474f] font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#00183a]">
                      verified_user
                    </span>
                    {role.badgeLabel}
                  </span>
                  <button
                    onClick={() => setRolAbierto((r) => (r === role.id ? null : role.id))}
                    aria-expanded={rolAbierto === role.id}
                    className="font-heading text-[11px] text-[#00183a] font-bold hover:underline flex items-center gap-0.5"
                  >
                    {rolAbierto === role.id ? 'Ocultar' : 'Ver usuarios'}{' '}
                    <span className="material-symbols-outlined text-[14px]">
                      {rolAbierto === role.id ? 'expand_less' : 'chevron_right'}
                    </span>
                  </button>
                </div>
                {rolAbierto === role.id && (
                  <ul className="mt-2 flex flex-col gap-1 font-sans text-[12px] text-[#191c1e]">
                    {role.key === 'jugador' ? (
                      <li className="text-[#44474f]">
                        {players.length} jugadores en el plantel. Entran con "Soy jugador" (celular + cédula) o con el email
                        de su ficha.
                      </li>
                    ) : miembros.filter((m) => m.rol === role.key).length === 0 ? (
                      <li className="text-[#44474f]">Nadie tiene este rol todavía.</li>
                    ) : (
                      miembros
                        .filter((m) => m.rol === role.key)
                        .map((m) => (
                          <li key={m.email} className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-[#747780]">person</span>
                            {m.nombre ? `${m.nombre} · ` : ''}
                            {m.email}
                          </li>
                        ))
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Global System Parameters */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">
              tune
            </span>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Parámetros del Sistema
            </h3>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-4 border border-[#e0e3e6]/60">
            {/* Param 2: Medical Clearance Expiration Thresholds */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="font-heading text-[12px] font-bold text-[#00183a] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-amber-600">
                    notification_important
                  </span>
                  Semáforo de fichas médicas y carnés
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#f2f4f7] p-2.5 rounded-lg flex flex-col border border-[#e0e3e6]">
                  <div className="flex items-center gap-1 text-[#604100] mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span className="font-heading text-[10px] uppercase font-bold">
                      Preventivo
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={preventivoDays}
                      onChange={(e) => setPreventivoDays(Number(e.target.value))}
                      className="font-heading font-bold text-[18px] text-[#00183a] w-14 bg-white px-1 rounded border border-[#e0e3e6]"
                    />
                    <span className="font-heading text-sm text-[#00183a]">días</span>
                  </div>
                  <span className="font-sans text-[11px] text-[#44474f] mt-0.5">
                    Aparece en Alertas
                  </span>
                </div>

                <div className="bg-[#f2f4f7] p-2.5 rounded-lg flex flex-col border border-[#e0e3e6]">
                  <div className="flex items-center gap-1 text-[#b51a1b] mb-1">
                    <span className="w-2 h-2 rounded-full bg-[#b51a1b]"></span>
                    <span className="font-heading text-[10px] uppercase font-bold">
                      Urgente
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={inhabilitacionDays}
                      onChange={(e) => setInhabilitacionDays(Number(e.target.value))}
                      className="font-heading font-bold text-[18px] text-[#b51a1b] w-14 bg-white px-1 rounded border border-[#e0e3e6]"
                    />
                    <span className="font-heading text-sm text-[#b51a1b]">días</span>
                  </div>
                  <span className="font-sans text-[11px] text-[#44474f] mt-0.5">
                    Alerta urgente (rojo)
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full h-px bg-[#eceef1]"></div>

            {/* Param 3: WhatsApp (sin integración paga: se usa el WhatsApp de cada uno) */}
            <div className="flex flex-col gap-2">
              <label className="font-heading text-[12px] font-bold text-[#00183a] flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">chat</span>
                Avisos por WhatsApp
              </label>
              <div className="bg-[#f2f4f7] p-3 rounded-lg flex items-center justify-between gap-2 border border-[#e0e3e6]">
                <div className="flex flex-col min-w-0">
                  <span className="font-heading font-bold text-[13px] text-[#00183a] truncate">
                    Delegado: {textos.delegado_nombre}
                    {normalizarCelular(textos.delegado_celular) ? ` · ${textos.delegado_celular}` : ''}
                  </span>
                  <span className="font-sans text-[11px] text-[#44474f]">
                    {normalizarCelular(textos.delegado_celular)
                      ? 'Los mensajes se abren en tu WhatsApp, listos para mandar.'
                      : 'Falta cargar el celular del delegado en Textos de la app → Contactos.'}
                  </span>
                </div>
                <a
                  href={linkWhatsApp(textos.delegado_celular || null, 'Prueba desde la app del Club Elbio Fernández ✅')}
                  target="_blank"
                  rel="noopener"
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#e0e3e6] text-[#00183a] font-heading text-[11px] font-bold hover:bg-[#eceef1] shrink-0 shadow-xs"
                >
                  Probar
                </a>
              </div>
            </div>

            <div className="w-full h-px bg-[#eceef1]"></div>

            {/* Param 4: Treasury / Cuotas Settings */}
            <div className="flex flex-col gap-2">
              <label className="font-heading text-[12px] font-bold text-[#00183a] flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px] text-[#00183a]">
                  account_balance_wallet
                </span>
                Parámetros de Tesorería & Cuotas
              </label>
              <div className="bg-[#f2f4f7] p-3 rounded-lg flex flex-col gap-2.5 border border-[#e0e3e6]">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[12px] text-[#44474f]">
                    Valor Cuota Social Mensual
                  </span>
                  <span className="font-heading font-bold text-[14px] text-[#00183a]">
                    $ {(Number(textos.cuota_monto) || 1400).toLocaleString('es-UY')} UYU
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[12px] text-[#44474f]">
                    Día de vencimiento regular
                  </span>
                  <span className="font-heading font-bold text-[12px] text-[#00183a]">
                    Día {textos.cuota_dia_vencimiento} del mes
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#e0e3e6]">
                  <div className="flex flex-col">
                    <span className="font-heading text-[12px] font-bold text-[#00183a]">
                      Inhabilitar por cuota vencida
                    </span>
                    <span className="font-sans text-[11px] text-[#44474f]">
                      Quien tenga una cuota vencida figura como no habilitado
                    </span>
                  </div>
                  {/* Toggle switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={blockOnDebt}
                      onChange={(e) => setBlockOnDebt(e.target.checked)}
                      aria-label="Inhabilitar por cuota vencida"
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#e0e3e6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b51a1b]"></div>
                  </label>
                </div>
              </div>
            </div>
            <p className="font-sans text-[11px] text-[#747780]">
              El valor de la cuota y el día de vencimiento se cambian en Textos de la app → Tesorería.
            </p>
            <button
              type="button"
              onClick={guardarParametros}
              disabled={!parametrosCambiados || guardandoParametros}
              className="h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold disabled:opacity-40"
            >
              {guardandoParametros ? 'Guardando…' : 'Guardar parámetros'}
            </button>
          </div>
        </section>

        {/* Section 3: Club Institutional Information */}
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">
              corporate_fare
            </span>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Identidad Institucional
            </h3>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-[#e0e3e6]/60">
            <div className="flex items-center gap-3">
              <div className="w-12 h-14 p-1 bg-[#f2f4f7] rounded-lg flex items-center justify-center shrink-0 border border-[#e0e3e6]">
                <img
                  src={CLUB_CREST_URL}
                  alt="Escudo Elbio"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="font-heading font-bold text-[16px] text-[#00183a] truncate">
                  Club Elbio Fernández
                </h4>
                <span className="font-sans text-[12px] text-[#44474f]">
                  {textos.categoria} · {textos.divisional}
                </span>
              </div>
            </div>
            <div className="bg-[#f2f4f7] rounded-lg p-3 flex flex-col gap-2 border border-[#e0e3e6]">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#44474f] shrink-0 mt-0.5">
                  location_on
                </span>
                <div className="flex flex-col">
                  <span className="font-heading font-bold text-[10px] text-[#00183a] uppercase">
                    Sede Central
                  </span>
                  <span className="font-sans text-[12px] text-[#44474f]">{textos.club_direccion}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#44474f] shrink-0 mt-0.5">
                  call
                </span>
                <div className="flex flex-col">
                  <span className="font-heading font-bold text-[10px] text-[#00183a] uppercase">
                    Contacto Deportivo
                  </span>
                  <span className="font-sans text-[12px] text-[#44474f]">
                    {textos.club_contacto || 'Sin cargar (Textos de la app → Club)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Security, Audit & Backups */}
        <section className="flex flex-col gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[22px]">
              database
            </span>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Seguridad & Respaldos
            </h3>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-[#e0e3e6]/60">
            <p className="font-sans text-[12px] text-[#44474f]">
              Exportación de registros oficiales de plantel, carné de salud y estados de tesorería
              para presentación ante autoridades de la LUD.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportCsv}
                className="h-11 rounded-lg bg-[#e6e8eb] hover:bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">table_view</span>
                Exportar CSV
              </button>
              <button
                onClick={handleExportPdf}
                disabled={players.length === 0}
                className="h-11 rounded-lg bg-[#e6e8eb] hover:bg-[#eceef1] text-[#00183a] font-heading text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                Acta Oficial
              </button>
            </div>
            <div className="flex items-center gap-1.5 pt-1 border-t border-[#f2f4f7] text-[#44474f] font-sans text-[12px]">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">lock</span>
              Los datos se guardan en Supabase con acceso por rol.
            </div>
          </div>
        </section>
      </div>

      {verActa && (
        <VentanaImprimible className="fixed inset-0 z-50 flex items-center justify-center bg-[#00183a]/75 p-3">
          <div className="area-impresion w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-3 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e0e3e6] pb-3">
              <div className="flex items-center gap-2.5">
                <img src={CLUB_CREST_URL} alt="" className="w-8 h-9 object-contain" />
                <div>
                  <h3 className="font-heading font-bold text-[15px] text-[#00183a]">Acta de habilitaciones</h3>
                  <p className="font-sans text-[11px] text-[#44474f]">
                    Club Elbio Fernández · {textos.categoria} · {textos.torneo} · {fechaCorta(new Date().toISOString().slice(0, 10))}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerActa(false)}
                aria-label="Cerrar"
                className="no-imprimir w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <table className="w-full text-left font-sans text-[10px] border border-[#e0e3e6]">
              <thead>
                <tr className="bg-[#f2f4f7] font-bold border-b border-[#e0e3e6]">
                  <th className="p-1">Jugador</th>
                  <th className="p-1">Cédula</th>
                  <th className="p-1">Carné LUD</th>
                  <th className="p-1">Ficha méd.</th>
                  <th className="p-1">Estado</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const e = estadoHabilitacion(p, opcionesHab);
                  return (
                    <tr key={p.id} className="border-b border-[#f2f4f7]">
                      <td className="p-1 font-bold text-[#00183a]">
                        {p.lastName}, {p.firstName}
                      </td>
                      <td className="p-1">{p.documento ?? '—'}</td>
                      <td className="p-1">
                        {p.ludRegistration.federatedId || '—'}
                        {p.ludRegistration.cardExpiry ? ` (${fechaCorta(p.ludRegistration.cardExpiry)})` : ''}
                      </td>
                      <td className="p-1">{fechaCorta(p.medicalCertificate.expiryDate) || '—'}</td>
                      <td className={`p-1 font-bold ${e.habilitado ? 'text-[#1b5e20]' : 'text-[#b51a1b]'}`}>
                        {e.habilitado ? 'Habilitado' : e.motivo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="font-sans text-[10px] text-[#44474f]">
              {players.filter((p) => estadoHabilitacion(p, opcionesHab).habilitado).length} habilitados de {players.length}.
              Delegado: {textos.delegado_nombre} (firma: ____________)
            </p>
            <button
              onClick={() => window.print()}
              className="no-imprimir h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Imprimir / guardar PDF
            </button>
          </div>
        </VentanaImprimible>
      )}
    </div>
  );
};
