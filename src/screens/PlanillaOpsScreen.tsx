import React, { useState } from 'react';
import { Player } from '../types';
import { CLUB_CREST_URL, CLUB_CREST_WATERMARK } from '../data/initialData';

interface PlanillaOpsScreenProps {
  players: Player[];
  onOpenPdfModal: () => void;
  onSendWhatsappCitation: () => void;
  onOpenLineupModal: () => void;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const PlanillaOpsScreen: React.FC<PlanillaOpsScreenProps> = ({
  players,
  onOpenPdfModal,
  onSendWhatsappCitation,
  onOpenLineupModal,
  showToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'warning' | 'blocked'>('all');
  const [bagConfirmed, setBagConfirmed] = useState(false);

  // Carnés físicos count
  const cardsInHandCount = players.filter(
    (p) => p.ludRegistration.cardInHand === 'En mano del delegado'
  ).length;
  const totalCardsNeeded = 20;

  const filteredPlayers = players.filter((p) => {
    if (filter === 'all') return p.matchStatus.lineupRole !== 'BAJA';
    if (filter === 'warning')
      return (
        p.medicalCertificate.daysRemaining <= 15 ||
        p.ludRegistration.cardInHand !== 'En mano del delegado'
      );
    if (filter === 'blocked')
      return (
        p.matchStatus.lineupRole === 'BAJA' ||
        p.medicalCertificate.daysRemaining <= 0 ||
        p.dues.status === 'overdue'
      );
    return true;
  });

  const handleBagToggle = (checked: boolean) => {
    setBagConfirmed(checked);
    if (checked) {
      showToast('Bolso de 18 carnés validado y firmado para el veedor de Liga', 'verified', 'success');
    } else {
      showToast('Revisión de bolso pendiente', 'warning', 'warning');
    }
  };

  const handleAttendanceControl = () => {
    showToast('Iniciando control de asistencia y entrada en calor en campo', 'sports', 'info');
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-28">
      {/* Hero Card: Delegate Context & Match Fixture */}
      <section className="bg-[#00183a] text-white rounded-xl p-4 shadow-xl relative overflow-hidden">
        {/* Subtle Decorative Crest Watermark */}
        <div className="absolute -right-6 -bottom-6 w-36 h-36 opacity-10 pointer-events-none flex items-center justify-center">
          <img
            src={CLUB_CREST_WATERMARK}
            alt="Escudo Elbio Fernández"
            className="w-full h-full object-contain filter brightness-200"
          />
        </div>

        {/* Institutional Identity Badge */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div className="flex items-center gap-3">
            <img
              src={CLUB_CREST_URL}
              alt="Escudo Elbio Fernández"
              className="w-10 h-10 object-contain drop-shadow-md"
            />
            <div className="flex flex-col">
              <span className="font-heading font-bold text-[16px] text-white tracking-wide leading-none">
                Club Elbio Fernández
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#b51a1b] text-white font-heading font-extrabold text-[9px] uppercase">
                  ROL: DELEGADO & DT
                </span>
                <span className="font-heading text-[10px] text-[#fabc4d]">
                  Divisional A • Mayores
                </span>
              </div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#0d2d59] flex items-center justify-center text-[#fabc4d] shadow-inner">
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </div>
        </div>

        {/* Match Banner Box */}
        <div className="bg-[#0d2d59]/90 backdrop-blur-md rounded-lg p-3.5 shadow-md relative z-10 mb-3 border border-white/10">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="font-heading font-extrabold text-[10px] uppercase tracking-wider text-[#fabc4d] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#d93630] animate-pulse"></span>
              Liga Universitaria • Torneo Apertura 2025 • Fecha 5
            </span>
            <span className="font-heading text-[9px] px-2 py-0.5 rounded-full bg-white/20 text-white font-bold">
              Oficial
            </span>
          </div>

          {/* Rivalry & Teams */}
          <div className="flex items-center justify-between py-1">
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-[22px] text-white tracking-tight">
                Elbio U
              </span>
              <span className="font-sans text-[11px] text-[#7b96c8]">Local</span>
            </div>
            <div className="flex flex-col items-center justify-center px-2">
              <span className="font-heading text-[12px] text-[#ffdead] font-black tracking-widest">
                VS
              </span>
              <span className="font-heading text-[10px] text-[#ffdad6] bg-[#b51a1b]/70 px-2 py-0.5 rounded-full mt-1 font-bold">
                10:00 hs
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-heading font-extrabold text-[22px] text-white tracking-tight text-right">
                Playa Pascual
              </span>
              <span className="font-sans text-[11px] text-[#7b96c8] text-right">
                Visitante
              </span>
            </div>
          </div>

          {/* Match Coordinates & Pitch */}
          <div className="mt-3 pt-2 border-t border-white/10 flex flex-col gap-1 text-[#acc7fc] text-[12px] font-sans">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#fabc4d]">
                calendar_today
              </span>
              <span>Domingo 27 de Abril • Citación 08:45 hs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#fabc4d]">
                stadium
              </span>
              <span>Complejo Deportivo Elbio • Cancha 1 (Carrasco)</span>
            </div>
          </div>
        </div>

        {/* Primary Action: Build Roster */}
        <button
          onClick={onOpenLineupModal}
          className="w-full h-12 bg-[#b51a1b] hover:bg-[#d93630] text-white rounded-lg font-heading text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">
            assignment_turned_in
          </span>
          <span>Armar Convocatoria / Planilla Oficial</span>
        </button>
      </section>

      {/* Pre-Match Checklist: Physical Registration Card Bag (Bolso de Carnés) */}
      <section className="bg-white rounded-xl p-4 shadow-sm border border-[#e0e3e6]/60">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#e6e8eb] flex items-center justify-center text-[#00183a]">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <h2 className="font-heading font-bold text-[16px] text-[#00183a] leading-tight">
                Bolso de Carnés Físicos
              </h2>
              <p className="font-sans text-[12px] text-[#44474f]">
                Checklist de Mesa y Veedor de Liga
              </p>
            </div>
          </div>
          <span className="font-heading text-[12px] px-2.5 py-1 rounded-full bg-[#e6e8eb] text-[#00183a] font-bold">
            {cardsInHandCount} / {totalCardsNeeded}
          </span>
        </div>

        {/* Meter Progress Bar */}
        <div className="w-full bg-[#e6e8eb] rounded-full h-2 mb-3 overflow-hidden">
          <div
            className="bg-[#00183a] h-2 rounded-full transition-all duration-500"
            style={{ width: `${(cardsInHandCount / totalCardsNeeded) * 100}%` }}
          ></div>
        </div>

        {/* Alert Callout: Missing Cards */}
        <div className="bg-[#ffdad6] text-[#410002] rounded-lg p-3 mb-3 flex items-start gap-2.5 border border-[#ba1a1a]/20">
          <span className="material-symbols-outlined text-[20px] text-[#ba1a1a] shrink-0 mt-0.5">
            report_problem
          </span>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-[12px] text-[#ba1a1a]">
              ¡Atención! 2 carnés físicos pendientes
            </span>
            <span className="font-sans text-[11px] text-[#410002] mt-0.5 leading-relaxed">
              Silveira y Varela deben entregar credencial física al delegado antes de pisar el campo.
            </span>
          </div>
        </div>

        {/* Rapid Switch Control for Referee Handover */}
        <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#f2f4f7] cursor-pointer active:bg-[#e6e8eb] transition-colors border border-[#e0e3e6]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#00183a] shadow-xs">
              <span className="material-symbols-outlined text-[18px]">sports</span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-[12px] font-bold text-[#00183a]">
                Confirmar bolso completo para jueces
              </span>
              <span className="font-sans text-[10px] text-[#44474f]">
                Habilita firma digital de la cuarteta
              </span>
            </div>
          </div>
          <div className="relative inline-flex items-center shrink-0">
            <input
              type="checkbox"
              checked={bagConfirmed}
              onChange={(e) => handleBagToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#e0e3e6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00183a]"></div>
          </div>
        </label>
      </section>

      {/* Squad Roster & Medical Clearance in Real-Time */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <h2 className="font-heading font-bold text-[18px] text-[#00183a] leading-tight">
              Convocatoria & Habilitación
            </h2>
            <span className="font-sans text-[12px] text-[#44474f]">
              Estado físico y reglamentario en vivo
            </span>
          </div>
          <span className="font-heading text-[10px] uppercase tracking-wider text-[#b51a1b] font-bold">
            22 Fichas
          </span>
        </div>

        {/* Filter Pills Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full font-heading text-[10px] uppercase font-bold flex items-center gap-1 shadow-sm whitespace-nowrap transition-all ${
              filter === 'all'
                ? 'bg-[#00183a] text-white'
                : 'bg-[#e6e8eb] text-[#44474f]'
            }`}
          >
            <span>Convocados</span>
            <span
              className={`px-1.5 py-0.2 rounded-full ${
                filter === 'all'
                  ? 'bg-[#0d2d59] text-white'
                  : 'bg-white text-[#44474f]'
              }`}
            >
              18
            </span>
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`px-3 py-1.5 rounded-full font-heading text-[10px] uppercase font-bold flex items-center gap-1 whitespace-nowrap transition-all ${
              filter === 'warning'
                ? 'bg-[#b76e00] text-white shadow-sm'
                : 'bg-[#e6e8eb] text-[#44474f]'
            }`}
          >
            <span>En duda</span>
            <span className="bg-[#e0e3e6] px-1.5 py-0.2 rounded-full">2</span>
          </button>
          <button
            onClick={() => setFilter('blocked')}
            className={`px-3 py-1.5 rounded-full font-heading text-[10px] uppercase font-bold flex items-center gap-1 whitespace-nowrap transition-all ${
              filter === 'blocked'
                ? 'bg-[#b51a1b] text-white shadow-sm'
                : 'bg-[#e6e8eb] text-[#44474f]'
            }`}
          >
            <span>Inhabilitados</span>
            <span className="bg-[#ffdad6] text-[#ba1a1a] px-1.5 py-0.2 rounded-full font-bold">
              2
            </span>
          </button>
        </div>

        {/* Player Cards Stack */}
        <div className="flex flex-col gap-2.5">
          {filteredPlayers.map((player) => {
            const isHabilitado =
              player.medicalCertificate.daysRemaining > 0 &&
              player.matchStatus.lineupRole !== 'BAJA';
            const isWarning =
              player.medicalCertificate.daysRemaining <= 15 &&
              player.medicalCertificate.daysRemaining > 0;
            const isBlocked = !isHabilitado;

            return (
              <div
                key={player.id}
                className={`bg-white rounded-xl p-3 shadow-sm flex items-center justify-between gap-3 border border-[#e0e3e6]/60 ${
                  isBlocked ? 'opacity-85' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-[#f2f4f7] flex items-center justify-center overflow-hidden border border-[#e0e3e6]">
                      <img
                        className={`w-full h-full object-cover ${
                          isBlocked ? 'grayscale' : ''
                        }`}
                        src={player.avatarUrl}
                        alt={`${player.firstName} ${player.lastName}`}
                      />
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded font-heading text-[10px] font-bold flex items-center justify-center shadow ${
                        isBlocked
                          ? 'bg-[#ba1a1a] text-white'
                          : 'bg-[#00183a] text-white'
                      }`}
                    >
                      {player.number}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3
                        className={`font-heading font-bold text-[14px] text-[#00183a] truncate ${
                          isBlocked ? 'line-through decoration-[#ba1a1a]' : ''
                        }`}
                      >
                        {player.firstName} {player.lastName}
                      </h3>
                      <span
                        className={`font-heading text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          player.matchStatus.lineupRole === 'TITULAR'
                            ? 'bg-[#e6e8eb] text-[#00183a]'
                            : player.matchStatus.lineupRole === 'SUPLENTE'
                            ? 'bg-[#f2f4f7] text-[#44474f]'
                            : 'bg-[#ffdad6] text-[#ba1a1a]'
                        }`}
                      >
                        {player.matchStatus.lineupRole}
                      </span>
                    </div>
                    <span className="font-sans text-[11px] text-[#44474f] truncate">
                      {player.position} • Cat. {player.birthYear}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  {isBlocked ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-heading text-[10px] font-bold shadow-xs bg-[#ffebee] text-[#b71c1c]">
                        <span className="material-symbols-outlined text-[14px]">
                          block
                        </span>
                        <span>INHABILITADO</span>
                      </span>
                      <span className="font-sans text-[10px] text-[#ba1a1a] font-bold mt-1">
                        Ficha Médica Vencida
                      </span>
                    </>
                  ) : isWarning ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-heading text-[10px] font-bold shadow-xs bg-[#fff8e1] text-[#b76e00]">
                        <span className="material-symbols-outlined text-[14px]">
                          warning
                        </span>
                        <span>Vence en {player.medicalCertificate.daysRemaining}d</span>
                      </span>
                      <span className="font-sans text-[10px] text-[#b51a1b] font-medium mt-1">
                        {player.ludRegistration.cardInHand !== 'En mano del delegado'
                          ? 'Falta carné físico'
                          : 'Próximo a vencer'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-heading text-[10px] font-bold shadow-xs bg-[#e8f5e9] text-[#1b5e20]">
                        <span className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>
                        <span>Habilitado • Carné OK</span>
                      </span>
                      <span className="font-sans text-[10px] text-[#44474f] mt-1">
                        Ficha al día (Vence Oct 2025)
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Technical Staff Action Toolkit (Botonera DT & Delegado) */}
      <section className="bg-[#f2f4f7] rounded-xl p-4 shadow-sm border border-[#e0e3e6]">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="material-symbols-outlined text-[20px] text-[#00183a]">
            handyman
          </span>
          <h3 className="font-heading font-bold text-[16px] text-[#00183a]">
            Operativa de Partido
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {/* WhatsApp Dispatcher */}
          <button
            onClick={onSendWhatsappCitation}
            className="w-full p-3 rounded-lg bg-white flex items-center justify-between text-left shadow-sm active:bg-[#f2f4f7] transition-colors border border-[#e0e3e6]/80"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-[#25d366] shadow-sm">
                <span className="material-symbols-outlined text-[22px]">chat</span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-[14px] text-[#00183a]">
                  Enviar Citación por WhatsApp
                </span>
                <span className="font-sans text-[12px] text-[#44474f]">
                  Lugar, indumentaria y horario de llegada
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#747780]">
              chevron_right
            </span>
          </button>

          {/* Official PDF Download */}
          <button
            onClick={onOpenPdfModal}
            className="w-full p-3 rounded-lg bg-white flex items-center justify-between text-left shadow-sm active:bg-[#f2f4f7] transition-colors border border-[#e0e3e6]/80"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0d2d59] text-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[22px]">
                  picture_as_pdf
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-[14px] text-[#00183a]">
                  Descargar Planilla Oficial Liga
                </span>
                <span className="font-sans text-[12px] text-[#44474f]">
                  Formato A4 con firmas para la Mesa
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[#747780]">download</span>
          </button>
        </div>
      </section>

      {/* Pitch-Side Primed CTA: Pre-Match Countdown / Warmup Entry */}
      <section className="pt-1">
        <button
          onClick={handleAttendanceControl}
          className="w-full h-14 bg-[#00183a] hover:bg-[#0d2d59] text-white rounded-xl font-heading text-[13px] font-bold uppercase tracking-wider flex items-center justify-between px-4 shadow-xl active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#b51a1b] animate-ping"></span>
            <span className="text-left font-heading font-bold text-[15px] leading-tight text-white">
              Control de Asistencia & Calentamiento
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px] text-[#fabc4d]">
              arrow_forward
            </span>
          </div>
        </button>
      </section>
    </div>
  );
};
