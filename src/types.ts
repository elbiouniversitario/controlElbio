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
  /** Número de camiseta (null si todavía no tiene). */
  number: number | null;
  firstName: string;
  lastName: string;
  position: string;
  category: string;
  birthYear: number;
  /** YYYY-MM-DD, si se conoce. */
  birthDate?: string;
  /** Cédula de identidad. */
  documento?: string;
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
    /** Fecha del examen (YYYY-MM-DD), si se conoce. */
    examDate?: string;
    /** Foto o PDF en Supabase Storage (bucket "documentos"). */
    filePath?: string;
  };

  // LUD Registration
  ludRegistration: {
    cardInHand: 'En mano del delegado' | 'En poder del jugador' | 'En trámite secretaría';
    federatedId: number;
    category: string;
    signedConsent: boolean;
    /** Vencimiento del carné de la liga (YYYY-MM-DD), si se conoce. */
    cardExpiry?: string;
    /** Foto del carné en Supabase Storage (bucket "documentos"). */
    cardFilePath?: string;
  };

  /** Habilitación forzada por el staff; sin definir = automática según vencimientos. */
  eligibilityOverride?: {
    status: 'habilitado' | 'inhabilitado';
    reason?: string;
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
