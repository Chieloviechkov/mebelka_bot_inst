/**
 * Centralized status constants for the Mebelka admin panel.
 * Maps to Prisma LeadStatus enum values.
 */

export interface StatusConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

// ---------------------------------------------------------------------------
// AI assessment statuses
// ---------------------------------------------------------------------------

export const AI_STATUSES: Record<string, StatusConfig> = {
  Novyi: {
    label: 'Нова заявка',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(148, 163, 184, 0.35)',
  },
  Perspektive: {
    label: 'Перспективний',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.35)',
  },
  NeedsClarification: {
    label: 'Потребує уточнення',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  LowPotential: {
    label: 'Неперспективний',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
  },
};

// ---------------------------------------------------------------------------
// Manager workflow statuses
// ---------------------------------------------------------------------------

export const MANAGER_STATUSES: Record<string, StatusConfig> = {
  VRoboti: {
    label: 'У роботі',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  DomovlenoProZamir: {
    label: 'Домовлено про замір',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    border: 'rgba(6, 182, 212, 0.35)',
  },
  OchikuyePeredoplatu: {
    label: 'Очікує передоплату',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.35)',
  },
  Zakryto: {
    label: 'Закрито (Угода)',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(34, 197, 94, 0.35)',
  },
  Vidhyleno: {
    label: 'Відхилено',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
  },
};

// ---------------------------------------------------------------------------
// Merged map of all statuses
// ---------------------------------------------------------------------------

export const ALL_STATUSES: Record<string, StatusConfig> = {
  ...AI_STATUSES,
  ...MANAGER_STATUSES,
};

// ---------------------------------------------------------------------------
// SelectInput choice arrays ({ id, name } with emoji prefixes)
// ---------------------------------------------------------------------------

export const AI_STATUS_CHOICES = [
  { id: 'Novyi', name: '\u2b50 Нова заявка' },
  { id: 'Perspektive', name: '\u2705 Перспективний' },
  { id: 'NeedsClarification', name: '\u2753 Потребує уточнення' },
  { id: 'LowPotential', name: '\u274c Неперспективний' },
];

export const MANAGER_STATUS_CHOICES = [
  { id: 'VRoboti', name: '\ud83d\udee0\ufe0f У роботі' },
  { id: 'DomovlenoProZamir', name: '\ud83d\udccf Домовлено про замір' },
  { id: 'OchikuyePeredoplatu', name: '\ud83d\udcb0 Очікує передоплату' },
  { id: 'Zakryto', name: '\u2705 Закрито (Угода)' },
  { id: 'Vidhyleno', name: '\u26d4 Відхилено' },
];

export const ALL_STATUS_CHOICES = [
  ...AI_STATUS_CHOICES,
  ...MANAGER_STATUS_CHOICES,
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

const FALLBACK_CONFIG: StatusConfig = {
  label: 'Невідомий',
  color: '#94a3b8',
  bg: 'rgba(148, 163, 184, 0.12)',
  border: 'rgba(148, 163, 184, 0.35)',
};

/** Return { label, color, bg, border } for any LeadStatus value. */
export function getStatusConfig(status: string): StatusConfig {
  return ALL_STATUSES[status] ?? FALLBACK_CONFIG;
}
