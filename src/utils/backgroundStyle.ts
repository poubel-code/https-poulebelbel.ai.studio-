import { BackgroundConfig, CanvasTheme } from '../types/strawpage';

export function getDefaultOuterBg(theme: CanvasTheme): BackgroundConfig {
  if (theme === 'pastel') {
    return {
      pattern: 'gingham',
      color: '#FDF4F5',
      patternColor: '#F4C2CE',
      imageFit: 'cover',
    };
  }
  if (theme === 'y2k') {
    return {
      pattern: 'stripes',
      color: '#FFE3F1',
      patternColor: '#E5F4FF',
      imageFit: 'cover',
    };
  }
  return {
    pattern: 'dots',
    color: '#F9DCE4',
    patternColor: '#4A2C24',
    imageFit: 'cover',
  };
}

export function getDefaultCanvasBg(theme: CanvasTheme): BackgroundConfig {
  if (theme === 'pastel') {
    return {
      pattern: 'dots',
      color: '#FFFBF4',
      patternColor: '#D6B8B0',
      imageFit: 'cover',
    };
  }
  if (theme === 'y2k') {
    return {
      pattern: 'stripes',
      color: '#FFFFFF',
      patternColor: '#E3F0FF',
      imageFit: 'cover',
    };
  }
  return {
    pattern: 'dots',
    color: '#FFF8F5',
    patternColor: '#D8B8B0',
    imageFit: 'cover',
  };
}

export function getDefaultBorderColor(theme: CanvasTheme): string {
  if (theme === 'pastel') return '#6D4C41';
  if (theme === 'y2k') return '#F49AC1';
  return '#4A2C24';
}

export function buildBackgroundStyle(
  bg: BackgroundConfig,
  variant: 'outer' | 'canvas'
): React.CSSProperties {
  if (bg.pattern === 'image' && bg.imageUrl) {
    const isRepeat = bg.imageFit === 'repeat';
    return {
      backgroundColor: bg.color,
      backgroundImage: `url("${bg.imageUrl}")`,
      backgroundSize: isRepeat ? '240px auto' : 'cover',
      backgroundRepeat: isRepeat ? 'repeat' : 'no-repeat',
      backgroundPosition: 'center center',
    };
  }

  if (bg.pattern === 'solid') {
    return {
      backgroundColor: bg.color,
      backgroundImage: 'none',
    };
  }

  if (bg.pattern === 'dots') {
    const dotSize = variant === 'outer' ? '3.5px' : '1.4px';
    const gap = variant === 'outer' ? '38px 38px' : '20px 20px';
    return {
      backgroundColor: bg.color,
      backgroundImage: `radial-gradient(${bg.patternColor} ${dotSize}, transparent ${dotSize})`,
      backgroundSize: gap,
    };
  }

  if (bg.pattern === 'gingham') {
    const size = variant === 'outer' ? '36px 36px' : '24px 24px';
    return {
      backgroundColor: bg.color,
      backgroundImage: `linear-gradient(90deg, ${bg.patternColor}44 50%, transparent 50%), linear-gradient(${bg.patternColor}44 50%, transparent 50%)`,
      backgroundSize: size,
    };
  }

  if (bg.pattern === 'grid') {
    const size = variant === 'outer' ? '32px 32px' : '24px 24px';
    return {
      backgroundColor: bg.color,
      backgroundImage: `linear-gradient(to right, ${bg.patternColor}45 1px, transparent 1px), linear-gradient(to bottom, ${bg.patternColor}45 1px, transparent 1px)`,
      backgroundSize: size,
    };
  }

  // 'stripes'
  return {
    backgroundColor: bg.color,
    backgroundImage: `repeating-linear-gradient(-45deg, ${bg.color}, ${bg.color} 18px, ${bg.patternColor} 18px, ${bg.patternColor} 36px)`,
  };
}
