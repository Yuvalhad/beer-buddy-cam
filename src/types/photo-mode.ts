export type PhotoMode = 'single' | 'burst' | 'gif' | 'boomerang' | 'video';

export interface PhotoModeConfig {
  mode: PhotoMode;
  label: string;
  description: string;
  icon: string;
  count?: number; // For burst mode (1-4)
}

export const PHOTO_MODES: PhotoModeConfig[] = [
  {
    mode: 'single',
    label: 'תמונה בודדת',
    description: 'צלם תמונה אחת',
    icon: '📷',
    count: 1
  },
  {
    mode: 'burst',
    label: 'סדרת תמונות',
    description: '2-4 תמונות ברצף',
    icon: '📸',
    count: 3
  },
  {
    mode: 'gif',
    label: 'GIF',
    description: 'צור GIF מונפש',
    icon: '🎬'
  },
  {
    mode: 'boomerang',
    label: 'בומרנג',
    description: 'וידאו בלופ',
    icon: '🔄'
  },
  {
    mode: 'video',
    label: 'סרטון קסם',
    description: 'צור סרטון עם AI',
    icon: '✨'
  }
];
