import React, { useState } from 'react';
import { Player, AutomationRule, SentMessage } from '../types';
import { CLUB_CREST_URL, CLUB_CREST_WATERMARK } from '../data/initialData';
import { useTextos } from '../lib/textos';
import { diasProximoVencimiento } from '../lib/habilitacion';

interface AlertasVencimientosScreenProps {
  players: Player[];
  rules: AutomationRule[];
  sentMessages: SentMessage[];
  onToggleRule: (ruleId: string) => void;
  onSendBroadcast: (playerIds: string[], topic: string) => void;
  onOpenNewBroadcastModal: () => void;
  onOpenEditTemplateModal: () => void;
  showToast: (msg: string, icon?: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const AlertasVencimientosScreen: React.FC<AlertasVencimientosScreenProps> = ({
  players,
  rules,
  sentMessages,
  onToggleRule,
  onSendBroadcast,
  onOpenNewBroadcastModal,
  onOpenEditTemplateModal,
  showToast,
}) => {
  const t = useTextos();
  const [activeSubTab, setActiveSubTab] = useState<'automaticos' | 'historial' | 'plantillas'>('automaticos');

  // Jugadores con la ficha médica o el carné LUD vencido o por vencer (≤ 5 días)
  const urgentPlayers = players
    .filter((p) => diasProximoVencimiento(p) <= 5)
    .sort((a, b) => diasProximoVencimiento(a) - diasProximoVencimiento(b));

  const handleTestToMobile = () => {
    showToast('Mensaje HSM de prueba enviado a tu WhatsApp oficial (+598)', 'mark_chat_read', 'success');
  };

  const handleBroadcastUrgent = () => {
    const ids = urgentPlayers.map((p) => p.id);
    onSendBroadcast(ids, 'Alerta Carné de Salud');
    showToast(`WhatsApp masivo enviado a ${urgentPlayers.length} jugadores`, 'outgoing_mail', 'success');
  };

  const handleConvocar = () => {
    showToast('Asistente de convocatoria Fecha 7 iniciado para el plantel', 'sports_soccer', 'info');
  };

  return (
    <div className="flex flex-col w-full space-y-4 pb-28">
      {/* Crest & Identity Sub-header Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0d2d59] to-[#00183a] text-white p-4 shadow-md">
        <div className="absolute -right-4 -bottom-6 w-28 h-28 opacity-15 pointer-events-none flex items-center justify-center">
          <img
            src={CLUB_CREST_WATERMARK}
            alt="Escudo Elbio"
            className="w-full h-full object-contain filter brightness-200"
          />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-14 rounded-lg bg-white p-1 shadow-sm flex items-center justify-center shrink-0">
            <img
              src={CLUB_CREST_URL}
              alt="Escudo Oficial Club Elbio Fernández"
              className="h-12 w-auto object-contain drop-shadow"
            />
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
            <h2 className="font-heading font-bold text-[20px] tracking-tight text-white truncate">
              Notificaciones & Envíos
            </h2>
            <p className="font-sans text-[12px] text-[#7b96c8]">
              Automatización WhatsApp y avisos institucionales
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Segmented Navigation */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[#e6e8eb] rounded-xl" role="tablist">
        <button
          onClick={() => setActiveSubTab('automaticos')}
          className={`py-2 px-1 rounded-lg text-center font-heading text-[12px] font-bold transition-all duration-200 ${
            activeSubTab === 'automaticos'
              ? 'bg-white text-[#00183a] shadow-sm'
              : 'text-[#44474f] hover:text-[#00183a]'
          }`}
          type="button"
        >
          Automáticos
        </button>
        <button
          onClick={() => setActiveSubTab('historial')}
          className={`py-2 px-1 rounded-lg text-center font-heading text-[12px] font-bold transition-all duration-200 ${
            activeSubTab === 'historial'
              ? 'bg-white text-[#00183a] shadow-sm'
              : 'text-[#44474f] hover:text-[#00183a]'
          }`}
          type="button"
        >
          Historial
        </button>
        <button
          onClick={() => setActiveSubTab('plantillas')}
          className={`py-2 px-1 rounded-lg text-center font-heading text-[12px] font-bold transition-all duration-200 ${
            activeSubTab === 'plantillas'
              ? 'bg-white text-[#00183a] shadow-sm'
              : 'text-[#44474f] hover:text-[#00183a]'
          }`}
          type="button"
        >
          Plantillas
        </button>
      </div>

      {/* Operational Alert Notification Banner (Campañas Pendientes) */}
      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3 border border-[#e0e3e6]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#b51a1b] animate-pulse"></span>
            <span className="font-heading font-extrabold text-[10px] uppercase tracking-wider text-[#b51a1b]">
              Acción Prioritaria Requerida
            </span>
          </div>
          <span className="font-heading text-[10px] bg-[#ffdad6] text-[#410002] px-2 py-0.5 rounded-full font-bold">
            {urgentPlayers.length} pendientes
          </span>
        </div>

        <div className="bg-[#f2f4f7] rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">medical_services</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-[14px] font-bold text-[#00183a] truncate">
                  Fichas y Carnés por Vencer
                </h3>
                <p className="font-sans text-[12px] text-[#44474f]">
                  {urgentPlayers.length} jugadores inhabilitables este fin de semana
                </p>
              </div>
            </div>
          </div>

          {/* Quick Player Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
            {urgentPlayers.map((p) => {
              const dias = diasProximoVencimiento(p);
              const isExpired = dias <= 0;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md text-[#191c1e] shadow-xs shrink-0 border border-[#e0e3e6]"
                >
                  <img
                    className="w-5 h-5 rounded-full object-cover"
                    src={p.avatarUrl}
                    alt={`${p.firstName} ${p.lastName}`}
                  />
                  <span
                    className={`font-heading text-[10px] font-bold ${
                      isExpired ? 'text-[#b51a1b]' : 'text-[#00183a]'
                    }`}
                  >
                    {p.firstName[0]}. {p.lastName} (
                    {isExpired ? 'Vencido' : `${dias}d`})
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleBroadcastUrgent}
            className="w-full mt-1 bg-[#b51a1b] hover:bg-[#d93630] text-white rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 font-heading text-[12px] font-bold uppercase tracking-wider shadow-sm active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span>Disparar WhatsApp Masivo ({urgentPlayers.length})</span>
          </button>
        </div>

        {/* Second Quick Campaign: Match Announcement */}
        <div className="bg-[#f2f4f7] rounded-lg p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#d7e3ff] text-[#00183a] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">sports_soccer</span>
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-[14px] font-bold text-[#00183a] truncate">
                Convocatoria: {t.fecha} vs {t.rival}
              </h3>
              <p className="font-sans text-[12px] text-[#44474f]">
                {t.partido_dia} {t.partido_hora} • {t.cancha_corta}
              </p>
            </div>
          </div>
          <button
            onClick={handleConvocar}
            className="shrink-0 bg-[#0d2d59] hover:bg-[#00183a] text-white py-2 px-3 rounded-lg font-heading text-[12px] font-bold tracking-wide active:scale-95 transition-transform flex items-center gap-1 shadow-sm"
          >
            <span>Convocar</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Automation Rules Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Reglas de Automatización
            </h3>
            <p className="font-sans text-[12px] text-[#44474f]">
              Triggers automáticos conectados a WhatsApp Cloud API
            </p>
          </div>
          <span className="font-heading text-[10px] bg-[#d7e3ff] text-[#00183a] px-2 py-0.5 rounded-full font-bold">
            {rules.filter((r) => r.active).length} ACTIVAS
          </span>
        </div>

        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-xl bg-white p-3.5 shadow-sm flex items-center justify-between gap-3 border border-[#e0e3e6]/40"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl ${rule.iconBgClass} ${rule.iconColorClass} flex items-center justify-center shrink-0`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {rule.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-heading text-[14px] font-bold text-[#00183a]">
                      {rule.title}
                    </h4>
                    <span
                      className={`font-heading text-[10px] px-1.5 py-0.5 rounded ${
                        rule.tagClass || 'bg-[#e6e8eb] text-[#44474f]'
                      }`}
                    >
                      {rule.categoryTag}
                    </span>
                  </div>
                  <p className="font-sans text-[12px] text-[#44474f] mt-0.5">
                    {rule.description}
                  </p>
                </div>
              </div>

              {/* iOS Style Custom Toggle */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-1">
                <input
                  type="checkbox"
                  checked={rule.active}
                  onChange={() => {
                    onToggleRule(rule.id);
                    showToast(
                      `${rule.title}: ${!rule.active ? 'Activado' : 'Pausado'}`,
                      rule.active ? 'toggle_off' : 'toggle_on',
                      rule.active ? 'warning' : 'success'
                    );
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#e0e3e6] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d2d59]"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Interactive Template Preview Section */}
      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3 border border-[#e0e3e6]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00183a] text-[20px]">
              chat
            </span>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Vista Previa de Plantilla
            </h3>
          </div>
          <span className="font-heading text-[10px] text-[#44474f] bg-[#eceef1] px-2 py-0.5 rounded font-bold">
            WhatsApp HSM
          </span>
        </div>

        {/* Realistic WhatsApp Bubble Mockup */}
        <div className="bg-[#f2f4f7] p-3 rounded-xl relative overflow-hidden border border-[#e0e3e6]">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#eceef1]">
            <div className="w-7 h-7 rounded-full bg-[#0d2d59] flex items-center justify-center text-white shrink-0 p-1">
              <img
                alt="Mini escudo"
                className="w-full h-full object-contain"
                src={CLUB_CREST_URL}
              />
            </div>
            <div>
              <span className="font-heading text-[12px] text-[#00183a] font-bold block">
                Club Elbio Fernández (Oficial)
              </span>
              <span className="font-sans text-[10px] text-[#44474f] block leading-none">
                Canal Verificado de Notificaciones
              </span>
            </div>
          </div>

          {/* Message bubble */}
          <div className="bg-white rounded-lg rounded-tl-none p-3 shadow-xs max-w-[94%] space-y-1.5 border border-[#e0e3e6]/60">
            <p className="font-sans text-[13px] text-[#191c1e] leading-relaxed">
              Hola{' '}
              <span className="bg-[#d7e3ff] text-[#00183a] px-1.5 py-0.5 rounded font-heading font-bold text-xs">
                [Nombre]
              </span>
              , desde Club Elbio Fernández te recordamos que tu{' '}
              <strong className="font-bold text-[#00183a]">Carné de Salud</strong>{' '}
              vence el{' '}
              <span className="bg-[#ffdad6] text-[#b51a1b] px-1.5 py-0.5 rounded font-heading font-bold text-xs">
                [Fecha]
              </span>
              .<br />
              <br />
              Para mantenerte habilitado en la Liga Universitaria, gestioná tu
              renovación y envianos la foto de comprobante aquí. ¡Arriba Elbio! 🔴⚪🔵
            </p>
            <div className="flex items-center justify-end gap-1 pt-1 text-[#44474f]">
              <span className="font-sans text-[10px]">10:42</span>
              <span className="material-symbols-outlined text-[14px] text-[#445e8d]">
                done_all
              </span>
            </div>
          </div>
        </div>

        {/* Template Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onOpenEditTemplateModal}
            className="flex-1 py-2.5 px-3 bg-[#e6e8eb] hover:bg-[#eceef1] text-[#00183a] rounded-lg font-heading text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            <span>Editar Plantilla</span>
          </button>
          <button
            onClick={handleTestToMobile}
            className="flex-1 py-2.5 px-3 bg-[#0d2d59] hover:bg-[#00183a] text-white rounded-lg font-heading text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">cell_tower</span>
            <span>Test a Mi Móvil</span>
          </button>
        </div>
      </div>

      {/* Delivery / Read History (Registro de Últimos Envíos) */}
      <div className="rounded-xl bg-white p-4 shadow-sm space-y-3 border border-[#e0e3e6]/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-[18px] text-[#00183a]">
              Últimos Envíos Realizados
            </h3>
            <p className="font-sans text-[12px] text-[#44474f]">
              Monitoreo de recepción y lectura en tiempo real
            </p>
          </div>
          <button
            onClick={() => setActiveSubTab('historial')}
            className="font-heading text-[10px] text-[#00183a] font-bold underline uppercase"
          >
            Ver todos
          </button>
        </div>

        <div className="space-y-2">
          {sentMessages.map((msg) => (
            <div
              key={msg.id}
              className="p-2.5 rounded-lg bg-[#f2f4f7] flex items-center justify-between gap-3 border border-[#e0e3e6]/30"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <img
                    className="w-10 h-10 rounded-full object-cover"
                    src={msg.playerAvatar}
                    alt={msg.playerName}
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 ${msg.avatarIndicatorColor} rounded-full border border-white`}
                  ></span>
                </div>
                <div className="min-w-0">
                  <h4 className="font-heading text-[12px] font-bold text-[#00183a] truncate">
                    {msg.playerName}
                  </h4>
                  <p className="font-sans text-[11px] text-[#44474f] truncate">
                    {msg.topic}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 bg-white px-2 py-1 rounded-md text-[#44474f] border border-[#e0e3e6]">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    msg.status === 'Leído' ? 'text-[#445e8d]' : 'text-[#747780]'
                  }`}
                  style={{
                    fontVariationSettings:
                      msg.status === 'Leído' ? "'FILL' 1" : "'FILL' 0",
                  }}
                >
                  done_all
                </span>
                <span className="font-heading text-[10px] font-bold">
                  {msg.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Floating Action Button for Mass Messaging */}
      <div className="pt-2">
        <button
          onClick={onOpenNewBroadcastModal}
          className="w-full bg-[#00183a] hover:bg-[#0d2d59] text-white h-13 rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">campaign</span>
          <span className="font-heading text-[14px] font-bold uppercase tracking-wider">
            Crear Nuevo Mensaje Masivo
          </span>
        </button>
      </div>
    </div>
  );
};
