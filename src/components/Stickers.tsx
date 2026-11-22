import { StickerKind } from '../types/strawpage';

export const STICKER_CATALOG: Array<{ id: StickerKind; label: string }> = [
  { id: 'bow-pink', label: 'Pink Bow' },
  { id: 'bow-choco', label: 'Choco Bow' },
  { id: 'heart-lace', label: 'Lace Heart' },
  { id: 'strawberry', label: 'Strawberry' },
  { id: 'bear-charm', label: 'Cream Bear' },
  { id: 'sparkle-star', label: 'Star Charm' },
  { id: 'cherry', label: 'Sweet Cherry' },
  { id: 'ribbon-line', label: 'Ribbon Divider' },
  { id: 'moon-cloud', label: 'Cloud Bear' },
  { id: 'flower', label: 'Daisy' },
];

export function StickerGraphic({ kind }: { kind: StickerKind }) {
  switch (kind) {
    case 'bow-pink':
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full drop-shadow-sm" fill="none">
          <path d="M58 40 C42 18, 14 14, 14 38 C14 56, 40 52, 58 40 Z" fill="#F9B8C9" stroke="#6E3B46" strokeWidth="3" />
          <path d="M62 40 C78 18, 106 14, 106 38 C106 56, 80 52, 62 40 Z" fill="#F9B8C9" stroke="#6E3B46" strokeWidth="3" />
          <path d="M54 44 L36 72 L48 68 L58 48" fill="#F49CB4" stroke="#6E3B46" strokeWidth="2.8" strokeLinejoin="round" />
          <path d="M66 44 L84 72 L72 68 L62 48" fill="#F49CB4" stroke="#6E3B46" strokeWidth="2.8" strokeLinejoin="round" />
          <circle cx="60" cy="40" r="9" fill="#FAD2DD" stroke="#6E3B46" strokeWidth="3" />
        </svg>
      );
    case 'bow-choco':
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full drop-shadow-sm" fill="none">
          <path d="M58 40 C40 16, 12 16, 12 38 C12 58, 40 52, 58 40 Z" fill="#6D4337" stroke="#361E18" strokeWidth="3" />
          <path d="M62 40 C80 16, 108 16, 108 38 C108 58, 80 52, 62 40 Z" fill="#6D4337" stroke="#361E18" strokeWidth="3" />
          <path d="M54 44 L34 72 L48 68 L58 48" fill="#563228" stroke="#361E18" strokeWidth="2.8" strokeLinejoin="round" />
          <path d="M66 44 L86 72 L72 68 L62 48" fill="#563228" stroke="#361E18" strokeWidth="2.8" strokeLinejoin="round" />
          <circle cx="60" cy="40" r="9" fill="#F9C6D3" stroke="#361E18" strokeWidth="3" />
        </svg>
      );
    case 'heart-lace':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm" fill="none">
          <path
            d="M50 84 C50 84, 14 60, 14 34 C14 20, 26 12, 38 14 C44 15, 48 20, 50 24 C52 20, 56 15, 62 14 C74 12, 86 20, 86 34 C86 60, 50 84, 50 84 Z"
            fill="#F9C6D3"
            stroke="#59332B"
            strokeWidth="3.5"
          />
          <path
            d="M50 74 C50 74, 24 55, 24 36 C24 27, 31 22, 38 23 C44 24, 48 29, 50 32 C52 29, 56 24, 62 23 C69 22, 76 27, 76 36 C76 55, 50 74, 50 74 Z"
            fill="#FFF7F8"
            stroke="#D98A9E"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
      );
    case 'strawberry':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm" fill="none">
          <path d="M36 28 C24 44, 30 78, 50 86 C70 78, 76 44, 64 28 Z" fill="#FB7185" stroke="#6B2D39" strokeWidth="3" />
          <path d="M36 28 L44 18 L50 26 L56 18 L64 28 L54 34 L50 28 L46 34 Z" fill="#86EFAC" stroke="#365314" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="42" cy="46" r="2" fill="#FFF7D6" />
          <circle cx="56" cy="44" r="2" fill="#FFF7D6" />
          <circle cx="49" cy="58" r="2" fill="#FFF7D6" />
          <circle cx="42" cy="68" r="2" fill="#FFF7D6" />
          <circle cx="57" cy="66" r="2" fill="#FFF7D6" />
        </svg>
      );
    case 'bear-charm':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm" fill="none">
          <circle cx="28" cy="30" r="13" fill="#FFF7EB" stroke="#6D4C41" strokeWidth="3" />
          <circle cx="28" cy="30" r="6" fill="#FBCFE8" />
          <circle cx="72" cy="30" r="13" fill="#FFF7EB" stroke="#6D4C41" strokeWidth="3" />
          <circle cx="72" cy="30" r="6" fill="#FBCFE8" />
          <ellipse cx="50" cy="54" rx="31" ry="26" fill="#FFF7EB" stroke="#6D4C41" strokeWidth="3" />
          <circle cx="38" cy="50" r="3" fill="#4E342E" />
          <circle cx="62" cy="50" r="3" fill="#4E342E" />
          <ellipse cx="31" cy="57" rx="4.5" ry="2.5" fill="#F9A8D4" />
          <ellipse cx="69" cy="57" rx="4.5" ry="2.5" fill="#F9A8D4" />
          <ellipse cx="50" cy="56" rx="7" ry="5" fill="#FCE7F3" />
          <circle cx="50" cy="54" r="2.5" fill="#6D4C41" />
          <path d="M46 60 Q50 64 54 60" stroke="#6D4C41" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'sparkle-star':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm" fill="none">
          <path
            d="M50 10 L60 38 L90 42 L66 60 L74 88 L50 72 L26 88 L34 60 L10 42 L40 38 Z"
            fill="#FDE68A"
            stroke="#92400E"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="43" cy="48" r="2.8" fill="#78350F" />
          <circle cx="57" cy="48" r="2.8" fill="#78350F" />
          <path d="M46 56 Q50 60 54 56" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'cherry':
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm" fill="none">
          <path d="M52 20 Q36 42 32 62 M52 20 Q66 42 68 62" stroke="#4D7C0F" strokeWidth="3" strokeLinecap="round" />
          <path d="M52 20 Q68 12 76 24 Q62 28 52 20 Z" fill="#A3E635" stroke="#3F6212" strokeWidth="2.5" />
          <circle cx="32" cy="68" r="15" fill="#F43F5E" stroke="#881337" strokeWidth="3" />
          <circle cx="68" cy="68" r="15" fill="#F43F5E" stroke="#881337" strokeWidth="3" />
          <circle cx="27" cy="63" r="3.5" fill="#FFE4E6" />
          <circle cx="63" cy="63" r="3.5" fill="#FFE4E6" />
        </svg>
      );
    case 'ribbon-line':
      return (
        <svg viewBox="0 0 240 40" className="h-full w-full" fill="none">
          <line x1="10" y1="20" x2="96" y2="20" stroke="#D98A9E" strokeWidth="3" strokeDasharray="6 4" />
          <line x1="144" y1="20" x2="230" y2="20" stroke="#D98A9E" strokeWidth="3" strokeDasharray="6 4" />
          <path d="M118 20 C106 8, 96 10, 96 20 C96 30, 106 32, 118 20 Z" fill="#F9B8C9" stroke="#6E3B46" strokeWidth="2.2" />
          <path d="M122 20 C134 8, 144 10, 144 20 C144 30, 134 32, 122 20 Z" fill="#F9B8C9" stroke="#6E3B46" strokeWidth="2.2" />
          <circle cx="120" cy="20" r="4.5" fill="#FFF7F8" stroke="#6E3B46" strokeWidth="2.2" />
        </svg>
      );
    case 'moon-cloud':
      return (
        <svg viewBox="0 0 120 80" className="h-full w-full drop-shadow-sm" fill="none">
          <path
            d="M30 60 H92 C102 60, 108 52, 106 43 C104 35, 97 30, 89 31 C85 18, 72 12, 60 15 C48 18, 41 26, 39 34 C28 34, 20 42, 20 51 C20 56, 25 60, 30 60 Z"
            fill="#E0F2FE"
            stroke="#60A5FA"
            strokeWidth="3"
          />
          <circle cx="52" cy="40" r="2.5" fill="#1E3A8A" />
          <circle cx="72" cy="40" r="2.5" fill="#1E3A8A" />
          <path d="M58 46 Q62 50 66 46" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'flower':
    default:
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-sm" fill="none">
          <circle cx="50" cy="24" r="14" fill="#FFFDF7" stroke="#9A6B78" strokeWidth="2.5" />
          <circle cx="74" cy="40" r="14" fill="#FFFDF7" stroke="#9A6B78" strokeWidth="2.5" />
          <circle cx="65" cy="68" r="14" fill="#FFFDF7" stroke="#9A6B78" strokeWidth="2.5" />
          <circle cx="35" cy="68" r="14" fill="#FFFDF7" stroke="#9A6B78" strokeWidth="2.5" />
          <circle cx="26" cy="40" r="14" fill="#FFFDF7" stroke="#9A6B78" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="14" fill="#FDE047" stroke="#A16207" strokeWidth="2.5" />
        </svg>
      );
  }
}
