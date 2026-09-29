import React, { useState } from 'react';
import { Player } from '../types';
import { CLUB_CREST_URL } from '../data/initialData';

interface TesoreriaCuotasScreenProps {
  players: Player[];
  onOpenPaymentModal: (player?: Player) => void;
  onSendWhatsAppReminder: (player: Player) => void;
  onSendMassReminder: () => void;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const TesoreriaCuotasScreen: React.FC<TesoreriaCuotasScreenProps> = ({
  players,
  onOpenPaymentModal,
  onSendWhatsAppReminder,
  onSendMassReminder,
  showToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('Abril 2025');

  const paidCount = players.filter((p) => p.dues.april2025 === 'paid').length;
  const pendingCount = players.filter((p) => p.dues.april2025 === 'pending').length;
  const overdueCount = players.filter((p) => p.dues.april2025 === 'overdue').length;
  const totalCount = players.length;

  const totalCollected = paidCount * 1400 + 4200; // Realistic math
  const totalGoal = totalCount * 1400;
  const remaining = Math.max(0, totalGoal - totalCollected);
  const percentage = Math.min(100, Math.round((totalCollected / totalGoal) * 100));

  const filteredPlayers = players.filter((p) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'paid'
        ? p.dues.april2025 === 'paid'
        : filter === 'pending'
        ? p.dues.april2025 === 'pending'
        : p.dues.april2025 === 'overdue';

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term) ||
      p.number.toString().includes(term) ||
      p.position.toLowerCase().includes(term);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full space-y-4 pb-28 relative">
      {/* Encabezado Institucional de Tesorería */}
      <section className="bg-[#0d2d59] text-white rounded-xl p-4 shadow-md relative overflow-hidden">
        <div className="absolute -right-4 -top-6 w-32 h-32 bg-[#00183a]/40 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="material-symbols-outlined text-[16px] text-[#fabc4d]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              <span className="font-heading font-extrabold text-[10px] text-[#fabc4d] tracking-wider uppercase">
                Temporada 2025 • Liga Universitaria
              </span>
            </div>
            <h2 className="font-heading font-bold text-[20px] text-white leading-tight">
              Tesorería & Cuotas
            </h2>
            <span className="font-sans text-[12px] text-[#7b96c8]">
              Plantel Mayores Masculino
            </span>
          </div>
          <img
            src={CLUB_CREST_URL}
            alt="Escudo Oficial Club Elbio Fernández"
            className="w-12 h-14 object-contain shrink-0 drop-shadow-md"
          />
        </div>

        {/* Selector de Período y Concepto */}
        <div className="mt-4 pt-2 bg-[#00183a]/50 rounded-lg p-2.5 flex flex-col gap-2 border border-white/10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedMonth('Marzo 2025');
                showToast('Mostrando período: Marzo 2025');
              }}
              aria-label="Mes anterior"
              className="w-8 h-8 rounded-full bg-[#0d2d59]/90 hover:bg-[#00183a] text-white flex items-center justify-center transition-transform active:scale-90"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#fabc4d]">
                calendar_month
              </span>
              <span className="font-heading font-bold text-[14px] text-white tracking-wide">
                {selectedMonth}
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedMonth('Mayo 2025');
                showToast('Mostrando período: Mayo 2025');
              }}
              aria-label="Mes siguiente"
              className="w-8 h-8 rounded-full bg-[#0d2d59]/90 hover:bg-[#00183a] text-white flex items-center justify-center transition-transform active:scale-90"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          <div className="bg-white text-[#191c1e] rounded-lg px-3 py-2 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#b51a1b] text-[20px]">
                payments
              </span>
              <div className="flex flex-col">
                <span className="font-heading font-extrabold text-[10px] text-[#44474f] uppercase">
                  Concepto Actual
                </span>
                <span className="font-heading font-bold text-[12px] text-[#00183a]">
                  Cuota Social Mensual ($1.400)
                </span>
              </div>
            </div>
            <button
              onClick={() => showToast('Conceptos: Cuota Social, Cuota Indumentaria, Ficha Médica LUD')}
              className="text-[#00183a] hover:text-[#b51a1b] p-1 flex items-center"
            >
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
          </div>
        </div>
      </section>

      {/* Tarjetas KPI de Recaudación */}
      <section className="grid grid-cols-3 gap-2">
        {/* Al día */}
        <button
          onClick={() => setFilter('paid')}
          className={`bg-white rounded-xl p-2.5 flex flex-col shadow-sm text-left border transition-all ${
            filter === 'paid' ? 'border-[#1b5e20] ring-2 ring-[#1b5e20]/20' : 'border-[#e0e3e6]/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1b5e20]"></span>
            <span className="material-symbols-outlined text-[#1b5e20] text-[16px]">
              check_circle
            </span>
          </div>
          <span className="font-heading font-bold text-[18px] text-[#00183a]">
            {paidCount}
          </span>
          <span className="font-heading font-bold text-[10px] text-[#44474f]">
            Al Día
          </span>
        </button>

        {/* Pendientes */}
        <button
          onClick={() => setFilter('pending')}
          className={`bg-white rounded-xl p-2.5 flex flex-col shadow-sm text-left border transition-all ${
            filter === 'pending' ? 'border-[#b76e00] ring-2 ring-[#b76e00]/20' : 'border-[#e0e3e6]/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b76e00]"></span>
            <span className="material-symbols-outlined text-[#b76e00] text-[16px]">
              pending
            </span>
          </div>
          <span className="font-heading font-bold text-[18px] text-[#00183a]">
            {pendingCount}
          </span>
          <span className="font-heading font-bold text-[10px] text-[#44474f]">
            Pendientes
          </span>
        </button>

        {/* Morosos */}
        <button
          onClick={() => setFilter('overdue')}
          className={`bg-white rounded-xl p-2.5 flex flex-col shadow-sm text-left border transition-all ${
            filter === 'overdue' ? 'border-[#b51a1b] ring-2 ring-[#b51a1b]/20' : 'border-[#e0e3e6]/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b51a1b]"></span>
            <span className="material-symbols-outlined text-[#b51a1b] text-[16px]">
              warning
            </span>
          </div>
          <span className="font-heading font-bold text-[18px] text-[#b51a1b]">
            {overdueCount}
          </span>
          <span className="font-heading font-bold text-[10px] text-[#44474f]">
            &gt;2 Meses
          </span>
        </button>
      </section>

      {/* Barra de Meta Financiera */}
      <section className="bg-white rounded-xl p-4 shadow-sm flex flex-col gap-2 border border-[#e0e3e6]/60">
        <div className="flex items-baseline justify-between">
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-[10px] uppercase text-[#44474f]">
              Total Recaudado
            </span>
            <span className="font-heading font-bold text-[24px] text-[#00183a] tracking-tight">
              ${totalCollected.toLocaleString('es-UY')}{' '}
              <span className="font-sans text-[12px] text-[#44474f] font-normal">
                / ${totalGoal.toLocaleString('es-UY')}
              </span>
            </span>
          </div>
          <div className="bg-[#00183a]/10 text-[#00183a] px-2.5 py-1 rounded-full font-heading font-bold text-[12px] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>{percentage}% Meta</span>
          </div>
        </div>
        <div className="w-full bg-[#e0e3e6] rounded-full h-3 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-[#00183a] to-[#445e8d] h-full rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[#44474f] font-sans text-[12px] pt-0.5">
          <span>Faltan cobrar: ${remaining.toLocaleString('es-UY')}</span>
          <span>{totalCount} Plantel Total</span>
        </div>
      </section>

      {/* Banner Normativo Liga Universitaria */}
      <section className="bg-[#ffdad6] text-[#410002] rounded-xl p-3 shadow-sm flex items-start gap-2.5 border border-[#ba1a1a]/20">
        <span
          className="material-symbols-outlined text-[#b51a1b] shrink-0 text-[20px] mt-0.5"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          gavel
        </span>
        <div className="flex flex-col">
          <span className="font-heading font-bold text-[12px] text-[#b51a1b]">
            Reglamento Liga Universitaria
          </span>
          <p className="font-sans text-[12px] mt-0.5 leading-relaxed text-[#410002]">
            Jugadores con más de 2 cuotas pendientes{' '}
            <strong>no podrán retirar su carné físico</strong> oficial para la Fecha 5.
          </p>
        </div>
      </section>

      {/* Buscador y Chips de Filtrado */}
      <section className="flex flex-col gap-2">
        <div className="bg-white rounded-lg px-3 py-2 flex items-center gap-2 shadow-sm border border-[#e0e3e6]/80">
          <span className="material-symbols-outlined text-[#747780] text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o número..."
            className="bg-transparent border-none outline-none font-sans text-[14px] text-[#00183a] w-full placeholder:text-[#747780]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[#747780] hover:text-[#00183a]"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Chips Horizontales */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full font-heading text-[10px] font-bold whitespace-nowrap shadow-sm transition-all ${
              filter === 'all'
                ? 'bg-[#00183a] text-white'
                : 'bg-[#e6e8eb] text-[#44474f] hover:bg-[#e0e3e6]'
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-full font-heading text-[10px] font-bold whitespace-nowrap transition-all ${
              filter === 'pending'
                ? 'bg-[#b76e00] text-white shadow-sm'
                : 'bg-[#e6e8eb] text-[#44474f] hover:bg-[#e0e3e6]'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-full font-heading text-[10px] font-bold whitespace-nowrap transition-all ${
              filter === 'overdue'
                ? 'bg-[#b51a1b] text-white shadow-sm'
                : 'bg-[#e6e8eb] text-[#b51a1b] hover:bg-[#e0e3e6]'
            }`}
          >
            Morosos ({overdueCount})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3 py-1.5 rounded-full font-heading text-[10px] font-bold whitespace-nowrap transition-all ${
              filter === 'paid'
                ? 'bg-[#1b5e20] text-white shadow-sm'
                : 'bg-[#e6e8eb] text-[#1b5e20] hover:bg-[#e0e3e6]'
            }`}
          >
            Al día ({paidCount})
          </button>
        </div>
      </section>

      {/* Listado de Jugadores */}
      <section className="flex flex-col space-y-2.5">
        {filteredPlayers.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-[#e0e3e6]">
            <span className="material-symbols-outlined text-[32px] text-[#747780] mb-2">
              person_search
            </span>
            <p className="font-heading text-sm font-bold text-[#00183a]">
              No se encontraron jugadores con ese filtro
            </p>
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const isPaid = player.dues.april2025 === 'paid';
            const isPending = player.dues.april2025 === 'pending';
            const isOverdue = player.dues.april2025 === 'overdue';

            return (
              <div
                key={player.id}
                className="bg-white rounded-xl p-3.5 shadow-sm flex flex-col gap-2.5 border border-[#e0e3e6]/60 transition-transform active:scale-[0.99]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[#e0e3e6]">
                      <img
                        className="w-full h-full object-cover"
                        src={player.avatarUrl}
                        alt={`${player.firstName} ${player.lastName}`}
                      />
                      <span
                        className={`absolute bottom-0 right-0 font-heading text-[10px] font-bold px-1 rounded-tl-md ${
                          isOverdue ? 'bg-[#b51a1b] text-white' : 'bg-[#00183a] text-white'
                        }`}
                      >
                        #{player.number}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-heading font-semibold text-[16px] text-[#00183a] truncate">
                          {player.firstName} {player.lastName}
                        </h3>
                        {player.isCaptain && (
                          <span
                            className="material-symbols-outlined text-[#fabc4d] text-[16px]"
                            title="Capitán"
                          >
                            shield_person
                          </span>
                        )}
                      </div>
                      <span className="font-sans text-[12px] text-[#44474f]">
                        {player.position} • Cat. {player.birthYear}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isPaid && (
                    <span className="inline-flex items-center gap-1 bg-[#e8f5e9] text-[#1b5e20] px-2.5 py-1 rounded-full font-heading text-[10px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[14px]">
                        check_circle
                      </span>
                      Al Día
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 bg-[#fff8e1] text-[#b76e00] px-2.5 py-1 rounded-full font-heading text-[10px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      Pendiente
                    </span>
                  )}
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 bg-[#ffebee] text-[#b51a1b] px-2.5 py-1 rounded-full font-heading text-[10px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[14px]">block</span>
                      Carné Retenido
                    </span>
                  )}
                </div>

                {/* Info row */}
                {isPaid && (
                  <div className="flex items-center justify-between text-[#44474f] font-sans text-[12px] bg-[#f2f4f7] px-2.5 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#1b5e20]">
                        receipt_long
                      </span>
                      Pagado: {player.dues.paidDate || '08/04'}
                    </span>
                    <span className="font-heading text-[10px] font-bold text-[#00183a]">
                      {player.dues.paymentMethod || 'Transferencia BROU'}{' '}
                      {player.dues.receiptNumber && `(${player.dues.receiptNumber})`}
                    </span>
                  </div>
                )}

                {isPending && (
                  <>
                    <div className="flex items-center justify-between text-[#44474f] font-sans text-[12px] bg-[#f2f4f7] px-2.5 py-1.5 rounded-lg">
                      <span className="font-heading text-[12px] font-bold text-[#00183a]">
                        Abril: $1.400
                      </span>
                      <span className="text-[#b76e00] font-heading text-[10px] font-bold">
                        Vence 15/04 (en 3 días)
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        onClick={() => onOpenPaymentModal(player)}
                        className="bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[12px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          add_card
                        </span>
                        Cobrar
                      </button>
                      <button
                        onClick={() => onSendWhatsAppReminder(player)}
                        className="bg-[#25d366]/15 hover:bg-[#25d366]/25 text-[#128c7e] font-heading text-[12px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                      >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        Avisar WhatsApp
                      </button>
                    </div>
                  </>
                )}

                {isOverdue && (
                  <>
                    <div className="bg-[#ffdad6]/60 text-[#410002] p-2 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#b51a1b] text-[18px]">
                          error
                        </span>
                        <span className="font-heading text-[12px] font-bold">
                          Deuda: ${player.dues.debtAmount.toLocaleString('es-UY')} (Mar + Abr)
                        </span>
                      </div>
                      <span className="font-heading text-[10px] bg-[#b51a1b] text-white px-1.5 py-0.5 rounded font-bold">
                        Inhabilitado
                      </span>
                    </div>
                    <button
                      onClick={() => onSendWhatsAppReminder(player)}
                      className="w-full bg-[#b51a1b] hover:bg-[#d93630] text-white font-heading text-[12px] font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        notifications_active
                      </span>
                      Reclamar Pago Urgente
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Floating Action Bar */}
      <div className="pt-2 pb-1">
        <button
          onClick={onSendMassReminder}
          className="w-full bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[14px] font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <span className="material-symbols-outlined text-[20px] text-[#fabc4d]">
            campaign
          </span>
          Recordatorio Masivo a Deudores ({pendingCount + overdueCount})
        </button>
      </div>

      {/* FAB (+) button for quick payment */}
      <button
        onClick={() => onOpenPaymentModal()}
        aria-label="Registrar nuevo cobro"
        className="fixed right-5 bottom-20 z-40 bg-[#b51a1b] hover:bg-[#d93630] text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[28px]">add</span>
      </button>
    </div>
  );
};
