export type TabType = 
  | 'alertas'
  | 'tesoreria'
  | 'planilla'
  | 'jugador'
  | 'club'
  | 'nuevo-jugador';

export type DuesStatus = 'paid' | 'pending' | 'overdue';

export interface Player {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  position: string;
  category: string;
  birthYear: number;
  avatarUrl: string;
  phone: string;
  email: string;
  address: string;
  isCaptain?: boolean;
  
  // Emergency Contact
  emergencyContact: {
    name: string;
    phone: string;
    relation: 'Padre/Madre' | 'Pareja' | 'Hermano/a' | 'Otro';
  };

  // Health Coverage
  healthProvider: string;
  mobileEmergency: 'SEMM' | 'UCM Falck' | 'SUAT' | 'Otra / Interior';
  memberNumber?: string;

  // Medical Certificate
  medicalCertificate: {
    expiryDate: string; // YYYY-MM-DD
    daysRemaining: number;
    clinic: string;
    fileName?: string;
    fileSize?: string;
    verified: boolean;
    notes?: string;
  };

  // LUD Registration
  ludRegistration: {
    cardInHand: 'En mano del delegado' | 'En poder del jugador' | 'En trámite secretaría';
    federatedId: number;
    category: string;
    signedConsent: boolean;
  };

  // Match Lineup Status
  matchStatus: {
    lineupRole: 'TITULAR' | 'SUPLENTE' | 'BAJA' | 'RESERVA';
    attendanceConfirmed?: boolean;
    declineReason?: string;
  };

  // Treasury: estado de la cuota del último mes generado y deuda acumulada
  dues: {
    period: string; // YYYY-MM
    status: DuesStatus;
    debtAmount: number;
    paymentMethod?: string;
    receiptNumber?: string;
    paidDate?: string;
  };
}

export interface AutomationRule {
  id: string;
  title: string;
  categoryTag: string;
  tagClass?: string;
  description: string;
  active: boolean;
  icon: string;
  iconBgClass: string;
  iconColorClass: string;
}

export interface SentMessage {
  id: string;
  playerName: string;
  playerAvatar: string;
  topic: string;
  timestamp: string;
  status: 'Entregado' | 'Leído' | 'Enviado';
  statusColor: string;
  avatarIndicatorColor: string;
}

export interface ClubRole {
  id: string;
  title: string;
  subtitle: string;
  activeCount: number;
  description: string;
  badgeLabel: string;
  icon: string;
  iconBg: string;
}
