import { useEffect, useMemo, useRef, useState } from 'react';
import { Share2, Volume2, VolumeX } from 'lucide-react';
import { CanvasElementView } from './components/CanvasElementView';
import { CanvasToolbar } from './components/CanvasToolbar';
import { OwnerAuthModal } from './components/OwnerAuthModal';
import { StickerGraphic } from './components/Stickers';
import { SaveStatus, TopBar } from './components/TopBar';
import { createStarterDocument } from './data/defaultCanvas';
import {
  CanvasDocument,
  CanvasItem,
  MusicCanvasItem,
  StickerKind,
} from './types/strawpage';
import {
  buildBackgroundStyle,
  getDefaultBorderColor,
  getDefaultCanvasBg,
  getDefaultOuterBg,
} from './utils/backgroundStyle';
import { ProcessedImageResult } from './utils/imageOptimize';

const OWNER_TOKEN_KEY = 'lace_straw_owner_token_v1';
const DRAFT_STORAGE_KEY = 'lace_straw_freeform_canvas_v1';
const LOGICAL_WIDTH = 1020;

export default function App() {
  const [doc, setDoc] = useState<CanvasDocument>(() => createStarterDocument('choco'));
  const [loadingPage, setLoadingPage] = useState(true);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [ownerToken, setOwnerToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(OWNER_TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [isOwner, setIsOwner] = useState(false);

  // Visitors always land on clean View mode; owner switches into Edit mode when desired
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [pendingDraft, setPendingDraft] = useState<CanvasDocument | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const skipNextAutoSaveRef = useRef(true);
  const draftSaveSeqRef = useRef(0);
  const initialTokenRef = useRef(ownerToken);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [editingBanner, setEditingBanner] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const MAX_HISTORY = 40;
  const [history, setHistory] = useState<{
    past: CanvasDocument[];
    future: CanvasDocument[];
  }>({ past: [], future: [] });
  const docRef = useRef(doc);
  docRef.current = doc;
  const lastBurstAtRef = useRef(0);

  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const [bgPlaying, setBgPlaying] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [userPausedBg, setUserPausedBg] = useState(false);
  const [isPreviewingBgMusic, setIsPreviewingBgMusic] = useState(false);

  const recordHistorySnapshot = () => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-(MAX_HISTORY - 1)), docRef.current],
      future: [],
    }));
    lastBurstAtRef.current = Date.now();
  };

  const commitDocChange = (updater: (prev: CanvasDocument) => CanvasDocument) => {
    recordHistorySnapshot();
    setDoc(updater);
  };

  const commitBurstChange = (updater: (prev: CanvasDocument) => CanvasDocument) => {
    const now = Date.now();
    if (now - lastBurstAtRef.current > 650) {
      setHistory((prev) => ({
        past: [...prev.past.slice(-(MAX_HISTORY - 1)), docRef.current],
        future: [],
      }));
    }
    lastBurstAtRef.current = now;
    setDoc(updater);
  };

  const handleUndo = () => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory({
      past: history.past.slice(0, -1),
      future: [docRef.current, ...history.future.slice(0, MAX_HISTORY - 1)],
    });
    setDoc(previous);
    setSelectedId((cur) =>
      cur && previous.items.some((it) => it.id === cur) ? cur : null
    );
  };

  const handleRedo = () => {
    if (history.future.length === 0) return;
    const [nextDoc, ...rest] = history.future;
    setHistory({
      past: [...history.past.slice(-(MAX_HISTORY - 1)), docRef.current],
      future: rest,
    });
    setDoc(nextDoc);
    setSelectedId((cur) =>
      cur && nextDoc.items.some((it) => it.id === cur) ? cur : null
    );
  };

  const undoRef = useRef(handleUndo);
  undoRef.current = handleUndo;
  const redoRef = useRef(handleRedo);
  redoRef.current = handleRedo;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 3000);
  };

  // Load published page + verify owner session + check saved draft once on startup
  useEffect(() => {
    let active = true;
    const token = initialTokenRef.current;

    async function initLoad() {
      try {
        const [pageRes, sessionRes, draftRes] = await Promise.all([
          fetch('/api/page'),
          fetch('/api/owner/session', {
            headers: token ? { 'x-owner-token': token } : {},
          }),
          token
            ? fetch('/api/owner/draft', {
                headers: { 'x-owner-token': token },
              })
            : Promise.resolve(null),
        ]);

        if (!active) return;

        if (pageRes.ok) {
          const pageData = await pageRes.json();
          setHasPasscode(Boolean(pageData.hasPasscode));
          if (pageData.document && Array.isArray(pageData.document.items)) {
            skipNextAutoSaveRef.current = true;
            setDoc(pageData.document as CanvasDocument);
          } else {
            // Fall back to any local draft if server has not been published yet
            try {
              const localDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
              if (localDraft) {
                const parsed = JSON.parse(localDraft) as CanvasDocument;
                if (parsed && Array.isArray(parsed.items)) {
                  skipNextAutoSaveRef.current = true;
                  setDoc(parsed);
                }
              }
            } catch {
              // Ignore invalid local draft
            }
          }
        }

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setHasPasscode(Boolean(sessionData.hasPasscode));
          const validOwner = Boolean(sessionData.isOwner);
          setIsOwner(validOwner);

          if (!validOwner && token) {
            localStorage.removeItem(OWNER_TOKEN_KEY);
            setOwnerToken(null);
          } else if (validOwner && draftRes && draftRes.ok) {
            const draftData = await draftRes.json();
            if (
              draftData?.draftDirty &&
              draftData.draft &&
              Array.isArray(draftData.draft.items)
            ) {
              setPendingDraft(draftData.draft as CanvasDocument);
            }
          }
        }
      } catch {
        // Keep starter layout on transient network issue
      } finally {
        if (active) setLoadingPage(false);
      }
    }
    void initLoad();
    return () => {
      active = false;
    };
  }, []);

  // Responsive canvas scaling
  useEffect(() => {
    const updateScale = () => {
      const available = Math.max(300, window.innerWidth - 32);
      setScale(Math.min(1, available / LOGICAL_WIDTH));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // Sync page title & auto-save draft to server (30MB) + localStorage fallback while editing
  useEffect(() => {
    document.title = doc.bannerTitle || 'My Personal Page';
    if (!isEditMode) return;

    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(doc));
    } catch {
      // Ignore storage quota; server draft persists up to 30MB
    }

    if (!isOwner || !ownerToken) return;

    if (skipNextAutoSaveRef.current) {
      skipNextAutoSaveRef.current = false;
      return;
    }

    setSaveStatus('unsaved');
    const capturedSeq = ++draftSaveSeqRef.current;
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (cancelled || capturedSeq !== draftSaveSeqRef.current) return;
      setSaveStatus('saving');
      try {
        const res = await fetch('/api/owner/draft', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-owner-token': ownerToken,
          },
          body: JSON.stringify({ document: doc }),
        });
        if (!cancelled && capturedSeq === draftSaveSeqRef.current) {
          setSaveStatus(res.ok ? 'saved' : 'error');
        }
      } catch {
        if (!cancelled && capturedSeq === draftSaveSeqRef.current) {
          setSaveStatus('error');
        }
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [doc, isEditMode, isOwner, ownerToken]);

  // Warn before closing/reloading tab if draft has not finished saving
  useEffect(() => {
    if (!isEditMode) return;
    if (saveStatus !== 'unsaved' && saveStatus !== 'saving' && saveStatus !== 'error') {
      return;
    }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isEditMode, saveStatus]);

  // Background Music Autoplay & Loop Engine
  useEffect(() => {
    const bg = doc.bgMusic;
    const audio = bgAudioRef.current;

    if (!bg?.enabled || !bg.src || bg.sourceKind !== 'audio') {
      if (audio) {
        audio.pause();
      }
      setBgPlaying(false);
      setNeedsAudioUnlock(false);
      return;
    }

    if (audio) {
      audio.volume = typeof bg.volume === 'number' ? Math.max(0, Math.min(1, bg.volume)) : 0.6;
    }

    const shouldPlay = isEditMode ? isPreviewingBgMusic : !userPausedBg;
    if (!shouldPlay) {
      if (audio) audio.pause();
      setBgPlaying(false);
      return;
    }

    if (!audio) return;

    let cancelled = false;
    let cleanupListeners: (() => void) | null = null;

    const tryPlay = async () => {
      try {
        await audio.play();
        if (!cancelled) {
          setBgPlaying(true);
          setNeedsAudioUnlock(false);
        }
      } catch {
        if (cancelled) return;
        setBgPlaying(false);
        setNeedsAudioUnlock(true);

        const unlockOnGesture = () => {
          if (cancelled) return;
          void audio.play().then(
            () => {
              if (!cancelled) {
                setBgPlaying(true);
                setNeedsAudioUnlock(false);
              }
            },
            () => {
              // Keep waiting if still blocked
            }
          );
          window.removeEventListener('pointerdown', unlockOnGesture, true);
          window.removeEventListener('touchstart', unlockOnGesture, true);
          window.removeEventListener('keydown', unlockOnGesture, true);
        };

        window.addEventListener('pointerdown', unlockOnGesture, { capture: true, once: true });
        window.addEventListener('touchstart', unlockOnGesture, { capture: true, once: true });
        window.addEventListener('keydown', unlockOnGesture, { capture: true, once: true });
        cleanupListeners = () => {
          window.removeEventListener('pointerdown', unlockOnGesture, true);
          window.removeEventListener('touchstart', unlockOnGesture, true);
          window.removeEventListener('keydown', unlockOnGesture, true);
        };
      }
    };

    void tryPlay();

    return () => {
      cancelled = true;
      if (cleanupListeners) cleanupListeners();
    };
  }, [doc.bgMusic, isEditMode, isPreviewingBgMusic, userPausedBg]);

  // Keyboard shortcuts in Edit mode (Undo/Redo, Escape, Delete)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNowRef.current();
        return;
      }

      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isTyping) return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redoRef.current();
        } else {
          undoRef.current();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redoRef.current();
        return;
      }

      if (!selectedId) return;

      if (e.key === 'Escape') {
        setSelectedId(null);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        commitDocChange((prev) => ({
          ...prev,
          items: prev.items.filter((it) => it.id !== selectedId),
        }));
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditMode, selectedId]);

  const selectedItem = useMemo(
    () => doc.items.find((item) => item.id === selectedId) || null,
    [doc.items, selectedId]
  );

  const nextZIndex = useMemo(
    () => doc.items.reduce((max, it) => Math.max(max, it.zIndex), 1) + 1,
    [doc.items]
  );

  const handleSaveNow = async () => {
    if (isSaving || isPublishing) return;
    setSelectedId(null);
    setEditingBanner(false);
    setIsSaving(true);
    setSaveStatus('saving');
    draftSaveSeqRef.current += 1;

    try {
      const res = await fetch('/api/page', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(ownerToken ? { 'x-owner-token': ownerToken } : {}),
        },
        body: JSON.stringify({ document: docRef.current }),
      });

      if (res.status === 401) {
        setSaveStatus('error');
        setIsAuthModalOpen(true);
        return;
      }

      if (res.ok) {
        setPendingDraft(null);
        setSaveStatus('saved');
        showToast('Saved! All your changes are safely stored.');
      } else {
        setSaveStatus('error');
        showToast('Could not save changes. Please try again.');
      }
    } catch {
      setSaveStatus('error');
      showToast('Network error while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveNowRef = useRef(handleSaveNow);
  saveNowRef.current = handleSaveNow;

  const handlePublishAndView = async () => {
    if (isSaving || isPublishing) return;
    setSelectedId(null);
    setEditingBanner(false);
    setIsPublishing(true);
    setSaveStatus('saving');
    draftSaveSeqRef.current += 1;

    try {
      const res = await fetch('/api/page', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(ownerToken ? { 'x-owner-token': ownerToken } : {}),
        },
        body: JSON.stringify({ document: docRef.current }),
      });

      if (res.status === 401) {
        setSaveStatus('error');
        setIsPublishing(false);
        setIsAuthModalOpen(true);
        return;
      }

      if (res.ok) {
        setPendingDraft(null);
        setSaveStatus('saved');
        setIsEditMode(false);
        setIsPreviewingBgMusic(false);
        setUserPausedBg(false);
        showToast('Published! Anyone opening this link now sees your latest page.');
      } else {
        setSaveStatus('error');
        showToast('Could not save changes. Please try again.');
      }
    } catch {
      setSaveStatus('error');
      showToast('Network error while publishing.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePrimaryBarAction = () => {
    if (isEditMode) {
      void handlePublishAndView();
      return;
    }
    if (isOwner) {
      if (pendingDraft) {
        skipNextAutoSaveRef.current = true;
        setDoc(pendingDraft);
        setPendingDraft(null);
        showToast('Restored your saved draft from last session!');
      } else {
        skipNextAutoSaveRef.current = true;
      }
      setSaveStatus('saved');
      setIsEditMode(true);
      return;
    }
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = async (token: string) => {
    try {
      localStorage.setItem(OWNER_TOKEN_KEY, token);
    } catch {
      // Ignore storage errors
    }
    setOwnerToken(token);
    setHasPasscode(true);
    setIsOwner(true);
    setIsAuthModalOpen(false);

    let restored = false;
    try {
      const draftRes = await fetch('/api/owner/draft', {
        headers: { 'x-owner-token': token },
      });
      if (draftRes.ok) {
        const draftData = await draftRes.json();
        if (
          draftData?.draftDirty &&
          draftData.draft &&
          Array.isArray(draftData.draft.items)
        ) {
          skipNextAutoSaveRef.current = true;
          setDoc(draftData.draft as CanvasDocument);
          setPendingDraft(null);
          restored = true;
        }
      }
    } catch {
      // Ignore draft fetch error on login
    }

    if (!restored) {
      skipNextAutoSaveRef.current = true;
    }
    setSaveStatus('saved');
    setIsEditMode(true);
    showToast(
      restored
        ? 'Restored your saved draft from last session!'
        : 'Unlocked Owner Edit Mode. Drag, resize, or tilt anything!'
    );
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      showToast('Copy the URL from your browser address bar to share!');
    }
  };

  const handleResetLayout = () => {
    setSelectedId(null);
    commitDocChange(() => createStarterDocument('choco'));
  };

  const handleUpdateItem = (id: string, patch: Partial<CanvasItem>, record = false) => {
    const apply = (prev: CanvasDocument): CanvasDocument => ({
      ...prev,
      items: prev.items.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch } as CanvasItem;
        // Keep items inside the inner frame bounds
        next.x = Math.max(0, Math.min(LOGICAL_WIDTH - next.width, next.x));
        next.y = Math.max(0, Math.min(prev.canvasHeight - next.height, next.y));
        return next;
      }),
    });

    if (record) {
      commitBurstChange(apply);
    } else {
      setDoc(apply);
    }
  };

  const getSpawnY = (fallbackY: number) => {
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;
    return Math.min(doc.canvasHeight - 190, scrollTop + fallbackY);
  };

  const handleAddText = () => {
    const id = `txt-${Date.now()}`;
    const newItem: CanvasItem = {
      id,
      type: 'text',
      content: 'Double-click to write your own text ♡',
      font: 'coquette',
      fontSize: 18,
      color: '#4A2C24',
      cardStyle: 'paper',
      align: 'center',
      x: 280,
      y: getSpawnY(140),
      width: 280,
      height: 110,
      rotation: 0,
      zIndex: nextZIndex,
    };
    commitDocChange((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedId(id);
  };

  const handleAddImageFile = (img: ProcessedImageResult) => {
    const id = `img-${Date.now()}`;
    const newItem: CanvasItem = {
      id,
      type: 'image',
      src: img.dataUrl,
      caption: '',
      showCaption: false,
      frameStyle: 'plain',
      x: 320,
      y: getSpawnY(120),
      width: img.width,
      height: img.height,
      rotation: 0,
      zIndex: nextZIndex,
    };
    commitDocChange((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedId(id);
  };

  const handleAddGifUrl = (url: string, width: number, height: number) => {
    const id = `gif-${Date.now()}`;
    const newItem: CanvasItem = {
      id,
      type: 'image',
      src: url,
      caption: '',
      showCaption: false,
      frameStyle: 'plain',
      x: 340,
      y: getSpawnY(120),
      width,
      height,
      rotation: 0,
      zIndex: nextZIndex,
    };
    commitDocChange((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedId(id);
  };

  const handleAddSticker = (sticker: StickerKind) => {
    const id = `stk-${Date.now()}`;
    const isWide = sticker === 'ribbon-line';
    const newItem: CanvasItem = {
      id,
      type: 'sticker',
      sticker,
      x: 410,
      y: getSpawnY(160),
      width: isWide ? 220 : 96,
      height: isWide ? 40 : 88,
      rotation: 0,
      zIndex: nextZIndex,
    };
    commitDocChange((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedId(id);
  };

  const handleAddLink = () => {
    const id = `lnk-${Date.now()}`;
    const newItem: CanvasItem = {
      id,
      type: 'link',
      label: 'My Link',
      url: 'https://instagram.com',
      icon: 'heart',
      x: 360,
      y: getSpawnY(180),
      width: 210,
      height: 48,
      rotation: 0,
      zIndex: nextZIndex,
    };
    commitDocChange((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    setSelectedId(id);
  };

  const handleAddMusic = (preset?: Partial<MusicCanvasItem>) => {
    const stamp = Date.now();
    const baseY = getSpawnY(140);
    const title = preset?.trackTitle || 'Not Cute Anymore';
    const artist = preset?.artist || 'Artist Name';

    const photoSlot: CanvasItem = {
      id: `mus-img-${stamp}`,
      type: 'image',
      src: '',
      caption: '',
      showCaption: false,
      frameStyle: 'plain',
      x: 200,
      y: baseY + 12,
      width: 112,
      height: 112,
      rotation: 0,
      zIndex: nextZIndex,
    };

    const metaBox: CanvasItem = {
      id: `mus-txt-${stamp}`,
      type: 'text',
      content: `${title}\nby ${artist}`,
      font: 'coquette',
      fontSize: 16,
      color: '#4A2C24',
      cardStyle: 'paper',
      align: 'left',
      x: 326,
      y: baseY,
      width: 245,
      height: 64,
      rotation: 0,
      zIndex: nextZIndex + 1,
    };

    const playerId = `mus-${stamp}`;
    const playerItem: CanvasItem = {
      id: playerId,
      type: 'music',
      trackTitle: title,
      artist,
      sourceKind: preset?.sourceKind || 'lofi',
      audioSrc: preset?.audioSrc,
      embedUrl: preset?.embedUrl,
      loop: preset?.loop ?? true,
      volume: preset?.volume ?? 0.7,
      x: 326,
      y: baseY + 72,
      width: preset?.width || 370,
      height: preset?.height || 110,
      rotation: 0,
      zIndex: nextZIndex + 2,
    };

    commitDocChange((prev) => ({
      ...prev,
      items: [...prev.items, photoSlot, metaBox, playerItem],
    }));
    setSelectedId(playerId);
  };

  const handleDuplicateSelected = () => {
    if (!selectedItem) return;
    const id = `${selectedItem.type}-${Date.now()}`;
    const copy: CanvasItem = {
      ...selectedItem,
      id,
      x: selectedItem.x + 24,
      y: selectedItem.y + 24,
      zIndex: nextZIndex,
    };
    commitDocChange((prev) => ({ ...prev, items: [...prev.items, copy] }));
    setSelectedId(id);
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    commitDocChange((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const handleLayerChange = (dir: 'front' | 'back') => {
    if (!selectedItem) return;
    const minZ = doc.items.reduce((m, it) => Math.min(m, it.zIndex), 1);
    handleUpdateItem(
      selectedItem.id,
      { zIndex: dir === 'front' ? nextZIndex : Math.max(1, minZ - 1) },
      true
    );
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strawpage-${doc.theme}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result === 'string') {
          const parsed = JSON.parse(reader.result) as CanvasDocument;
          if (parsed && Array.isArray(parsed.items)) {
            commitDocChange(() => parsed);
            setSelectedId(null);
          }
        }
      } catch {
        // Ignore invalid json
      }
    };
    reader.readAsText(file);
  };

  const outerBg = doc.outerBg || getDefaultOuterBg(doc.theme);
  const canvasBg = doc.canvasBg || getDefaultCanvasBg(doc.theme);
  const borderColor = doc.borderColor || getDefaultBorderColor(doc.theme);
  const showHeader = doc.showHeader !== false;
  const showFooter = doc.showFooter !== false;

  const innerFrameShapeClass =
    doc.theme === 'pastel' ? 'rounded-[28px]' : 'rounded-2xl';

  const innerViewportHeight = Math.min(680, doc.canvasHeight);
  const headerOffset = (showHeader ? 84 : 0) + (showFooter ? 42 : 0);
  const scaledHeight = (innerViewportHeight + headerOffset) * scale;

  return (
    <div
      style={buildBackgroundStyle(outerBg, 'outer')}
      className="min-h-screen pb-14 transition-colors duration-200"
    >
      <TopBar
        isEditMode={isEditMode}
        isOwner={isOwner}
        isSaving={isSaving}
        isPublishing={isPublishing}
        saveStatus={saveStatus}
        copiedLink={copiedLink}
        onResetLayout={handleResetLayout}
        onCopyShareLink={handleCopyShareLink}
        onSaveNow={handleSaveNow}
        onPrimaryAction={handlePrimaryBarAction}
      />

      {toastMsg && (
        <div
          role="status"
          className="mx-auto mt-3 max-w-[680px] rounded-xl border border-[#4A2C24]/25 bg-[#FFFDFB] px-4 py-2 text-center text-xs font-semibold text-[#4A2C24] shadow-sm"
        >
          {toastMsg}
        </div>
      )}

      <main className="px-4 pt-5">
        {isEditMode && (
          <CanvasToolbar
            selectedItem={selectedItem}
            canvasHeight={doc.canvasHeight}
            outerBg={outerBg}
            canvasBg={canvasBg}
            borderColor={borderColor}
            showHeader={showHeader}
            showFooter={showFooter}
            bgMusic={doc.bgMusic}
            isPreviewingBgMusic={isPreviewingBgMusic}
            onTogglePreviewBgMusic={() => setIsPreviewingBgMusic((v) => !v)}
            onChangeBgMusic={(next) => {
              commitDocChange((prev) => ({ ...prev, bgMusic: next }));
              if (!next) setIsPreviewingBgMusic(false);
            }}
            onChangeOuterBg={(next) =>
              commitBurstChange((prev) => ({ ...prev, outerBg: next }))
            }
            onChangeCanvasBg={(next) =>
              commitBurstChange((prev) => ({ ...prev, canvasBg: next }))
            }
            onChangeBorderColor={(color) =>
              commitBurstChange((prev) => ({ ...prev, borderColor: color }))
            }
            onToggleHeader={() =>
              commitDocChange((prev) => ({
                ...prev,
                showHeader: prev.showHeader === false,
              }))
            }
            onToggleFooter={() =>
              commitDocChange((prev) => ({
                ...prev,
                showFooter: prev.showFooter === false,
              }))
            }
            onAddText={handleAddText}
            onAddImageFile={handleAddImageFile}
            onAddGifUrl={handleAddGifUrl}
            onAddSticker={handleAddSticker}
            onAddLink={handleAddLink}
            onAddMusic={handleAddMusic}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onNotify={showToast}
            onUpdateSelected={(patch) =>
              selectedItem && handleUpdateItem(selectedItem.id, patch, true)
            }
            onReplaceSelectedImage={(img) =>
              selectedItem &&
              selectedItem.type === 'image' &&
              handleUpdateItem(
                selectedItem.id,
                {
                  src: img.dataUrl,
                  ...(selectedItem.frameStyle === 'plain'
                    ? { width: img.width, height: img.height }
                    : {}),
                },
                true
              )
            }
            onDuplicateSelected={handleDuplicateSelected}
            onDeleteSelected={handleDeleteSelected}
            onLayerChange={handleLayerChange}
            onChangeCanvasHeight={(delta) =>
              commitDocChange((prev) => ({
                ...prev,
                canvasHeight: Math.min(2200, Math.max(720, prev.canvasHeight + delta)),
              }))
            }
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
          />
        )}

        {loadingPage ? (
          <div className="mx-auto flex h-96 max-w-[1020px] items-center justify-center rounded-2xl border-2 border-[#4A2C24]/20 bg-[#FFF8F5]/90 text-sm font-medium text-[#6B4B42]">
            Loading page...
          </div>
        ) : (
          <div
            className="mx-auto flex justify-center"
            style={{ height: `${scaledHeight}px` }}
          >
            <div
              style={{
                width: `${LOGICAL_WIDTH}px`,
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                borderColor,
              }}
              className={`relative shrink-0 overflow-hidden border-4 shadow-2xl ${innerFrameShapeClass}`}
            >
              {/* Theme-specific Decorative Header Strip */}
              {showHeader && doc.theme === 'choco' && (
                <div className="overflow-hidden rounded-t-xl">
                  <div className="relative flex h-16 items-center justify-center bg-[#4A2C24] px-6 text-[#FFF8F5]">
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 bg-[#F7C7D4]/80" />
                    <div className="relative z-10 flex items-center gap-3 rounded-full border-2 border-[#D98A9E] bg-[#FFF8F5] px-7 py-1.5 text-[#4A2C24] shadow-sm">
                      <div className="h-5 w-7">
                        <StickerGraphic kind="bow-pink" />
                      </div>
                      {editingBanner && isEditMode ? (
                        <input
                          autoFocus
                          value={doc.bannerTitle}
                          onChange={(e) =>
                            setDoc((prev) => ({ ...prev, bannerTitle: e.target.value }))
                          }
                          onBlur={() => setEditingBanner(false)}
                          className="font-coquette bg-transparent text-center text-2xl font-bold italic outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => isEditMode && setEditingBanner(true)}
                          className="font-coquette text-2xl font-bold italic cursor-pointer"
                        >
                          {doc.bannerTitle}
                        </button>
                      )}
                      <div className="h-5 w-7">
                        <StickerGraphic kind="bow-pink" />
                      </div>
                    </div>
                  </div>
                  <div className="lace-strip-pink h-5 w-full border-y border-[#4A2C24]/30" />
                </div>
              )}

              {showHeader && doc.theme === 'pastel' && (
                <div className="overflow-hidden rounded-t-[24px] border-b-4 border-dashed border-[#F3B8C8] bg-[#FFF2F5] px-6 py-4 text-center">
                  <div className="mx-auto inline-flex items-center gap-3 rounded-full border-2 border-[#6D4C41]/40 bg-white px-7 py-1.5 shadow-sm">
                    <div className="h-6 w-6">
                      <StickerGraphic kind="bear-charm" />
                    </div>
                    {editingBanner && isEditMode ? (
                      <input
                        autoFocus
                        value={doc.bannerTitle}
                        onChange={(e) =>
                          setDoc((prev) => ({ ...prev, bannerTitle: e.target.value }))
                        }
                        onBlur={() => setEditingBanner(false)}
                        className="font-kawaii bg-transparent text-center text-xl font-bold text-[#6D4C41] outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => isEditMode && setEditingBanner(true)}
                        className="font-kawaii text-xl font-bold text-[#6D4C41] cursor-pointer"
                      >
                        {doc.bannerTitle}
                      </button>
                    )}
                    <div className="h-5 w-7">
                      <StickerGraphic kind="bow-pink" />
                    </div>
                  </div>
                </div>
              )}

              {showHeader && doc.theme === 'y2k' && (
                <div className="overflow-hidden rounded-t-xl border-b-2 border-[#F49AC1] bg-gradient-to-r from-[#FF8EC4] via-[#FFB3D9] to-[#9CD6FF] px-5 py-3 text-white">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono-tabular text-xs font-bold tracking-wider">
                      ★ MY PERSONAL SPACE
                    </span>
                    {editingBanner && isEditMode ? (
                      <input
                        autoFocus
                        value={doc.bannerTitle}
                        onChange={(e) =>
                          setDoc((prev) => ({ ...prev, bannerTitle: e.target.value }))
                        }
                        onBlur={() => setEditingBanner(false)}
                        className="font-kawaii flex-1 bg-white/25 px-2 py-0.5 text-center text-sm font-bold text-white outline-none rounded"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => isEditMode && setEditingBanner(true)}
                        className="font-kawaii text-sm font-bold cursor-pointer hover:underline"
                      >
                        {doc.bannerTitle}
                      </button>
                    )}
                    <span className="font-mono-tabular text-xs font-bold">ONLINE ♡</span>
                  </div>
                </div>
              )}

              {/* Scrollable Inner Canvas Viewport — items stay inside while readers scroll up & down */}
              <div
                ref={scrollContainerRef}
                style={{
                  height: `${innerViewportHeight}px`,
                  ...buildBackgroundStyle(canvasBg, 'canvas'),
                }}
                className="scrapbook-scroll relative w-full overflow-x-hidden overflow-y-auto"
              >
                <div
                  onPointerDown={() => setSelectedId(null)}
                  style={{ height: `${doc.canvasHeight}px` }}
                  className="relative w-full"
                >
                  {doc.items.map((item) => (
                    <CanvasElementView
                      key={item.id}
                      item={item}
                      theme={doc.theme}
                      scale={scale}
                      isEditMode={isEditMode}
                      isSelected={selectedId === item.id}
                      onSelect={() => setSelectedId(item.id)}
                      onInteractionStart={recordHistorySnapshot}
                      onUpdate={(patch) => handleUpdateItem(item.id, patch)}
                    />
                  ))}
                </div>
              </div>

              {/* Footer Strip */}
              {showFooter && (
                <div
                  className={`overflow-hidden border-t px-6 py-3 text-center text-xs ${
                    doc.theme === 'pastel' ? 'rounded-b-[24px]' : 'rounded-b-xl'
                  } ${
                    doc.theme === 'choco'
                      ? 'border-[#4A2C24]/25 bg-[#4A2C24] text-[#F9DCE4]'
                      : doc.theme === 'y2k'
                        ? 'border-[#F49AC1]/40 bg-[#FFF0F7] text-[#64748B]'
                        : 'border-[#F3B8C8] bg-[#FFF2F5] text-[#6D4C41]'
                  }`}
                >
                  {doc.footerCredit}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile/Quick Visitor Actions */}
        {!isEditMode && (
          <div className="mx-auto mt-6 flex max-w-[960px] flex-wrap items-center justify-center gap-3 md:hidden">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#4A2C24]/20 bg-[#FFFDFB] px-4 py-2 text-xs font-semibold text-[#4A2C24] shadow-xs cursor-pointer"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              <span>{copiedLink ? 'Copied Link!' : 'Copy Share Link'}</span>
            </button>
          </div>
        )}
      </main>

      <OwnerAuthModal
        isOpen={isAuthModalOpen}
        hasPasscode={hasPasscode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Global Background Audio (Autoplay & Loop) */}
      {doc.bgMusic?.enabled && doc.bgMusic.sourceKind === 'audio' && doc.bgMusic.src && (
        <audio
          ref={bgAudioRef}
          src={doc.bgMusic.src}
          loop
          preload="auto"
        />
      )}

      {doc.bgMusic?.enabled &&
        doc.bgMusic.sourceKind === 'youtube' &&
        doc.bgMusic.src &&
        ((!isEditMode && !userPausedBg) || (isEditMode && isPreviewingBgMusic)) && (
          <iframe
            src={doc.bgMusic.src}
            title="Background music"
            allow="autoplay"
            className="pointer-events-none fixed -left-[9999px] h-1 w-1 opacity-0"
          />
        )}

      {/* Subtle corner BGM toggle for visitors */}
      {!isEditMode && doc.bgMusic?.enabled && doc.bgMusic.src && (
        <button
          type="button"
          onClick={() => {
            if (doc.bgMusic?.sourceKind === 'youtube') {
              setUserPausedBg((v) => !v);
              return;
            }
            const audio = bgAudioRef.current;
            if (!audio) return;
            if (bgPlaying && !userPausedBg) {
              audio.pause();
              setBgPlaying(false);
              setUserPausedBg(true);
            } else {
              setUserPausedBg(false);
              setNeedsAudioUnlock(false);
              void audio.play().then(
                () => setBgPlaying(true),
                () => setBgPlaying(false)
              );
            }
          }}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-xl border border-[#4A2C24]/25 bg-[#FFFDFB]/95 px-3.5 py-2 text-xs font-semibold text-[#4A2C24] shadow-lg backdrop-blur-sm cursor-pointer transition-transform hover:scale-105"
          aria-label={
            userPausedBg || (doc.bgMusic.sourceKind === 'audio' && !bgPlaying)
              ? 'Play background music'
              : 'Mute background music'
          }
        >
          {userPausedBg || (doc.bgMusic.sourceKind === 'audio' && !bgPlaying && !needsAudioUnlock) ? (
            <VolumeX className="h-3.5 w-3.5 text-[#8B6B63]" aria-hidden="true" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-[#E11D48]" aria-hidden="true" />
          )}
          <span className="max-w-[160px] truncate">
            {needsAudioUnlock && !bgPlaying
              ? `Tap for BGM · ${doc.bgMusic.title}`
              : userPausedBg
                ? `BGM Off · ${doc.bgMusic.title}`
                : doc.bgMusic.title}
          </span>
        </button>
      )}
    </div>
  );
}
