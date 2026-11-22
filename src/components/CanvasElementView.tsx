import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  FastForward,
  Heart,
  Instagram,
  Mail,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Rewind,
  RotateCw,
  Shuffle,
  Sparkles,
  Twitter,
} from 'lucide-react';
import { CanvasItem, CanvasTheme, ElementFont, TextCardStyle } from '../types/strawpage';
import { normalizeLinkUrl } from '../utils/linkUrl';
import { lofiAudio } from '../utils/lofiAudio';
import {
  extractYouTubeVideoId,
  loadYouTubeIframeApi,
  YTPlayerInstance,
} from '../utils/youtubePlayer';
import { StickerGraphic } from './Stickers';

interface CanvasElementViewProps {
  item: CanvasItem;
  theme: CanvasTheme;
  scale?: number;
  isEditMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onInteractionStart?: () => void;
  onUpdate: (patch: Partial<CanvasItem>) => void;
}

function getFontClass(font: ElementFont): string {
  switch (font) {
    case 'coquette':
      return 'font-coquette';
    case 'kawaii':
      return 'font-kawaii';
    case 'hand':
      return 'font-hand';
    case 'mono':
      return 'font-mono-tabular';
    case 'clean':
    default:
      return 'font-clean';
  }
}

function getTextCardClass(cardStyle: TextCardStyle): string {
  switch (cardStyle) {
    case 'paper':
      return 'bg-[#FFFDF9] border-2 border-[#D7C3B8] shadow-sm rounded-xl p-3.5';
    case 'lace':
      return 'bg-[#FFF9FA] border-2 border-dashed border-[#D98A9E] shadow-sm rounded-2xl p-3.5';
    case 'choco':
      return 'bg-[#4A2C24] border-2 border-[#2D1812] text-[#FFF8F5] shadow-sm rounded-xl p-3.5';
    case 'pink':
      return 'bg-[#FFEFF4] border-2 border-[#F3B8C8] shadow-sm rounded-2xl p-3.5';
    case 'none':
    default:
      return 'p-1';
  }
}

function renderLinkIcon(icon: string) {
  switch (icon) {
    case 'instagram':
      return <Instagram className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case 'twitter':
      return <Twitter className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case 'spotify':
      return <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case 'mail':
      return <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case 'star':
      return <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case 'tiktok':
      return <Music2 className="h-4 w-4 shrink-0" aria-hidden="true" />;
    case 'heart':
    default:
      return <Heart className="h-4 w-4 shrink-0" aria-hidden="true" />;
  }
}

export function CanvasElementView({
  item,
  theme,
  scale = 1,
  isEditMode,
  isSelected,
  onSelect,
  onInteractionStart,
  onUpdate,
}: CanvasElementViewProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const volFlashTimerRef = useRef<number | null>(null);
  const ytWrapperRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const ytReadyRef = useRef(false);
  const ytPendingPlayRef = useRef(false);
  const [isEditingText, setIsEditingText] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);
  const [localVolume, setLocalVolume] = useState(
    item.type === 'music' && typeof item.volume === 'number' ? item.volume : 0.7
  );
  const [showVolumeHud, setShowVolumeHud] = useState(false);

  const isPlayingMusicRef = useRef(false);
  isPlayingMusicRef.current = isPlayingMusic;
  const localVolumeRef = useRef(localVolume);
  localVolumeRef.current = localVolume;
  const isLoopingRef = useRef(item.type === 'music' ? item.loop !== false : true);
  isLoopingRef.current = item.type === 'music' ? item.loop !== false : true;

  const isCustomAudio =
    item.type === 'music' && item.sourceKind === 'audio' && Boolean(item.audioSrc);
  const youtubeId =
    item.type === 'music' && item.sourceKind === 'embed'
      ? extractYouTubeVideoId(item.embedUrl)
      : null;
  const isExternalIframe =
    item.type === 'music' &&
    item.sourceKind === 'embed' &&
    Boolean(item.embedUrl) &&
    !youtubeId;

  useEffect(() => {
    setImgFailed(false);
  }, [item.type === 'image' ? item.src : '']);

  useEffect(() => {
    if (item.type === 'music' && typeof item.volume === 'number') {
      setLocalVolume(item.volume);
    }
  }, [item.type === 'music' ? item.volume : undefined]);

  useEffect(() => {
    if (item.type !== 'music') return;
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, localVolume));
    }
    if (ytReadyRef.current && ytPlayerRef.current) {
      try {
        ytPlayerRef.current.setVolume(
          Math.round(Math.max(0, Math.min(1, localVolume)) * 100)
        );
      } catch {
        // Ignore transient YT volume error
      }
    }
    if (isPlayingMusic && !isCustomAudio && !youtubeId && !isExternalIframe) {
      lofiAudio.setVolume(localVolume);
    }
  }, [localVolume, item.type, isPlayingMusic, isCustomAudio, youtubeId, isExternalIframe]);

  // Mount / destroy hidden YouTube player when a YouTube link is used
  useEffect(() => {
    if (!youtubeId || !ytWrapperRef.current) return;
    let cancelled = false;
    ytReadyRef.current = false;
    ytPendingPlayRef.current = false;

    const host = ytWrapperRef.current;
    host.innerHTML = '';
    const mountNode = document.createElement('div');
    host.appendChild(mountNode);

    void loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !host.isConnected) return;
        const player = new YT.Player(mountNode, {
          videoId: youtubeId,
          width: 10,
          height: 10,
          playerVars: {
            autoplay: 0,
            controls: 0,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (ev) => {
              if (cancelled) return;
              ytReadyRef.current = true;
              ev.target.setVolume(
                Math.round(Math.max(0, Math.min(1, localVolumeRef.current)) * 100)
              );
              const dur = ev.target.getDuration();
              if (Number.isFinite(dur) && dur > 0) setAudioDuration(dur);
              if (ytPendingPlayRef.current) {
                ytPendingPlayRef.current = false;
                ev.target.playVideo();
              }
            },
            onStateChange: (ev) => {
              if (cancelled) return;
              const dur = ev.target.getDuration();
              if (Number.isFinite(dur) && dur > 0) setAudioDuration(dur);
              if (ev.data === YT.PlayerState.PLAYING) {
                setAudioError(false);
                setIsPlayingMusic(true);
              } else if (ev.data === YT.PlayerState.PAUSED) {
                setIsPlayingMusic(false);
              } else if (ev.data === YT.PlayerState.ENDED) {
                if (isLoopingRef.current) {
                  ev.target.seekTo(0, true);
                  ev.target.playVideo();
                } else {
                  setIsPlayingMusic(false);
                }
              }
            },
            onError: () => {
              if (!cancelled) {
                setAudioError(true);
                setIsPlayingMusic(false);
              }
            },
          },
        });
        ytPlayerRef.current = player;
      })
      .catch(() => {
        if (!cancelled) setAudioError(true);
      });

    return () => {
      cancelled = true;
      ytReadyRef.current = false;
      ytPendingPlayRef.current = false;
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // Ignore YT destroy errors
        }
        ytPlayerRef.current = null;
      }
      host.innerHTML = '';
    };
  }, [youtubeId]);

  // Poll YouTube current time & duration while playing
  useEffect(() => {
    if (!youtubeId || !isPlayingMusic) return;
    const timer = window.setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p || !ytReadyRef.current) return;
      try {
        const cur = p.getCurrentTime();
        const dur = p.getDuration();
        if (Number.isFinite(cur)) setAudioProgress(cur);
        if (Number.isFinite(dur) && dur > 0) setAudioDuration(dur);
      } catch {
        // Ignore transient YT state
      }
    }, 300);
    return () => window.clearInterval(timer);
  }, [youtubeId, isPlayingMusic]);

  // Simulated timer for built-in lo-fi preview so scrubber & timestamp move smoothly
  useEffect(() => {
    if (
      item.type !== 'music' ||
      !isPlayingMusic ||
      isCustomAudio ||
      Boolean(youtubeId) ||
      isExternalIframe
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setAudioProgress((prev) => (prev + 1 >= 120 ? 0 : prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [item.type, isPlayingMusic, isCustomAudio, youtubeId, isExternalIframe]);

  useEffect(() => {
    setIsPlayingMusic(false);
    setAudioProgress(0);
    setAudioDuration(0);
    setAudioError(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [
    item.type === 'music' ? item.audioSrc : '',
    item.type === 'music' ? item.embedUrl : '',
    item.type === 'music' ? item.sourceKind : '',
  ]);

  useEffect(() => {
    if (!isSelected) {
      setIsEditingText(false);
    }
  }, [isSelected]);

  // Cleanup ONLY when the element unmounts (never on isPlayingMusic changes!)
  useEffect(() => {
    return () => {
      if (volFlashTimerRef.current !== null) {
        window.clearTimeout(volFlashTimerRef.current);
      }
      if (isPlayingMusicRef.current) {
        lofiAudio.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // Ignore YT destroy errors
        }
        ytPlayerRef.current = null;
      }
    };
  }, []);

  // Drag to move item freely across the canvas
  const handleStartDrag = (e: React.PointerEvent) => {
    if (!isEditMode || isEditingText) return;
    e.stopPropagation();
    onSelect();
    onInteractionStart?.();

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = item.x;
    const origY = item.y;

    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      onUpdate({
        x: Math.round(origX + dx),
        y: Math.round(origY + dy),
      });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  // Resize from any corner handle
  const handleStartResize = (
    e: React.PointerEvent,
    corner: 'nw' | 'ne' | 'sw' | 'se'
  ) => {
    if (!isEditMode) return;
    e.stopPropagation();
    e.preventDefault();
    onInteractionStart?.();

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = item.x;
    const origY = item.y;
    const origW = item.width;
    const origH = item.height;

    const handleMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;

      let nextX = origX;
      let nextY = origY;
      let nextW = origW;
      let nextH = origH;

      const minW = item.type === 'link' ? 120 : 48;
      const minH = item.type === 'link' ? 38 : 36;

      if (corner.includes('e')) {
        nextW = Math.max(minW, origW + dx);
      }
      if (corner.includes('s')) {
        nextH = Math.max(minH, origH + dy);
      }
      if (corner.includes('w')) {
        const proposedW = Math.max(minW, origW - dx);
        nextX = origX + (origW - proposedW);
        nextW = proposedW;
      }
      if (corner.includes('n')) {
        const proposedH = Math.max(minH, origH - dy);
        nextY = origY + (origH - proposedH);
        nextH = proposedH;
      }

      onUpdate({
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextW),
        height: Math.round(nextH),
      });
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  // Smooth freeform rotation handle
  const handleStartRotate = (e: React.PointerEvent) => {
    if (!isEditMode || !boxRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    onInteractionStart?.();
    setIsRotating(true);

    const rect = boxRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleMove = (ev: PointerEvent) => {
      const angleRad = Math.atan2(ev.clientY - centerY, ev.clientX - centerX);
      let angleDeg = Math.round((angleRad * 180) / Math.PI + 90);
      if (angleDeg > 180) angleDeg -= 360;
      if (angleDeg < -180) angleDeg += 360;
      // Snap gently to 0 when within 3 degrees
      if (Math.abs(angleDeg) <= 3) angleDeg = 0;
      onUpdate({ rotation: angleDeg });
    };

    const handleUp = () => {
      setIsRotating(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const renderContent = () => {
    if (item.type === 'text') {
      const textColor = item.cardStyle === 'choco' ? '#FFF8F5' : item.color;
      return (
        <div
          onDoubleClick={(e) => {
            if (!isEditMode) return;
            e.stopPropagation();
            onInteractionStart?.();
            setIsEditingText(true);
          }}
          className={`h-full w-full overflow-hidden ${getTextCardClass(item.cardStyle)}`}
        >
          {isEditingText && isEditMode ? (
            <textarea
              autoFocus
              value={item.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              onBlur={() => setIsEditingText(false)}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                fontSize: `${item.fontSize}px`,
                color: textColor,
                textAlign: item.align,
              }}
              className={`h-full w-full resize-none bg-transparent outline-none leading-snug ${getFontClass(
                item.font
              )} ${item.italic ? 'italic' : ''} ${item.bold ? 'font-bold' : ''}`}
            />
          ) : (
            <div
              style={{
                fontSize: `${item.fontSize}px`,
                color: textColor,
                textAlign: item.align,
              }}
              className={`h-full w-full whitespace-pre-wrap break-words leading-snug ${getFontClass(
                item.font
              )} ${item.italic ? 'italic' : ''} ${item.bold ? 'font-bold' : ''}`}
            >
              {item.content}
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'image') {
      if (item.frameStyle === 'plain') {
        return !imgFailed && item.src ? (
          <img
            src={item.src}
            alt={item.caption || 'Uploaded photo'}
            referrerPolicy="no-referrer"
            draggable={false}
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain select-none"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#D98A9E]/75 bg-[#FFF9FB]/90 p-2 text-center text-[#8B6B63]">
            <Camera className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11px] font-medium leading-tight">
              {isEditMode ? 'Click to add photo' : 'Photo'}
            </span>
          </div>
        );
      }

      const frameClasses: Record<string, string> = {
        polaroid:
          'bg-white p-2.5 pb-4 border border-[#D8C5BC] rounded-lg shadow-md flex flex-col',
        lace: 'bg-[#FFF8F9] p-2.5 border-2 border-dashed border-[#D88B9E] rounded-2xl shadow-sm flex flex-col',
        scallop:
          'bg-white p-2 border-4 border-[#F8C8D4] rounded-3xl shadow-md flex flex-col',
        tape: 'bg-[#FFFDF8] p-2 border border-[#E5D7C6] rounded-md shadow-sm flex flex-col relative',
      };

      return (
        <div className={`h-full w-full ${frameClasses[item.frameStyle] || frameClasses.polaroid}`}>
          {item.frameStyle === 'tape' && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 -rotate-2 border border-[#D9B89C]/60 bg-[#FDE6D2]/85"
            />
          )}
          <div className="min-h-0 flex-1 overflow-hidden rounded-md bg-[#F7ECEE]">
            {!imgFailed && item.src ? (
              <img
                src={item.src}
                alt={item.caption || 'Uploaded photo'}
                referrerPolicy="no-referrer"
                draggable={false}
                onError={() => setImgFailed(true)}
                className="h-full w-full object-cover select-none"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-3 text-center text-[#8B6B63]">
                <Camera className="h-6 w-6" aria-hidden="true" />
                <span className="text-xs">Photo</span>
              </div>
            )}
          </div>
          {item.showCaption && (
            <div className="font-hand mt-1.5 truncate text-center text-lg leading-none text-[#5A382E]">
              {item.caption}
            </div>
          )}
        </div>
      );
    }

    if (item.type === 'sticker') {
      return (
        <div className="h-full w-full select-none pointer-events-none">
          <StickerGraphic kind={item.sticker} />
        </div>
      );
    }

    if (item.type === 'link') {
      const safeHref = normalizeLinkUrl(item.url);
      const isMailOrTel = /^(mailto:|tel:)/i.test(safeHref);
      const linkThemeClass =
        theme === 'choco'
          ? 'bg-[#4A2C24] text-[#FFF8F5] border-2 border-[#D99BB0] hover:bg-[#5E3A30]'
          : theme === 'y2k'
            ? 'bg-gradient-to-r from-[#FF9EC7] to-[#FFB8D9] text-white border-2 border-white shadow-sm hover:brightness-105'
            : 'bg-[#FFF5F7] text-[#6D4C41] border-2 border-[#E9B7C4] hover:bg-[#FFE9EF]';

      if (isEditMode) {
        return (
          <div
            className={`flex h-full w-full items-center justify-center gap-2 rounded-xl px-4 shadow-sm ${linkThemeClass}`}
          >
            {renderLinkIcon(item.icon)}
            <span className="font-kawaii text-sm font-semibold truncate">{item.label}</span>
          </div>
        );
      }

      return (
        <a
          href={safeHref || undefined}
          target={!safeHref || isMailOrTel ? undefined : '_blank'}
          rel={!safeHref || isMailOrTel ? undefined : 'noopener noreferrer'}
          onClick={(e) => {
            if (!safeHref) {
              e.preventDefault();
            }
          }}
          className={`flex h-full w-full items-center justify-center gap-2 rounded-xl px-4 shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer ${linkThemeClass}`}
        >
          {renderLinkIcon(item.icon)}
          <span className="font-kawaii text-sm font-semibold truncate">{item.label}</span>
        </a>
      );
    }

    // Spotify / SoundCloud embed player wrapped in matching silver capsule frame
    if (isExternalIframe && item.embedUrl) {
      return (
        <div
          style={{
            background: 'linear-gradient(180deg, #F5F6F8 0%, #E3E6EC 52%, #CFD4DC 100%)',
            boxShadow:
              '0 8px 20px rgba(74, 44, 36, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.92)',
          }}
          className="h-full w-full overflow-hidden rounded-3xl border border-[#B7BCC5] p-2"
        >
          <iframe
            src={item.embedUrl}
            title={item.trackTitle || 'Embedded music player'}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className={`h-full w-full rounded-2xl border-0 bg-white ${
              isEditMode ? 'pointer-events-none' : 'pointer-events-auto'
            }`}
          />
        </div>
      );
    }

    // Silver Capsule MP3 Player (matches reference image)
    const effectiveDuration =
      isCustomAudio || youtubeId ? audioDuration : 120;
    const progressPercent =
      effectiveDuration > 0
        ? Math.max(0, Math.min(100, (audioProgress / effectiveDuration) * 100))
        : 0;

    const formatSec = (sec: number) => {
      if (!Number.isFinite(sec) || sec < 0) return '0:00';
      const mins = Math.floor(sec / 60);
      const rem = Math.floor(sec % 60);
      return `${mins}:${rem.toString().padStart(2, '0')}`;
    };

    const triggerVolumeHud = (nextVol: number) => {
      const clamped = Math.round(Math.max(0, Math.min(1, nextVol)) * 10) / 10;
      setLocalVolume(clamped);
      if (isEditMode) {
        onUpdate({ volume: clamped });
      }
      setShowVolumeHud(true);
      if (volFlashTimerRef.current !== null) {
        window.clearTimeout(volFlashTimerRef.current);
      }
      volFlashTimerRef.current = window.setTimeout(() => {
        setShowVolumeHud(false);
      }, 1200);
    };

    const seekByDelta = (deltaSec: number) => {
      const maxDur = effectiveDuration > 0 ? effectiveDuration : 120;
      const nextTime = Math.max(0, Math.min(maxDur, audioProgress + deltaSec));
      setAudioProgress(nextTime);
      if (isCustomAudio && audioRef.current) {
        audioRef.current.currentTime = nextTime;
      } else if (youtubeId && ytReadyRef.current && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(nextTime, true);
      }
    };

    const seekAtClientX = (clientX: number) => {
      const el = scrubberRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const maxDur = effectiveDuration > 0 ? effectiveDuration : 120;
      const nextTime = ratio * maxDur;
      setAudioProgress(nextTime);
      if (isCustomAudio && audioRef.current) {
        audioRef.current.currentTime = nextTime;
      } else if (youtubeId && ytReadyRef.current && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(nextTime, true);
      }
    };

    const handleScrubberPointerDown = (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      seekAtClientX(e.clientX);

      const handleMove = (ev: PointerEvent) => {
        seekAtClientX(ev.clientX);
      };
      const handleUp = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    };

    const toggleAudio = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isCustomAudio && audioRef.current) {
        if (isPlayingMusic) {
          audioRef.current.pause();
          setIsPlayingMusic(false);
        } else {
          lofiAudio.stop();
          audioRef.current.volume = Math.max(0, Math.min(1, localVolume));
          try {
            setAudioError(false);
            await audioRef.current.play();
            setIsPlayingMusic(true);
          } catch {
            setAudioError(true);
            setIsPlayingMusic(false);
          }
        }
        return;
      }

      if (youtubeId) {
        if (isPlayingMusic) {
          ytPendingPlayRef.current = false;
          if (ytReadyRef.current && ytPlayerRef.current) {
            ytPlayerRef.current.pauseVideo();
          }
          setIsPlayingMusic(false);
        } else {
          lofiAudio.stop();
          setAudioError(false);
          if (ytReadyRef.current && ytPlayerRef.current) {
            ytPlayerRef.current.setVolume(
              Math.round(Math.max(0, Math.min(1, localVolume)) * 100)
            );
            ytPlayerRef.current.playVideo();
            setIsPlayingMusic(true);
          } else {
            ytPendingPlayRef.current = true;
            setIsPlayingMusic(true);
          }
        }
        return;
      }

      if (isPlayingMusic) {
        lofiAudio.stop();
        setIsPlayingMusic(false);
      } else {
        lofiAudio.setVolume(localVolume);
        setIsPlayingMusic(true);
        await lofiAudio.start('warm', 74);
      }
    };

    const isLooping = item.loop !== false;

    return (
      <div
        onClick={(e) => {
          if (!isEditMode) {
            void toggleAudio(e);
          }
        }}
        style={{
          background: 'linear-gradient(180deg, #F5F6F8 0%, #E3E6EC 52%, #CFD4DC 100%)',
          boxShadow:
            '0 8px 20px rgba(74, 44, 36, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.92)',
        }}
        className={`flex h-full w-full items-center gap-2.5 rounded-full border border-[#B7BCC5] p-2 ${
          !isEditMode ? 'cursor-pointer' : ''
        }`}
      >
        {youtubeId && (
          <div
            ref={ytWrapperRef}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0"
          />
        )}

        {isCustomAudio && item.audioSrc && (
          <audio
            ref={audioRef}
            src={item.audioSrc}
            loop={isLooping}
            preload="auto"
            onLoadedMetadata={(e) => {
              const dur = e.currentTarget.duration;
              if (Number.isFinite(dur)) setAudioDuration(dur);
              e.currentTarget.volume = Math.max(0, Math.min(1, localVolume));
            }}
            onPlay={() => setIsPlayingMusic(true)}
            onPause={() => {
              if (!audioRef.current?.ended || !isLooping) {
                setIsPlayingMusic(false);
              }
            }}
            onTimeUpdate={(e) => setAudioProgress(e.currentTarget.currentTime)}
            onEnded={() => {
              if (!isLooping) setIsPlayingMusic(false);
            }}
            onError={() => {
              setAudioError(true);
              setIsPlayingMusic(false);
            }}
          />
        )}

        {/* Left Circular Click-Wheel */}
        <div
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F2F4F7 100%)',
            boxShadow:
              '0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.9)',
          }}
          className="relative aspect-square h-full shrink-0 rounded-full border border-[#CFD4DC]"
        >
          {/* Volume Up (+) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerVolumeHud(localVolume + 0.1);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Volume up"
            title="Volume up"
            className="absolute left-1/2 top-1 -translate-x-1/2 rounded-full p-1 text-[#9AA0A8] transition-colors hover:text-[#4B4E54] cursor-pointer"
          >
            <Plus className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
          </button>

          {/* Volume Down (-) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerVolumeHud(localVolume - 0.1);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Volume down"
            title="Volume down"
            className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full p-1 text-[#9AA0A8] transition-colors hover:text-[#4B4E54] cursor-pointer"
          >
            <Minus className="h-3 w-3 stroke-[2.5]" aria-hidden="true" />
          </button>

          {/* Rewind (-10s) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              seekByDelta(-10);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Rewind 10 seconds"
            title="Rewind 10s"
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#A3A8B0] transition-colors hover:text-[#4B4E54] cursor-pointer"
          >
            <Rewind className="h-3 w-3 fill-current" aria-hidden="true" />
          </button>

          {/* Fast Forward (+10s) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              seekByDelta(10);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Forward 10 seconds"
            title="Forward 10s"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#A3A8B0] transition-colors hover:text-[#4B4E54] cursor-pointer"
          >
            <FastForward className="h-3 w-3 fill-current" aria-hidden="true" />
          </button>

          {/* Center Play/Pause Disc Button */}
          <button
            type="button"
            onClick={toggleAudio}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={isPlayingMusic ? 'Pause music' : 'Play music'}
            style={{
              background: 'linear-gradient(180deg, #F5F6F8 0%, #ECEEF2 100%)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), 0 1px 2px rgba(0,0,0,0.08)',
            }}
            className="absolute left-1/2 top-1/2 flex h-[40%] w-[40%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D4D8DF] text-[#9EA3AB] transition-colors hover:text-[#4B4E54] cursor-pointer"
          >
            {isPlayingMusic ? (
              <Pause className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current ml-0.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Right Oval Pink-Lavender LCD Screen */}
        <div
          style={{
            background: 'linear-gradient(180deg, #FDF8FC 0%, #F7ECF5 52%, #F1DFEC 100%)',
            boxShadow:
              'inset 0 2px 6px rgba(108, 86, 102, 0.12), inset 0 -1px 2px rgba(255, 255, 255, 0.8)',
          }}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-between rounded-full border border-[#C6CAD2] px-5 py-2.5"
        >
          {/* Song Title or Temporary Volume Feedback */}
          <div className="w-full truncate text-center text-[13px] font-medium tracking-tight text-[#4D4F56]">
            {showVolumeHud
              ? `Volume ${Math.round(localVolume * 100)}%`
              : audioError
                ? 'Audio could not load'
                : item.trackTitle || 'Not Cute Anymore'}
          </div>

          {/* Interactive Click & Drag Scrubber */}
          <div
            ref={scrubberRef}
            onPointerDown={handleScrubberPointerDown}
            onClick={(e) => e.stopPropagation()}
            role="slider"
            aria-label="Seek music position"
            aria-valuemin={0}
            aria-valuemax={Math.round(effectiveDuration)}
            aria-valuenow={Math.round(audioProgress)}
            tabIndex={0}
            className="relative flex h-4 w-full cursor-pointer items-center"
          >
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-[#DED3DC]">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full rounded-full bg-[#C7B6C4]"
              />
            </div>
            <div
              style={{ left: `calc(${progressPercent}% - 6px)` }}
              className="pointer-events-none absolute h-3 w-3 rounded-full border border-[#C1B4C0] bg-white shadow-xs"
            />
          </div>

          {/* Bottom Timestamp & Loop Toggle */}
          <div className="flex w-full items-center justify-center gap-6 text-[#686A72]">
            <Shuffle className="h-3 w-3 opacity-35" aria-hidden="true" />
            <span className="font-mono-tabular text-[12px] font-medium leading-none">
              {formatSec(audioProgress)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isEditMode) {
                  onUpdate({ loop: !isLooping });
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
              aria-label="Toggle loop"
              className={`transition-opacity ${
                isEditMode ? 'cursor-pointer hover:opacity-100' : 'cursor-default'
              } ${isLooping ? 'opacity-80 text-[#9F1239]' : 'opacity-30'}`}
            >
              <Repeat className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={boxRef}
      onPointerDown={handleStartDrag}
      style={{
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.width}px`,
        height: `${item.height}px`,
        zIndex: item.zIndex,
        transform: `rotate(${item.rotation}deg)`,
      }}
      className={`absolute select-none ${
        isEditMode
          ? isEditingText
            ? 'cursor-text'
            : 'cursor-move'
          : ''
      }`}
    >
      {renderContent()}

      {/* Selection bounding box with resize + rotate handles */}
      {isEditMode && isSelected && (
        <div className="pointer-events-none absolute -inset-1 rounded-lg border-2 border-[#E11D48]">
          {/* Rotation Handle */}
          <div className="pointer-events-auto absolute -top-9 left-1/2 flex -translate-x-1/2 flex-col items-center">
            <button
              type="button"
              onPointerDown={handleStartRotate}
              title="Drag to tilt / rotate"
              aria-label="Rotate element"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-[#E11D48] text-white shadow-md cursor-grab active:cursor-grabbing"
            >
              <RotateCw className="h-3 w-3" aria-hidden="true" />
            </button>
            <div className="h-3 w-0.5 bg-[#E11D48]" />
            {isRotating && (
              <span className="font-mono-tabular absolute -top-6 rounded bg-[#4A2C24] px-1.5 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
                {item.rotation}°
              </span>
            )}
          </div>

          {/* 4 Corner Resize Handles */}
          {(
            [
              { key: 'nw', pos: '-top-1.5 -left-1.5 cursor-nwse-resize' },
              { key: 'ne', pos: '-top-1.5 -right-1.5 cursor-nesw-resize' },
              { key: 'sw', pos: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
              { key: 'se', pos: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
            ] as const
          ).map((h) => (
            <button
              key={h.key}
              type="button"
              onPointerDown={(e) => handleStartResize(e, h.key)}
              aria-label={`Resize from ${h.key} corner`}
              className={`pointer-events-auto absolute h-3.5 w-3.5 rounded-full border-2 border-[#E11D48] bg-white shadow ${h.pos}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
