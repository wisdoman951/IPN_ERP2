export type ViewerRole = 'admin' | 'basic' | 'therapist';

export const VIEWER_ROLE_LABELS: Record<ViewerRole, string> = {
  admin: '總部',
  basic: '分店店長',
  therapist: '療癒師',
};

export const VIEWER_ROLE_OPTIONS: { value: ViewerRole; label: string }[] = [
  { value: 'admin', label: VIEWER_ROLE_LABELS.admin },
  { value: 'basic', label: VIEWER_ROLE_LABELS.basic },
  { value: 'therapist', label: VIEWER_ROLE_LABELS.therapist },
];
