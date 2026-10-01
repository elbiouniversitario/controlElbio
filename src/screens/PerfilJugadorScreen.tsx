import React, { useState } from 'react';
import { Player } from '../types';
import { CLUB_CREST_URL, CLUB_CREST_WATERMARK } from '../data/initialData';
import { diasHasta, fechaCorta, nombrePeriodo, sumarMeses } from '../lib/fechas';
import { bloquearPorDeuda, estadoHabilitacion } from '../lib/habilitacion';
import { abrirWhatsApp, normalizarCelular } from '../lib/whatsapp';
import { useTextos } from '../lib/textos';

interface PerfilJugadorScreenProps {
  player: Player;
  /** Devuelve false si no se pudo guardar. */
  onUpdateAttendance: (confirmed: boolean, reason?: string) => Promise<boolean>;
  /** Abre un documento guardado (foto o PDF de ficha médica / carné). */
  onVerArchivo?: (ruta: string) => void;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const PerfilJugadorScreen: React.FC<PerfilJugadorScreenProps> = ({
  player,
  onUpdateAttendance,
  onVerArchivo,
  showToast,
}) => {
  const t = useTextos();
  const estado = estadoHabilitacion(player, { bloquearPorDeuda: bloquearPorDeuda(t.bloquear_por_deuda) });
  const motivoInhabilitado = estado.habilitado ? null : (estado.motivo ?? 'Inhabilitado').toUpperCase();
  const [attendance, setAttendance] = useState<'pending' | 'confirmed' | 'declined'>(
    player.matchStatus.attendanceConfirmed
      ? 'confirmed'
      : player.matchStatus.declineReason
      ? 'declined'
      : 'pending'
  );
  // "Enterado" del aviso del tablón: se recuerda en este celular para ese texto de aviso.
  const claveEnterado = `enterado:${player.id}:${t.aviso_dt}`;
  const [likedNotice, setLikedNotice] = useState(() => {
    try {
      return localStorage.getItem(claveEnterado) === '1';
    } catch {
      return false;
    }
  });
  const [verRecibo, setVerRecibo] = useState(false);
  const [verComoPagar, setVerComoPagar] = useState(false);
  const monto = Number(t.cuota_monto) || 1400;
  const debe = player.dues.debtAmount > 0 || player.dues.status !== 'paid';

  /** Abre WhatsApp con el delegado (o avisa si el club no cargó su celular). */
  const escribirA = (celular: string, texto: string, quien: string) => {
    if (!normalizarCelular(celular)) {
      showToast(`El club todavía no cargó el celular ${quien}`, 'phone_disabled', 'warning');
      return;
    }
    abrirWhatsApp(celular, texto);
  };

  const handleConfirmAttendance = async () => {
    if (!(await onUpdateAttendance(true))) return;
    setAttendance('confirmed');
    showToast(`¡Asistencia confirmada para el ${t.partido_dia}, citación ${t.citacion_hora}!`, 'check_circle', 'success');
  };

  const handleDeclineAttendance = async () => {
    const reason = window.prompt('Indica breve motivo para el cuerpo técnico (Ej: Estudio, Lesión, Trabajo):');
    if (reason !== null) {
      if (!(await onUpdateAttendance(false, reason || 'Motivo no especificado'))) return;
      setAttendance('declined');
      showToast('Ausencia registrada: el cuerpo técnico la ve en la app', 'event_busy', 'warning');
    }
  };

  const handleToggleLikeNotice = () => {
    const nuevo = !likedNotice;
    setLikedNotice(nuevo);
    try {
      if (nuevo) localStorage.setItem(claveEnterado, '1');
      else localStorage.removeItem(claveEnterado);
    } catch {
      /* sin almacenamiento: queda solo en esta pantalla */
    }
    if (nuevo) showToast('Marcado como leído', 'thumb_up', 'success');
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-28">
      {/* Player Profile Header Card */}
      <div className="bg-white rounded-xl p-4 shadow-md relative overflow-hidden border border-[#e0e3e6]/60">
        <div className="absolute -right-4 -bottom-6 w-28 h-36 opacity-10 pointer-events-none">
          <img
            src={CLUB_CREST_WATERMARK}
            alt="Escudo Club Elbio Fernández"
            className="w-full h-full object-contain filter brightness-200"
          />
        </div>
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              <img
                src={player.avatarUrl}
                alt={`${player.firstName} ${player.lastName}`}
                className="w-16 h-16 rounded-xl object-cover shadow-sm border border-[#e0e3e6]"
              />
              <span className="absolute -bottom-1 -right-1 bg-[#00183a] text-white font-heading text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
                {player.number ?? '–'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="bg-[#b51a1b]/10 text-[#b51a1b] font-heading font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">
                  {player.category}
                </span>
                <span className="font-heading text-[10px] text-[#44474f] font-medium">
                  Rol: Jugador
                </span>
              </div>
              <h2 className="font-heading font-bold text-[20px] text-[#00183a] truncate leading-tight">
                {player.firstName} {player.lastName}
              </h2>
              <p className="font-sans text-[12px] text-[#44474f]">
                {player.position} • {player.matchStatus.lineupRole}
              </p>
            </div>
          </div>
          <div className="w-9 h-11 shrink-0">
            <img
              src={CLUB_CREST_URL}
              alt="Escudo Elbio"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
        </div>

        {/* Habilitado Status Pill */}
        <div
          className={`mt-4 pt-2.5 border-t border-[#f2f4f7] flex items-center justify-between rounded-lg p-2.5 ${
            motivoInhabilitado ? 'bg-[#ffdad6]/60' : 'bg-[#f2f4f7]'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {!motivoInhabilitado && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${motivoInhabilitado ? 'bg-[#b51a1b]' : 'bg-emerald-600'}`}
              ></span>
            </span>
            <span className="font-heading text-[12px] font-bold text-[#00183a] tracking-wide">
              {motivoInhabilitado ? `NO HABILITADO: ${motivoInhabilitado}` : 'ESTÁS HABILITADO PARA JUGAR'}
            </span>
          </div>
          <span
            className={`material-symbols-outlined text-[20px] ${motivoInhabilitado ? 'text-[#b51a1b]' : 'text-emerald-600'}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {motivoInhabilitado ? 'block' : 'verified'}
          </span>
        </div>
      </div>

      {/* Próxima Citación Banner */}
      <div className="bg-[#00183a] text-white rounded-xl p-4 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d93630]"></span>
            <span className="font-heading font-extrabold text-[10px] tracking-wider uppercase text-[#fabc4d]">
              Próxima Citación Oficial
            </span>
          </div>
          <span className="bg-[#b51a1b] text-white font-heading font-bold text-[10px] px-2.5 py-0.5 rounded-full">
            {t.fecha}
          </span>
        </div>

        <div className="space-y-1 mb-4">
          <h3 className="font-heading font-bold text-[22px] text-white leading-tight">
            vs {t.rival}
          </h3>
          <div className="flex items-center gap-1.5 text-[#acc7fc] font-heading text-[12px]">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>{t.partido_dia} • {t.partido_hora} (Citación {t.citacion_hora})</span>
          </div>
        </div>

        {/* Match Details Pill Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-[#0d2d59]/90 rounded-lg p-3 text-[#acc7fc] border border-white/10">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#ffdead] text-[18px] mt-0.5">
              stadium
            </span>
            <div>
              <span className="font-heading text-[9px] block text-[#e0e3e6] uppercase font-bold">
                CANCHA
              </span>
              <span className="font-sans text-[13px] text-white font-medium">
                {t.cancha}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#ffdead] text-[18px] mt-0.5">
              alarm
            </span>
            <div>
              <span className="font-heading text-[9px] block text-[#e0e3e6] uppercase font-bold">
                CITACIÓN
              </span>
              <span className="font-sans text-[13px] text-white font-medium">
                {t.citacion_hora}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive Attendance Confirmation */}
        <div className="flex flex-col gap-2">
          {attendance === 'pending' ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleConfirmAttendance}
                className="h-12 bg-[#b51a1b] hover:bg-[#d93630] active:scale-[0.98] transition-transform rounded-lg flex items-center justify-center gap-2 text-white font-heading text-[13px] font-bold shadow-sm"
              >
                <span>Voy (Confirmar)</span>
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
              </button>
              <button
                onClick={handleDeclineAttendance}
                className="h-12 bg-white/15 hover:bg-white/20 active:scale-[0.98] transition-transform rounded-lg flex items-center justify-center gap-1.5 text-white font-heading text-[12px] font-semibold"
              >
                <span>Avisar Ausencia</span>
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            </div>
          ) : attendance === 'confirmed' ? (
            <div className="bg-emerald-950/80 border border-emerald-500/40 p-3 rounded-lg flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">
                  task_alt
                </span>
                <span className="font-heading text-[12px] font-bold">
                  Asistencia confirmada • Citación {t.citacion_hora}
                </span>
              </div>
              <button
                onClick={() => setAttendance('pending')}
                className="font-heading text-[11px] underline text-[#fabc4d]"
              >
                Modificar
              </button>
            </div>
          ) : (
            <div className="bg-[#3f2900]/80 border border-amber-500/40 p-3 rounded-lg flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">
                  cancel
                </span>
                <span className="font-heading text-[12px] font-bold">
                  Ausencia informada al cuerpo técnico
                </span>
              </div>
              <button
                onClick={() => setAttendance('pending')}
                className="font-heading text-[11px] underline text-[#fabc4d]"
              >
                Cambiar a Presente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Medical Clearance & Liga Status Hub */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-heading text-[12px] font-bold text-[#00183a] tracking-wider uppercase">
            Documentación & Fichaje
          </h4>
          <span className="font-sans text-[11px] text-[#44474f]">
            LUD Temporada {t.temporada}
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3.5 border border-[#e0e3e6]/60">
          {/* Health Certificate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00183a] text-[22px]">
                  medical_services
                </span>
                <div>
                  <h5 className="font-heading font-bold text-[14px] text-[#00183a]">
                    Carné de Salud del Deporte
                  </h5>
                  <p className="font-sans text-[11px] text-[#44474f]">
                    Certificación médica habilitante
                  </p>
                </div>
              </div>
              {player.medicalCertificate.daysRemaining > 0 ? (
                <span className="bg-emerald-100 text-emerald-800 font-heading text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Al día
                </span>
              ) : (
                <span className="bg-[#ffdad6] text-[#410002] font-heading text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#b51a1b]"></span>
                  Vencido
                </span>
              )}
            </div>

            <div className="bg-[#f2f4f7] rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="font-heading text-[10px] text-[#44474f] block uppercase font-bold">
                  Vencimiento
                </span>
                <span className="font-heading font-bold text-[16px] text-[#00183a]">
                  {fechaCorta(player.medicalCertificate.expiryDate) || 'Sin carné'}
                </span>
                <span
                  className={`font-sans text-[11px] block font-medium ${
                    player.medicalCertificate.daysRemaining <= 0 ? 'text-[#ba1a1a]' : 'text-emerald-700'
                  }`}
                >
                  {player.medicalCertificate.daysRemaining <= 0
                    ? '(vencida)'
                    : `(${player.medicalCertificate.daysRemaining} días restantes)`}
                </span>
              </div>
            </div>
          </div>

          {/* Liga Universitaria Custody info */}
          <div className="bg-[#e6e8eb]/40 rounded-lg p-3 flex items-start justify-between border border-[#e0e3e6]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-heading text-[10px] text-[#b51a1b] uppercase font-extrabold tracking-wider">
                  Liga Universitaria
                </span>
                <span className="font-heading text-[12px] font-bold text-[#00183a]">
                  Ficha #{player.ludRegistration.federatedId}
                </span>
              </div>
              <p className="font-sans text-[12px] text-[#44474f] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#00183a]">
                  badge
                </span>
                Carné físico:{' '}
                <strong className="text-[#00183a] font-medium">
                  {player.ludRegistration.cardInHand}
                </strong>
              </p>
              {player.ludRegistration.cardExpiry && (
                <p
                  className={`font-sans text-[12px] flex items-center gap-1.5 ${
                    diasHasta(player.ludRegistration.cardExpiry) <= 0 ? 'text-[#ba1a1a] font-bold' : 'text-[#44474f]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-[#00183a]">event</span>
                  Carné LUD {diasHasta(player.ludRegistration.cardExpiry) <= 0 ? 'vencido el' : 'vence el'}{' '}
                  {fechaCorta(player.ludRegistration.cardExpiry)}
                </p>
              )}
              {player.ludRegistration.cardFilePath && onVerArchivo && (
                <button
                  type="button"
                  onClick={() => onVerArchivo(player.ludRegistration.cardFilePath!)}
                  className="font-heading text-[11px] font-bold text-[#445e8d] underline"
                >
                  Ver foto del carné
                </button>
              )}
            </div>
            <span
              className="material-symbols-outlined text-[#00183a] text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              verified_user
            </span>
          </div>
        </div>
      </div>

      {/* Club Dues & Payments */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-heading text-[12px] font-bold text-[#00183a] tracking-wider uppercase">
            Mis Cuotas del Club
          </h4>
          <span className={`font-heading text-[10px] font-bold uppercase ${debe ? 'text-[#b51a1b]' : 'text-emerald-700'}`}>
            {debe ? 'Pendiente' : 'Al día'}
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2.5 border border-[#e0e3e6]/60">
          {debe ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#fff8e1] border border-[#ffe082]">
              <div>
                <span className="font-heading font-bold text-[14px] text-[#00183a] block">
                  {player.dues.debtAmount > 0 ? `Debés $${player.dues.debtAmount.toLocaleString('es-UY')}` : 'Cuota pendiente'}
                </span>
                <p className="font-sans text-[11px] text-[#44474f]">
                  {nombrePeriodo(player.dues.period)} · vence el día {t.cuota_dia_vencimiento}
                  {player.dues.status === 'overdue' ? ' · vencida' : ''}
                </p>
              </div>
              <button
                onClick={() => setVerComoPagar(true)}
                className="bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">credit_card</span>
                <span>Cómo pagar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/80 border border-emerald-200/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">check</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-[14px] text-[#00183a]">{nombrePeriodo(player.dues.period)}</span>
                    <span className="bg-emerald-200 text-emerald-900 font-heading text-[10px] font-bold px-2 py-0.5 rounded-full">
                      PAGADO
                    </span>
                  </div>
                  <p className="font-sans text-[11px] text-[#44474f]">
                    {[player.dues.paymentMethod, player.dues.receiptNumber && `Recibo ${player.dues.receiptNumber}`]
                      .filter(Boolean)
                      .join(' • ') || 'Cuota al día'}
                  </p>
                </div>
              </div>
              {player.dues.receiptNumber && (
                <button
                  onClick={() => setVerRecibo(true)}
                  aria-label="Ver recibo"
                  className="text-[#00183a] hover:text-[#b51a1b] p-1.5 rounded-lg active:bg-white/60"
                >
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </button>
              )}
            </div>
          )}

          <div className="p-3 rounded-lg bg-[#f2f4f7] flex items-center justify-between border border-[#e0e3e6]">
            <div>
              <span className="font-heading font-bold text-[12px] text-[#00183a] block">
                Próxima cuota: {nombrePeriodo(sumarMeses(player.dues.period, 1))}
              </span>
              <p className="font-sans text-[11px] text-[#44474f]">
                Vence el {t.cuota_dia_vencimiento} • ${monto.toLocaleString('es-UY')}
              </p>
            </div>
            {!debe && (
              <button
                onClick={() => setVerComoPagar(true)}
                className="bg-white hover:bg-[#eceef1] text-[#00183a] font-heading text-[11px] font-bold px-3 py-2 rounded-lg border border-[#e0e3e6]"
              >
                Cómo pagar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tablón del equipo: aviso del cuerpo técnico (se edita en Club → Textos de la app) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-heading text-[12px] font-bold text-[#00183a] tracking-wider uppercase">
            Tablón del Equipo
          </h4>
          {!likedNotice && <span className="font-heading text-[10px] text-[#b51a1b] font-bold uppercase">Nuevo</span>}
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e0e3e6]/60">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6]">
            <div className="w-9 h-9 rounded-full bg-[#b51a1b] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[18px]">campaign</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-heading text-[12px] font-bold text-[#00183a]">{t.aviso_dt_autor}</span>
              <p className="font-sans text-[13px] text-[#191c1e] mt-1 leading-relaxed whitespace-pre-line">{t.aviso_dt}</p>
              <div className="mt-2.5">
                <button
                  onClick={handleToggleLikeNotice}
                  className={`flex items-center gap-1 font-heading text-[11px] font-bold transition-colors ${
                    likedNotice ? 'text-emerald-700 font-extrabold' : 'text-[#b51a1b] hover:underline'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[15px]"
                    style={{ fontVariationSettings: likedNotice ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    thumb_up
                  </span>
                  <span>{likedNotice ? 'Leído' : 'Marcar como leído'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contacto con el delegado */}
      <div className="bg-[#e6e8eb]/70 p-3 rounded-xl flex items-center justify-between text-[#44474f] border border-[#e0e3e6]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00183a] text-[20px]">contact_support</span>
          <span className="font-sans text-[12px]">¿Dudas con fichaje o seguro?</span>
        </div>
        <button
          onClick={() =>
            escribirA(t.delegado_celular, `Hola ${t.delegado_nombre}, soy ${player.firstName} ${player.lastName}. `, 'del delegado')
          }
          className="bg-white hover:bg-[#eceef1] text-[#00183a] font-heading text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs active:scale-95 transition-all border border-[#e0e3e6]"
        >
          Escribir al delegado
        </button>
      </div>

      {verComoPagar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-[16px] text-[#00183a]">Cómo pagar la cuota</h3>
              <button
                onClick={() => setVerComoPagar(false)}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-sans text-[14px] text-[#191c1e] whitespace-pre-line leading-relaxed">{t.datos_pago}</p>
            <p className="font-sans text-[12px] text-[#44474f]">
              Cuota: ${monto.toLocaleString('es-UY')} · vence el día {t.cuota_dia_vencimiento} de cada mes
              {player.dues.debtAmount > 0 ? ` · hoy debés $${player.dues.debtAmount.toLocaleString('es-UY')}` : ''}.
            </p>
            <button
              onClick={() =>
                escribirA(
                  t.tesorero_celular || t.delegado_celular,
                  `Hola, soy ${player.firstName} ${player.lastName}. Te aviso que pagué la cuota ($${(player.dues.debtAmount || monto).toLocaleString('es-UY')}). Te mando el comprobante.`,
                  'de tesorería'
                )
              }
              className="h-11 rounded-lg bg-[#25d366] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Avisar que pagué (WhatsApp)
            </button>
          </div>
        </div>
      )}

      {verRecibo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#00183a]/70 p-4">
          <div className="area-impresion w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={CLUB_CREST_URL} alt="" className="w-8 h-9 object-contain" />
                <h3 className="font-heading font-bold text-[16px] text-[#00183a]">Recibo {player.dues.receiptNumber}</h3>
              </div>
              <button
                onClick={() => setVerRecibo(false)}
                aria-label="Cerrar"
                className="no-imprimir w-8 h-8 rounded-full flex items-center justify-center text-[#747780] hover:bg-[#eceef1]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-sans text-[13px]">
              <dt className="text-[#747780]">Club</dt>
              <dd className="font-bold text-[#00183a]">Club Elbio Fernández</dd>
              <dt className="text-[#747780]">Jugador</dt>
              <dd className="font-bold text-[#00183a]">
                {player.firstName} {player.lastName}
              </dd>
              {player.documento && (
                <>
                  <dt className="text-[#747780]">Cédula</dt>
                  <dd className="text-[#00183a]">{player.documento}</dd>
                </>
              )}
              <dt className="text-[#747780]">Concepto</dt>
              <dd className="text-[#00183a]">Cuota social · {nombrePeriodo(player.dues.period)}</dd>
              {player.dues.paidAmount !== undefined && (
                <>
                  <dt className="text-[#747780]">Monto</dt>
                  <dd className="font-bold text-[#00183a]">${player.dues.paidAmount.toLocaleString('es-UY')}</dd>
                </>
              )}
              <dt className="text-[#747780]">Fecha</dt>
              <dd className="text-[#00183a]">{player.dues.paidDate ?? '—'}</dd>
              <dt className="text-[#747780]">Medio de pago</dt>
              <dd className="text-[#00183a]">{player.dues.paymentMethod ?? '—'}</dd>
            </dl>
            <button
              onClick={() => window.print()}
              className="no-imprimir h-11 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">print</span>
              Imprimir / guardar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
