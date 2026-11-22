export type CanvasTheme = 'choco' | 'pastel' | 'y2k';

export type BackdropPattern = 'dots' | 'gingham' | 'stripes' | 'grid' | 'solid' | 'image';

export interface BackgroundConfig {
  pattern: BackdropPattern;
  color: string;
  patternColor: string;
  imageUrl?: string;
  imageFit?: 'cover' | 'repeat';
}

export type ElementFont = 'coquette' | 'kawaii' | 'hand' | 'clean' | 'mono';

export type PhotoFrameStyle = 'plain' | 'polaroid' | 'lace' | 'scallop' | 'tape';

export type TextCardStyle = 'none' | 'paper' | 'lace' | 'choco' | 'pink';

export type StickerKind =
  | 'bow-pink'
  | 'bow-choco'
  | 'heart-lace'
  | 'strawberry'
  | 'bear-charm'
  | 'sparkle-star'
  | 'cherry'
  | 'ribbon-line'
  | 'moon-cloud'
  | 'flower';

export interface BaseCanvasItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface TextCanvasItem extends BaseCanvasItem {
  type: 'text';
  content: string;
  font: ElementFont;
  fontSize: number;
  color: string;
  cardStyle: TextCardStyle;
  align: 'left' | 'center' | 'right';
  italic?: boolean;
  bold?: boolean;
}

export interface ImageCanvasItem extends BaseCanvasItem {
  type: 'image';
  src: string;
  caption: string;
  showCaption: boolean;
  frameStyle: PhotoFrameStyle;
}

export interface StickerCanvasItem extends BaseCanvasItem {
  type: 'sticker';
  sticker: StickerKind;
}

export interface LinkCanvasItem extends BaseCanvasItem {
  type: 'link';
  label: string;
  url: string;
  icon: 'instagram' | 'tiktok' | 'twitter' | 'spotify' | 'mail' | 'heart' | 'star';
}

export interface MusicCanvasItem extends BaseCanvasItem {
  type: 'music';
  trackTitle: string;
  artist: string;
  sourceKind?: 'lofi' | 'audio' | 'embed';
  audioSrc?: string;
  embedUrl?: string;
  coverSrc?: string;
  loop?: boolean;
  volume?: number;
}

export type CanvasItem =
  | TextCanvasItem
  | ImageCanvasItem
  | StickerCanvasItem
  | LinkCanvasItem
  | MusicCanvasItem;

export interface BackgroundMusicConfig {
  enabled: boolean;
  sourceKind: 'audio' | 'youtube';
  src: string;
  title: string;
  volume: number;
}

export interface CanvasDocument {
  theme: CanvasTheme;
  canvasHeight: number;
  bannerTitle: string;
  footerCredit: string;
  outerBg?: BackgroundConfig;
  canvasBg?: BackgroundConfig;
  borderColor?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  bgMusic?: BackgroundMusicConfig;
  items: CanvasItem[];
}
