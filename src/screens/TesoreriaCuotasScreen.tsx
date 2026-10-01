import React, { useState } from 'react';
import { DuesStatus, Player } from '../types';
import { CLUB_CREST_URL } from '../data/initialData';
import { nombrePeriodo, periodoActual, sumarMeses } from '../lib/fechas';
import { useTextos } from '../lib/textos';
import { bloquearPorDeuda } from '../lib/habilitacion';

interface TesoreriaCuotasScreenProps {
  players: Player[];
  onOpenPaymentModal: (player?: Player) => void;
  onSendWhatsAppReminder: (player: Player) => void;
  onSendMassReminder: () => void;
  /** Genera las cuotas del mes actual. Sin definir = sin permiso (solo admin y tesorería). */
  onGenerarCuotas?: () => Promise<void>;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const TesoreriaCuotasScreen: React.FC<TesoreriaCuotasScreenProps> = ({
  players,
  onOpenPaymentModal,
  onSendWhatsAppReminder,
  onSendMassReminder,
  onGenerarCuotas,
  showToast,
}) => {
  const t = useTextos();
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const monto = Number(t.cuota_monto) || 1400;
  const mesActual = periodoActual();
  const [verConcepto, setVerConcepto] = useState(false);
  const [generando, setGenerando] = useState(false);

  /** Estado de la cuota de un jugador en un mes (null = no tiene cuota ese mes). */
  const cuotaEn = (p: Player, period: string): { status: DuesStatus; amount: number } | null => {
    if (p.dues.history) return p.dues.history.find((h) => h.period === period) ?? null;
    return p.dues.period === period ? { status: p.dues.status, amount: monto } : null;
  };

  // Meses con cuotas, más el actual; se navega con las flechas.
  const periodos = [
    ...new Set([mesActual, ...players.flatMap((p) => (p.dues.history ?? [{ period: p.dues.period }]).map((h) => h.period))]),
  ].sort();
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const conCuotas = periodos.filter((m) => players.some((p) => cuotaEn(p, m)));
    return conCuotas.includes(mesActual) || conCuotas.length === 0 ? mesActual : conCuotas[conCuotas.length - 1];
  });
  const idx = periodos.indexOf(selectedPeriod);
  const selectedMonth = nombrePeriodo(selectedPeriod);

  const cuotasDelMes = players.map((p) => cuotaEn(p, selectedPeriod)).filter((c) => c !== null);
  const paidCount = cuotasDelMes.filter((c) => c.status === 'paid').length;
  const pendingCount = cuotasDelMes.filter((c) => c.status === 'pending').length;
  const overdueCount = cuotasDelMes.filter((c) => c.status === 'overdue').length;
  const totalCount = players.length;

  const totalCollected = cuotasDelMes.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
  const totalGoal = cuotasDelMes.reduce((s, c) => s + c.amount, 0);
  const remaining = Math.max(0, totalGoal - totalCollected);
  const percentage = totalGoal ? Math.min(100, Math.round((totalCollected / totalGoal) * 100)) : 0;
  const deudoresTotales = players.filter((p) => p.dues.debtAmount > 0 || p.dues.status === 'overdue').length;

  const generar = async () => {
    if (!onGenerarCuotas) return;
    setGenerando(true);
    await onGenerarCuotas();
    setGenerando(false);
    setSelectedPeriod(mesActual);
  };

  const filteredPlayers = players.filter((p) => {
    const matchesFilter =
      filter === 'all'
        ? true
        : filter === 'paid'
        ? cuotaEn(p, selectedPeriod)?.status === 'paid'
        : filter === 'pending'
        ? cuotaEn(p, selectedPeriod)?.status === 'pending'
        : cuotaEn(p, selectedPeriod)?.status === 'overdue';

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      p.firstName.toLowerCase().includes(term) ||
      p.lastName.toLowerCase().includes(term) ||
      String(p.number ?? '').includes(term) ||
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
                Temporada {t.temporada} • Liga Universitaria
              </span>
            </div>
            <h2 className="font-heading font-bold text-[20px] text-white leading-tight">
              Tesorería & Cuotas
            </h2>
            <span className="font-sans text-[12px] text-[#7b96c8]">
              Plantel {t.categoria} Masculino
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
              onClick={() => setSelectedPeriod(idx > 0 ? periodos[idx - 1] : sumarMeses(selectedPeriod, -1))}
              disabled={idx <= 0}
              aria-label="Mes anterior"
              className="w-8 h-8 rounded-full bg-[#0d2d59]/90 hover:bg-[#00183a] text-white flex items-center justify-center transition-transform active:scale-90 disabled:opacity-30"
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
              onClick={() => setSelectedPeriod(periodos[idx + 1] ?? selectedPeriod)}
              disabled={idx >= periodos.length - 1}
              aria-label="Mes siguiente"
              className="w-8 h-8 rounded-full bg-[#0d2d59]/90 hover:bg-[#00183a] text-white flex items-center justify-center transition-transform active:scale-90 disabled:opacity-30"
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
                  Cuota Social Mensual (${monto.toLocaleString('es-UY')})
                </span>
              </div>
            </div>
            <button
              onClick={() => setVerConcepto((v) => !v)}
              aria-expanded={verConcepto}
              aria-label="Ver detalle de la cuota"
              className="text-[#00183a] hover:text-[#b51a1b] p-1 flex items-center"
            >
              <span className="material-symbols-outlined text-[18px]">{verConcepto ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
          {(verConcepto || (totalGoal === 0 && selectedPeriod === mesActual)) && (
            <div className="bg-white/95 text-[#191c1e] rounded-lg px-3 py-2.5 flex flex-col gap-2 font-sans text-[12px]">
              <p>
                Cuota de ${monto.toLocaleString('es-UY')} que vence el día {t.cuota_dia_vencimiento} de cada mes. El valor y
                el día se cambian en Club → Textos de la app.
              </p>
              {totalGoal === 0 && selectedPeriod === mesActual && (
                <p className="font-bold text-[#b76e00]">Todavía no se generaron las cuotas de {nombrePeriodo(mesActual)}.</p>
              )}
              {onGenerarCuotas && selectedPeriod === mesActual && (
                <button
                  onClick={generar}
                  disabled={generando}
                  className="h-10 rounded-lg bg-[#00183a] text-white font-heading text-[12px] font-bold disabled:opacity-60"
                >
                  {generando
                    ? 'Generando…'
                    : `Generar cuotas de ${nombrePeriodo(mesActual)} ($${monto.toLocaleString('es-UY')} c/u)`}
                </button>
              )}
            </div>
          )}
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
            const cuota = cuotaEn(player, selectedPeriod);
            const isPaid = cuota?.status === 'paid';
            const isPending = cuota?.status === 'pending';
            const isOverdue = cuota?.status === 'overdue';
            const bloquea = bloquearPorDeuda(t.bloquear_por_deuda);

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
                        #{player.number ?? '–'}
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
                      Vencida
                    </span>
                  )}
                  {!cuota && (
                    <span className="inline-flex items-center gap-1 bg-[#f2f4f7] text-[#747780] px-2.5 py-1 rounded-full font-heading text-[10px] font-bold shrink-0">
                      Sin cuota
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
                      Pagado{player.dues.paidDate ? `: ${player.dues.paidDate}` : ''}
                    </span>
                    <span className="font-heading text-[10px] font-bold text-[#00183a]">
                      {player.dues.paymentMethod}{' '}
                      {player.dues.receiptNumber && `(${player.dues.receiptNumber})`}
                    </span>
                  </div>
                )}

                {isPending && (
                  <>
                    <div className="flex items-center justify-between text-[#44474f] font-sans text-[12px] bg-[#f2f4f7] px-2.5 py-1.5 rounded-lg">
                      <span className="font-heading text-[12px] font-bold text-[#00183a]">
                        {nombrePeriodo(selectedPeriod).split(' ')[0]}: $
                        {(cuota?.amount ?? 0).toLocaleString('es-UY')}
                      </span>
                      <span className="text-[#b76e00] font-heading text-[10px] font-bold">
                        Vence {t.cuota_dia_vencimiento.padStart(2, '0')}/{selectedPeriod.slice(5, 7)}
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
                          Deuda: ${player.dues.debtAmount.toLocaleString('es-UY')}
                        </span>
                      </div>
                      {bloquea && (
                        <span className="font-heading text-[10px] bg-[#b51a1b] text-white px-1.5 py-0.5 rounded font-bold">
                          Inhabilitado
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onOpenPaymentModal(player)}
                        className="bg-[#00183a] hover:bg-[#0d2d59] text-white font-heading text-[12px] font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">add_card</span>
                        Cobrar
                      </button>
                      <button
                        onClick={() => onSendWhatsAppReminder(player)}
                        className="bg-[#b51a1b] hover:bg-[#d93630] text-white font-heading text-[12px] font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">notifications_active</span>
                        Reclamar
                      </button>
                    </div>
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
          Recordatorio Masivo a Deudores ({deudoresTotales})
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
