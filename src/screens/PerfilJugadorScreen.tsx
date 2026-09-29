import React, { useState } from 'react';
import { Player } from '../types';
import { CLUB_CREST_URL, CLUB_CREST_WATERMARK } from '../data/initialData';
import { fechaCorta, nombrePeriodo, sumarMeses } from '../lib/fechas';
import { useTextos } from '../lib/textos';

interface PerfilJugadorScreenProps {
  player: Player;
  /** Devuelve false si no se pudo guardar. */
  onUpdateAttendance: (confirmed: boolean, reason?: string) => Promise<boolean>;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const PerfilJugadorScreen: React.FC<PerfilJugadorScreenProps> = ({
  player,
  onUpdateAttendance,
  showToast,
}) => {
  const t = useTextos();
  const [attendance, setAttendance] = useState<'pending' | 'confirmed' | 'declined'>(
    player.matchStatus.attendanceConfirmed
      ? 'confirmed'
      : player.matchStatus.declineReason
      ? 'declined'
      : 'pending'
  );
  const [likedNotice, setLikedNotice] = useState(false);
  const [likesCount, setLikesCount] = useState(16);

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
      showToast('Aviso de ausencia enviado al DT y Delegado', 'event_busy', 'warning');
    }
  };

  const handleToggleLikeNotice = () => {
    if (!likedNotice) {
      setLikedNotice(true);
      setLikesCount((c) => c + 1);
      showToast('Marcaste como enterado al cuerpo técnico', 'thumb_up', 'success');
    } else {
      setLikedNotice(false);
      setLikesCount((c) => c - 1);
    }
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
                {player.number}
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
        <div className="mt-4 pt-2.5 border-t border-[#f2f4f7] flex items-center justify-between bg-[#f2f4f7] rounded-lg p-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
            <span className="font-heading text-[12px] font-bold text-[#00183a] tracking-wide">
              ESTÁS HABILITADO PARA JUGAR
            </span>
          </div>
          <span
            className="material-symbols-outlined text-emerald-600 text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            verified
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
                Complejo Carrasco
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[#ffdead] text-[18px] mt-0.5">
              checkroom
            </span>
            <div>
              <span className="font-heading text-[9px] block text-[#e0e3e6] uppercase font-bold">
                EQUIPACIÓN
              </span>
              <span className="font-sans text-[13px] text-white font-medium">
                Titular (Rojo/Azul)
              </span>
            </div>
          </div>
          <div className="col-span-2 pt-1 flex items-center gap-1.5 text-[#ffdead] font-sans text-[11px]">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            <span>Canilleras y documento de identidad obligatorios en bolso.</span>
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
              <span className="bg-emerald-100 text-emerald-800 font-heading text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                Al día
              </span>
            </div>

            <div className="bg-[#f2f4f7] rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="font-heading text-[10px] text-[#44474f] block uppercase font-bold">
                  Vencimiento
                </span>
                <span className="font-heading font-bold text-[16px] text-[#00183a]">
                  {fechaCorta(player.medicalCertificate.expiryDate) || 'Sin carné'}
                </span>
                <span className="font-sans text-[11px] text-emerald-700 block font-medium">
                  ({player.medicalCertificate.daysRemaining} días restantes)
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() =>
                    showToast('Abriendo carnet_salud_frente_dorso.jpg (1.8 MB)', 'description')
                  }
                  className="bg-white hover:bg-[#eceef1] text-[#00183a] font-heading text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition-colors border border-[#e0e3e6]"
                >
                  <span className="material-symbols-outlined text-[14px]">visibility</span>
                  <span>Ver comprobante</span>
                </button>
                <button
                  onClick={() =>
                    showToast('Selecciona foto o PDF para actualizar tu Carné de Salud', 'upload_file')
                  }
                  className="bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">upload_file</span>
                  <span>Renovar / Subir</span>
                </button>
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
          <span className="font-heading text-[10px] text-emerald-700 font-bold uppercase">
            Al corriente
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2.5 border border-[#e0e3e6]/60">
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/80 border border-emerald-200/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <span className="material-symbols-outlined text-[20px]">check</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-[14px] text-[#00183a]">
                    {nombrePeriodo(player.dues.period)}
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 font-heading text-[10px] font-bold px-2 py-0.5 rounded-full">
                    PAGADO
                  </span>
                </div>
                <p className="font-sans text-[11px] text-[#44474f]">
                  $1.400 abonado vía BROU • Recibo {player.dues.receiptNumber || '#4819'}
                </p>
              </div>
            </div>
            <button
              onClick={() => showToast('Descargando comprobante oficial de recibo #4819')}
              className="text-[#00183a] hover:text-[#b51a1b] p-1.5 rounded-lg active:bg-white/60"
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </button>
          </div>

          <div className="p-3 rounded-lg bg-[#f2f4f7] flex items-center justify-between border border-[#e0e3e6]">
            <div>
              <span className="font-heading font-bold text-[12px] text-[#00183a] block">
                Próxima cuota: {nombrePeriodo(sumarMeses(player.dues.period, 1))}
              </span>
              <p className="font-sans text-[11px] text-[#44474f]">
                Vencimiento: {t.cuota_dia_vencimiento} de{' '}
                {nombrePeriodo(sumarMeses(player.dues.period, 1)).split(' ')[0]} • $1.400
              </p>
            </div>
            <button
              onClick={() =>
                showToast('Datos bancarios BROU y Santander enviados a tu WhatsApp', 'payments')
              }
              className="bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">credit_card</span>
              <span>Transferir / Avisar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Club Notifications & DT Board */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-heading text-[12px] font-bold text-[#00183a] tracking-wider uppercase">
            Tablón del Equipo
          </h4>
          <span className="font-heading text-[10px] text-[#b51a1b] font-bold uppercase">
            1 Nuevo
          </span>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e0e3e6]/60">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f2f4f7] border border-[#e0e3e6]">
            <div className="w-9 h-9 rounded-full bg-[#b51a1b] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <span className="material-symbols-outlined text-[18px]">
                drive_file_rename
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-heading text-[12px] font-bold text-[#00183a]">
                  Cuerpo Técnico (DT Nacho)
                </span>
                <span className="font-sans text-[11px] text-[#44474f]">Hoy 11:20</span>
              </div>
              <p className="font-sans text-[13px] text-[#191c1e] mt-1 leading-relaxed">
                "Entrenamiento táctico adelantado para{' '}
                <strong className="font-bold text-[#00183a]">jueves 20:30 hs</strong> en cancha
                central. Repaso de pelota quieta obligatorio."
              </p>
              <div className="mt-2.5 flex items-center gap-3">
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
                  <span>Enterado ({likesCount})</span>
                </button>
                <span className="text-[#e0e3e6]">•</span>
                <button
                  onClick={() => showToast('Lista de 18 convocados confirmados para el jueves')}
                  className="text-[#44474f] font-heading text-[11px] hover:underline"
                >
                  Ver citados
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Micro Quick-Action Footbar */}
      <div className="bg-[#e6e8eb]/70 p-3 rounded-xl flex items-center justify-between text-[#44474f] border border-[#e0e3e6]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00183a] text-[20px]">
            contact_support
          </span>
          <span className="font-sans text-[12px]">¿Dudas con fichaje o seguro?</span>
        </div>
        <button
          onClick={() =>
            showToast('Abriendo chat directo de WhatsApp con el Delegado Matías Romero', 'chat')
          }
          className="bg-white hover:bg-[#eceef1] text-[#00183a] font-heading text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs active:scale-95 transition-all border border-[#e0e3e6]"
        >
          Contactar Delegado
        </button>
      </div>
    </div>
  );
};
