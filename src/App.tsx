import { useState } from 'react';
import { TabType, Player, AutomationRule, SentMessage } from './types';
import { INITIAL_PLAYERS, INITIAL_RULES, INITIAL_SENT_MESSAGES } from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import {
  NewBroadcastModal,
  EditTemplateModal,
  PaymentModal,
  AssignRoleModal,
  PlanillaPdfModal,
} from './components/Modals';

// Screens
import { AlertasVencimientosScreen } from './screens/AlertasVencimientosScreen';
import { TesoreriaCuotasScreen } from './screens/TesoreriaCuotasScreen';
import { PlanillaOpsScreen } from './screens/PlanillaOpsScreen';
import { PerfilJugadorScreen } from './screens/PerfilJugadorScreen';
import { ClubProfileScreen } from './screens/ClubProfileScreen';
import { NuevoJugadorWizard } from './screens/NuevoJugadorWizard';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('alertas');
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [rules, setRules] = useState<AutomationRule[]>(INITIAL_RULES);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>(INITIAL_SENT_MESSAGES);

  // Toast feedback state
  const [toast, setToast] = useState<{
    message: string | null;
    icon?: string;
    type?: 'success' | 'warning' | 'info' | 'error';
  }>({ message: null });

  // Modal states
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isEditTemplateModalOpen, setIsEditTemplateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPlayerForPayment, setSelectedPlayerForPayment] = useState<Player | undefined>();
  const [isAssignRoleModalOpen, setIsAssignRoleModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const showToast = (
    message: string,
    icon: string = 'check_circle',
    type: 'success' | 'warning' | 'info' | 'error' = 'success'
  ) => {
    setToast({ message, icon, type });
    setTimeout(() => {
      setToast({ message: null });
    }, 3200);
  };

  // Rule toggle handler
  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r))
    );
  };

  // Broadcast sender
  const handleSendBroadcast = (playerIds: string[], topic: string) => {
    const newSent: SentMessage[] = playerIds.map((id, index) => {
      const p = players.find((pl) => pl.id === id);
      return {
        id: `sent-${Date.now()}-${index}`,
        playerName: p ? `${p.firstName} ${p.lastName}` : 'Jugador Elbio',
        playerAvatar:
          p?.avatarUrl ||
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCvQDwfV4vbUqk5s9zW1RO4SHyEuj2NS4kb5C4YjvEtEDXTmyHYA2hNIGGae30-GHjoyrBr3s-G23HtZGR2oYS9vy3MvIwJrWMDtdx96YQZD0HzenV4LTcu_AkY21Rjs2uYY7rFH-zJQe1cMkrO-I_C3lXqKrcF31D1BcUmYezDyNXNWktnGFChPJsssv4vF4az8ydNqr2svgKgZsKxqAqWLYEJtWXHMO97ceWmaXiSogKbIFhgVFaG',
        topic: `${topic} • Hace unos instantes`,
        timestamp: 'Ahora',
        status: 'Entregado',
        statusColor: 'text-[#445e8d]',
        avatarIndicatorColor: 'bg-[#445e8d]',
      };
    });
    setSentMessages((prev) => [...newSent, ...prev]);
  };

  // Payment confirmation
  const handleConfirmPayment = (playerId: string, amount: number, method: string) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            dues: {
              ...p.dues,
              april2025: 'paid',
              debtAmount: 0,
              paidDate: 'Hoy',
              paymentMethod: method,
              receiptNumber: `#${Math.floor(1000 + Math.random() * 9000)}`,
            },
          };
        }
        return p;
      })
    );
    showToast(`Cobro de $${amount} registrado exitosamente (${method})`, 'verified', 'success');
  };

  // Add new player from wizard
  const handleSaveNewPlayer = (newPlayer: Player) => {
    setPlayers((prev) => [newPlayer, ...prev]);
    setCurrentTab('planilla');
  };

  // Update attendance of Agustín Moreira
  const handleUpdateAttendance = (confirmed: boolean, reason?: string) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === 'p1'
          ? {
              ...p,
              matchStatus: {
                ...p.matchStatus,
                attendanceConfirmed: confirmed,
                declineReason: reason,
              },
            }
          : p
      )
    );
  };

  // Screen titles
  const screenMeta: Record<TabType, { title: string; subtitle: string }> = {
    alertas: { title: 'Alertas Y Vencimientos', subtitle: 'Club Elbio Fernández' },
    tesoreria: { title: 'Tesorería & Cuotas', subtitle: 'Club Elbio Fernández' },
    planilla: { title: 'Match Sheet Ops', subtitle: 'Club Elbio Fernández' },
    jugador: { title: 'Mi Perfil Deportista', subtitle: 'Club Elbio Fernández' },
    club: { title: 'Configuración General', subtitle: 'Club Elbio Fernández' },
    'nuevo-jugador': { title: 'Nuevo Jugador', subtitle: 'Club Elbio Fernández' },
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col antialiased">
      {/* Dynamic Top App Bar */}
      <Header
        currentTab={currentTab}
        title={screenMeta[currentTab].title}
        subtitle={screenMeta[currentTab].subtitle}
        showBack={currentTab === 'nuevo-jugador'}
        onBackClick={() => setCurrentTab('alertas')}
        onSearchClick={() => showToast('Buscador rápido activado')}
        onNotificationsClick={() => showToast('Tienes 3 avisos prioritarios de Liga')}
      />

      {/* Quick Screen Carousel Shortcut Ribbon for Easy Exploration of ALL Screens */}
      <div className="fixed top-16 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#e0e3e6]/80 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs">
        <span className="font-heading font-extrabold text-[9px] uppercase tracking-wider text-[#747780] mr-1 shrink-0">
          Vistas:
        </span>
        {[
          { id: 'alertas' as TabType, label: '🔔 Alertas', count: 3 },
          { id: 'tesoreria' as TabType, label: '💰 Cuotas', count: 5 },
          { id: 'planilla' as TabType, label: '📋 Planilla DT', count: undefined },
          { id: 'jugador' as TabType, label: '⚽ Mi Ficha', count: undefined },
          { id: 'club' as TabType, label: '⚙️ Club Admin', count: undefined },
          { id: 'nuevo-jugador' as TabType, label: '➕ Nuevo Jugador', count: undefined },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setCurrentTab(btn.id)}
            className={`px-2.5 py-1 rounded-full font-heading text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              currentTab === btn.id
                ? 'bg-[#00183a] text-white shadow-xs'
                : 'bg-[#f2f4f7] text-[#44474f] hover:bg-[#e6e8eb]'
            }`}
          >
            <span>{btn.label}</span>
            {btn.count && (
              <span className="w-4 h-4 rounded-full bg-[#b51a1b] text-white text-[9px] flex items-center justify-center font-bold">
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 pt-28 pb-8 flex flex-col">
        {currentTab === 'alertas' && (
          <AlertasVencimientosScreen
            players={players}
            rules={rules}
            sentMessages={sentMessages}
            onToggleRule={handleToggleRule}
            onSendBroadcast={handleSendBroadcast}
            onOpenNewBroadcastModal={() => setIsBroadcastModalOpen(true)}
            onOpenEditTemplateModal={() => setIsEditTemplateModalOpen(true)}
            showToast={showToast}
          />
        )}

        {currentTab === 'tesoreria' && (
          <TesoreriaCuotasScreen
            players={players}
            onOpenPaymentModal={(p) => {
              setSelectedPlayerForPayment(p);
              setIsPaymentModalOpen(true);
            }}
            onSendWhatsAppReminder={(p) => {
              showToast(`WhatsApp de cobro enviado a ${p.firstName} (${p.phone})`, 'send', 'success');
            }}
            onSendMassReminder={() => {
              const deudores = players
                .filter((p) => p.dues.april2025 !== 'paid')
                .map((p) => p.id);
              handleSendBroadcast(deudores, 'Recordatorio de Cuota Social');
              showToast(`Recordatorio enviado por WhatsApp a ${deudores.length} jugadores`, 'campaign', 'success');
            }}
            showToast={showToast}
          />
        )}

        {currentTab === 'planilla' && (
          <PlanillaOpsScreen
            players={players}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
            onSendWhatsappCitation={() => {
              showToast('Citación oficial de Fecha 5 enviada al grupo del plantel por WhatsApp', 'chat', 'success');
            }}
            onOpenLineupModal={() => setCurrentTab('nuevo-jugador')}
            showToast={showToast}
          />
        )}

        {currentTab === 'jugador' && (
          <PerfilJugadorScreen
            player={players[0]}
            onUpdateAttendance={handleUpdateAttendance}
            showToast={showToast}
          />
        )}

        {currentTab === 'club' && (
          <ClubProfileScreen
            onOpenAssignRoleModal={() => setIsAssignRoleModalOpen(true)}
            showToast={showToast}
          />
        )}

        {currentTab === 'nuevo-jugador' && (
          <NuevoJugadorWizard
            onCancel={() => setCurrentTab('alertas')}
            onSavePlayer={handleSaveNewPlayer}
            showToast={showToast}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      {currentTab !== 'nuevo-jugador' && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          pendingAlertsCount={3}
          pendingDuesCount={5}
        />
      )}

      {/* Global Interactive Modals */}
      <NewBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        onSend={(audience, msg) => {
          showToast(`Campaña masiva enviada a la audiencia: ${audience}`, 'campaign', 'success');
        }}
      />

      <EditTemplateModal
        isOpen={isEditTemplateModalOpen}
        onClose={() => setIsEditTemplateModalOpen(false)}
        onSave={(newText) => {
          showToast('Plantilla HSM actualizada y sincronizada con Meta', 'check_circle', 'success');
        }}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        player={selectedPlayerForPayment}
        onConfirmPayment={handleConfirmPayment}
      />

      <AssignRoleModal
        isOpen={isAssignRoleModalOpen}
        onClose={() => setIsAssignRoleModalOpen(false)}
        onConfirm={(name, ci, role) => {
          showToast(`Rol de ${role} asignado a ${name} (${ci})`, 'verified_user', 'success');
        }}
      />

      <PlanillaPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        players={players}
      />

      {/* Toast Notification Component */}
      <Toast
        message={toast.message}
        icon={toast.icon}
        type={toast.type}
      />
    </div>
  );
}
