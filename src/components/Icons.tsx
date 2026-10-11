import type React from 'react';

// Set di icone a linee monocrome (nessuna emoji).
// Ogni icona eredita il colore dal testo (stroke "currentColor"): è bianca quando il
// contenitore ha colore bianco, assume il colore del contesto sulle card chiare.
// Passare `color` per forzare un colore specifico.

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

const base = (size: number, style?: React.CSSProperties): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  style,
});

type I = (p: IconProps) => React.ReactElement;

/** Presenze — operatore (matita). */
export const IconPencil: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

/** Presenze — amministrazione in sola lettura (occhio). */
export const IconEye: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Riepilogo (grafico a barre). */
export const IconChart: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M3 3v18h18" />
    <rect x="7" y="11" width="3" height="6" />
    <rect x="12.5" y="7" width="3" height="10" />
    <rect x="18" y="13" width="3" height="4" />
  </svg>
);

/** Estrazioni / download. */
export const IconDownload: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
);

/** Amministrazione (ingranaggio). */
export const IconGear: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
  </svg>
);

/** Operatore (persona). */
export const IconPerson: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a7 7 0 0 1 16 0v1" />
  </svg>
);

/** Utenza (bambino). */
export const IconChild: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <circle cx="12" cy="7" r="3.2" />
    <path d="M7 21v-3a5 5 0 0 1 10 0v3" />
    <path d="M9.5 13.5 12 16l2.5-2.5" />
  </svg>
);

/** Registro ore (calendario). */
export const IconCalendar: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
);

/** Ore per nominativo (documento con righe). */
export const IconReceipt: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M6 2.5h9l4 4V21a0.5 0.5 0 0 1-.5.5h-12A0.5 0.5 0 0 1 6 21Z" />
    <path d="M14 2.5V7h4.5M9 12h7M9 16h7" />
  </svg>
);

/** Report per la famiglia (due persone). */
export const IconFamily: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <circle cx="8" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.3" />
    <path d="M2.5 20v-1a5.5 5.5 0 0 1 11 0v1" />
    <path d="M15 20v-1a4 4 0 0 1 6.5-3.1" />
  </svg>
);

/** Modifica (matita piena, per le righe di elenco). */
export const IconEdit: I = ({ size = 16, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17Z" />
    <path d="M14 7l3 3" />
  </svg>
);

/** Elimina (cestino). */
export const IconTrash: I = ({ size = 16, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);

/** Rendi contemporanea (unione / due frecce). */
export const IconLink: I = ({ size = 16, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
);

/** Separa (freccia che si dirama). */
export const IconSplit: I = ({ size = 16, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M3 12h6M9 12l4-5h8M9 12l4 5h8M18 4l3 3-3 3M18 14l3 3-3 3" />
  </svg>
);

/** Nota / annotazione. */
export const IconNote: I = ({ size = 14, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M4 4h16v12l-4 4H4Z" />
    <path d="M16 20v-4h4M8 9h8M8 13h4" />
  </svg>
);

/** Orario (orologio). */
export const IconClock: I = ({ size = 14, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

/** Copertura / ore extra (freccia circolare). */
export const IconCover: I = ({ size = 14, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M20 12a8 8 0 1 1-2.3-5.6" />
    <path d="M20 3v4h-4" />
  </svg>
);

/** Chiudi (X). */
export const IconClose: I = ({ size = 18, color = 'currentColor', strokeWidth = 2, style }) => (
  <svg {...base(size, style)} stroke={color} strokeWidth={strokeWidth}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
