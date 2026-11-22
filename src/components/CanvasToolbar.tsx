import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  ExternalLink,
  Film,
  ImagePlus,
  Link2,
  Music,
  Palette,
  Redo2,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Upload,
  Volume2,
} from 'lucide-react';
import {
  BackgroundConfig,
  BackgroundMusicConfig,
  CanvasItem,
  ElementFont,
  MusicCanvasItem,
  PhotoFrameStyle,
  StickerKind,
  TextCardStyle,
} from '../types/strawpage';
import {
  compressImageFile,
  measureImageUrlDimensions,
  ProcessedImageResult,
} from '../utils/imageOptimize';
import { normalizeLinkUrl } from '../utils/linkUrl';
import { parseMusicUrl, readAudioFileAsDataUrl } from '../utils/musicEmbed';
import { BackgroundPanel } from './BackgroundPanel';
import { BgMusicPanel } from './BgMusicPanel';
import { STICKER_CATALOG, StickerGraphic } from './Stickers';

interface CanvasToolbarProps {
  selectedItem: CanvasItem | null;
  canvasHeight: number;
  outerBg: BackgroundConfig;
  canvasBg: BackgroundConfig;
  borderColor: string;
  showHeader: boolean;
  showFooter: boolean;
  bgMusic?: BackgroundMusicConfig;
  isPreviewingBgMusic: boolean;
  onTogglePreviewBgMusic: () => void;
  onChangeBgMusic: (next: BackgroundMusicConfig | undefined) => void;
  onChangeOuterBg: (next: BackgroundConfig) => void;
  onChangeCanvasBg: (next: BackgroundConfig) => void;
  onChangeBorderColor: (color: string) => void;
  onToggleHeader: () => void;
  onToggleFooter: () => void;
  onAddText: () => void;
  onAddImageFile: (img: ProcessedImageResult) => void;
  onAddGifUrl: (url: string, width: number, height: number) => void;
  onAddSticker: (kind: StickerKind) => void;
  onAddLink: () => void;
  onAddMusic: (preset?: Partial<MusicCanvasItem>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNotify: (msg: string) => void;
  onUpdateSelected: (patch: Partial<CanvasItem>) => void;
  onReplaceSelectedImage: (img: ProcessedImageResult) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onLayerChange: (dir: 'front' | 'back') => void;
  onChangeCanvasHeight: (delta: number) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
}

const TEXT_COLORS = ['#4A2C24', '#C77A8E', '#E11D48', '#6D4C41', '#1E293B', '#2563EB'];

export function CanvasToolbar({
  selectedItem,
  canvasHeight,
  outerBg,
  canvasBg,
  borderColor,
  showHeader,
  showFooter,
  bgMusic,
  isPreviewingBgMusic,
  onTogglePreviewBgMusic,
  onChangeBgMusic,
  onChangeOuterBg,
  onChangeCanvasBg,
  onChangeBorderColor,
  onToggleHeader,
  onToggleFooter,
  onAddText,
  onAddImageFile,
  onAddGifUrl,
  onAddSticker,
  onAddLink,
  onAddMusic,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNotify,
  onUpdateSelected,
  onReplaceSelectedImage,
  onDuplicateSelected,
  onDeleteSelected,
  onLayerChange,
  onChangeCanvasHeight,
  onExportJson,
  onImportJson,
}: CanvasToolbarProps) {
  const [stickerMenuOpen, setStickerMenuOpen] = useState(false);
  const [gifMenuOpen, setGifMenuOpen] = useState(false);
  const [musicMenuOpen, setMusicMenuOpen] = useState(false);
  const [bgPanelOpen, setBgPanelOpen] = useState(false);
  const [bgMusicPanelOpen, setBgMusicPanelOpen] = useState(false);

  const [gifUrlInput, setGifUrlInput] = useState('');
  const [musicUrlInput, setMusicUrlInput] = useState('');
  const [selectedMusicUrlInput, setSelectedMusicUrlInput] = useState('');
  const [selectedImageUrlInput, setSelectedImageUrlInput] = useState('');

  useEffect(() => {
    setSelectedMusicUrlInput('');
    setSelectedImageUrlInput('');
  }, [selectedItem?.id]);

  const addImageInputRef = useRef<HTMLInputElement | null>(null);
  const addGifInputRef = useRef<HTMLInputElement | null>(null);
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
  const addAudioInputRef = useRef<HTMLInputElement | null>(null);
  const replaceAudioInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const closeAllMenus = () => {
    setStickerMenuOpen(false);
    setGifMenuOpen(false);
    setMusicMenuOpen(false);
  };

  const readImageFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    cb: (img: ProcessedImageResult) => void
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const optimized = await compressImageFile(file, 1200);
      cb(optimized);
    } catch {
      onNotify('Could not read that image or GIF file.');
    }
  };

  const handleInsertGifUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = gifUrlInput.trim();
    if (!raw) return;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const dims = await measureImageUrlDimensions(normalized);
    onAddGifUrl(normalized, dims.width, dims.height);
    setGifUrlInput('');
    setGifMenuOpen(false);
  };

  const handleUploadNewAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { dataUrl, fileNameTitle } = await readAudioFileAsDataUrl(file);
      onAddMusic({
        sourceKind: 'audio',
        audioSrc: dataUrl,
        trackTitle: fileNameTitle,
        artist: 'Artist Name',
        loop: true,
        volume: 0.7,
      });
      setMusicMenuOpen(false);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not load audio file.');
    }
  };

  const handleInsertMusicUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseMusicUrl(musicUrlInput);
    if (!parsed) {
      onNotify('Please paste a valid YouTube, Spotify, SoundCloud, or MP3 audio link.');
      return;
    }
    onAddMusic({
      sourceKind: parsed.sourceKind,
      audioSrc: parsed.audioSrc,
      embedUrl: parsed.embedUrl,
      trackTitle: parsed.providerLabel === 'Direct Audio' ? 'My Favorite Song' : `${parsed.providerLabel} Track`,
      artist: 'Artist Name',
      loop: true,
      volume: 0.7,
      ...(parsed.sourceKind === 'embed' && parsed.providerLabel !== 'YouTube'
        ? { width: 370, height: 156 }
        : {}),
    });
    setMusicUrlInput('');
    setMusicMenuOpen(false);
  };

  const handleReplaceSelectedAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedItem || selectedItem.type !== 'music') return;
    try {
      const { dataUrl, fileNameTitle } = await readAudioFileAsDataUrl(file);
      onUpdateSelected({
        sourceKind: 'audio',
        audioSrc: dataUrl,
        embedUrl: undefined,
        trackTitle: fileNameTitle,
      });
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not load audio file.');
    }
  };

  const handleApplySelectedMusicUrl = () => {
    if (!selectedItem || selectedItem.type !== 'music') return;
    const parsed = parseMusicUrl(selectedMusicUrlInput);
    if (!parsed) {
      onNotify('Please paste a valid YouTube, Spotify, SoundCloud, or MP3 link.');
      return;
    }
    onUpdateSelected({
      sourceKind: parsed.sourceKind,
      embedUrl: parsed.embedUrl,
      audioSrc: parsed.audioSrc,
    });
    setSelectedMusicUrlInput('');
  };

  const handleApplySelectedImageUrl = async () => {
    if (!selectedItem || selectedItem.type !== 'image') return;
    const raw = selectedImageUrlInput.trim();
    if (!raw) return;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const dims = await measureImageUrlDimensions(normalized);
    onUpdateSelected({
      src: normalized,
      ...(selectedItem.frameStyle === 'plain' ? dims : {}),
    });
    setSelectedImageUrlInput('');
  };

  return (
    <div className="mx-auto mb-4 max-w-[1020px] space-y-2.5">
      {/* Main Creator Strip */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#4A2C24]/20 bg-[#FFFDFB]/95 px-4 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={addImageInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => readImageFile(e, onAddImageFile)}
          />
          <button
            type="button"
            onClick={() => {
              closeAllMenus();
              addImageInputRef.current?.click();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#E11D48] px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap cursor-pointer transition-colors hover:bg-[#BE123C]"
          >
            <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Photo</span>
          </button>

          {/* Add GIF (Upload or Paste GIF Link) */}
          <div className="relative">
            <input
              ref={addGifInputRef}
              type="file"
              accept="image/gif,image/webp,image/*"
              className="sr-only"
              onChange={(e) => {
                void readImageFile(e, onAddImageFile);
                setGifMenuOpen(false);
              }}
            />
            <button
              type="button"
              onClick={() => {
                const next = !gifMenuOpen;
                closeAllMenus();
                setGifMenuOpen(next);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                gifMenuOpen
                  ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                  : 'border-[#4A2C24]/20 bg-[#FFF5F7] text-[#4A2C24] hover:bg-[#FFE8EE]'
              }`}
            >
              <Film className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add GIF</span>
            </button>

            {gifMenuOpen && (
              <div className="absolute left-0 top-10 z-50 w-76 rounded-2xl border border-[#4A2C24]/20 bg-[#FFFDFB] p-3.5 shadow-xl">
                <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-[#4A2C24]">
                  <span>Insert Animated GIF</span>
                  <button
                    type="button"
                    onClick={() => setGifMenuOpen(false)}
                    className="text-[#8B6B63] hover:text-[#4A2C24] cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => addGifInputRef.current?.click()}
                  className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E11D48] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#BE123C]"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Upload GIF from Device</span>
                </button>

                <form onSubmit={handleInsertGifUrl} className="space-y-2 border-t border-[#4A2C24]/10 pt-2.5">
                  <label className="block text-[11px] font-medium text-[#6B4B42]">
                    Or paste direct GIF link (`.gif` / `.webp`)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={gifUrlInput}
                      onChange={(e) => setGifUrlInput(e.target.value)}
                      placeholder="https://.../cute.gif"
                      className="min-w-0 flex-1 rounded-lg border border-[#4A2C24]/20 bg-white px-2.5 py-1.5 text-xs text-[#4A2C24] outline-none focus:border-[#E11D48]"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-[#4A2C24] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-[#3A211B]"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              closeAllMenus();
              onAddText();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4A2C24]/20 bg-[#FFF5F7] px-3 py-1.5 text-xs font-semibold text-[#4A2C24] whitespace-nowrap cursor-pointer hover:bg-[#FFE8EE]"
          >
            <Type className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Text</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const next = !stickerMenuOpen;
                closeAllMenus();
                setStickerMenuOpen(next);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                stickerMenuOpen
                  ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                  : 'border-[#4A2C24]/20 bg-[#FFF5F7] text-[#4A2C24] hover:bg-[#FFE8EE]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Sticker</span>
            </button>

            {stickerMenuOpen && (
              <div className="absolute left-0 top-10 z-50 w-72 rounded-2xl border border-[#4A2C24]/20 bg-[#FFFDFB] p-3 shadow-xl">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#4A2C24]">
                  <span>Pick a sticker to drop</span>
                  <button
                    type="button"
                    onClick={() => setStickerMenuOpen(false)}
                    className="text-[#8B6B63] hover:text-[#4A2C24] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {STICKER_CATALOG.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      title={st.label}
                      onClick={() => {
                        onAddSticker(st.id);
                        setStickerMenuOpen(false);
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-transparent bg-[#FFF6F8] p-1.5 transition-transform hover:scale-110 hover:border-[#E11D48]/40 cursor-pointer"
                    >
                      <StickerGraphic kind={st.id} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              closeAllMenus();
              onAddLink();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4A2C24]/20 bg-[#FFF5F7] px-3 py-1.5 text-xs font-semibold text-[#4A2C24] whitespace-nowrap cursor-pointer hover:bg-[#FFE8EE]"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Link</span>
          </button>

          {/* Add Music (Upload MP3/Audio, Paste Spotify/YouTube/SoundCloud/MP3, or Default Lo-fi) */}
          <div className="relative">
            <input
              ref={addAudioInputRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={handleUploadNewAudio}
            />
            <button
              type="button"
              onClick={() => {
                const next = !musicMenuOpen;
                closeAllMenus();
                setMusicMenuOpen(next);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                musicMenuOpen
                  ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                  : 'border-[#4A2C24]/20 bg-[#FFF5F7] text-[#4A2C24] hover:bg-[#FFE8EE]'
              }`}
            >
              <Music className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Add Music</span>
            </button>

            {musicMenuOpen && (
              <div className="absolute left-0 top-10 z-50 w-80 rounded-2xl border border-[#4A2C24]/20 bg-[#FFFDFB] p-3.5 shadow-xl">
                <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-[#4A2C24]">
                  <span>Add Silver MP3 Player</span>
                  <button
                    type="button"
                    onClick={() => setMusicMenuOpen(false)}
                    className="text-[#8B6B63] hover:text-[#4A2C24] cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => addAudioInputRef.current?.click()}
                  className="mb-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E11D48] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#BE123C]"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Upload MP3 / Audio File</span>
                </button>

                <form onSubmit={handleInsertMusicUrl} className="space-y-2 border-t border-[#4A2C24]/10 pt-2.5">
                  <label className="block text-[11px] font-medium text-[#6B4B42]">
                    Or paste YouTube / Spotify / SoundCloud / `.mp3` link
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={musicUrlInput}
                      onChange={(e) => setMusicUrlInput(e.target.value)}
                      placeholder="https://youtube.com/... or song.mp3"
                      className="min-w-0 flex-1 rounded-lg border border-[#4A2C24]/20 bg-white px-2.5 py-1.5 text-xs text-[#4A2C24] outline-none focus:border-[#E11D48]"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-[#4A2C24] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-[#3A211B]"
                    >
                      Add
                    </button>
                  </div>
                </form>

                <div className="mt-2.5 space-y-1.5 border-t border-[#4A2C24]/10 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onAddMusic({
                        sourceKind: 'lofi',
                        trackTitle: 'Not Cute Anymore',
                        artist: 'Artist Name',
                        volume: 0.7,
                        loop: true,
                      });
                      setMusicMenuOpen(false);
                    }}
                    className="w-full rounded-lg border border-[#4A2C24]/15 bg-[#FAF4F0] px-2.5 py-1.5 text-xs font-medium text-[#4A2C24] cursor-pointer hover:bg-[#FFE8EE]"
                  >
                    Drop Player + Photo &amp; Text Boxes
                  </button>
                  <p className="text-[10px] leading-snug text-[#8B6B63]">
                    Includes separate boxes for cover photo &amp; song/author text so you can arrange them freely.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              closeAllMenus();
              setBgMusicPanelOpen(false);
              setBgPanelOpen((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              bgPanelOpen
                ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                : 'border-[#4A2C24]/20 bg-[#FFF5F7] text-[#4A2C24] hover:bg-[#FFE8EE]'
            }`}
          >
            <Palette className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Background</span>
          </button>

          <button
            type="button"
            onClick={() => {
              closeAllMenus();
              setBgPanelOpen(false);
              setBgMusicPanelOpen((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              bgMusicPanelOpen
                ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                : bgMusic?.enabled && bgMusic.src
                  ? 'border-[#E11D48] bg-[#FFE8EE] text-[#9F1239]'
                  : 'border-[#4A2C24]/20 bg-[#FFF5F7] text-[#4A2C24] hover:bg-[#FFE8EE]'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>BG Music</span>
          </button>
        </div>

        {/* Undo / Redo, Page Height & Backup Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B4B42]">
          <div className="flex items-center gap-1 rounded-lg border border-[#4A2C24]/15 bg-[#FAF4F0] p-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-[#4A2C24] hover:bg-white disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-[#4A2C24] hover:bg-white disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
            >
              <Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Redo</span>
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-[#4A2C24]/15 bg-[#FAF4F0] px-2 py-1">
            <span className="font-medium">Height:</span>
            <button
              type="button"
              onClick={() => onChangeCanvasHeight(-140)}
              disabled={canvasHeight <= 720}
              className="rounded px-1.5 py-0.5 font-bold hover:bg-white disabled:opacity-40 cursor-pointer"
              title="Shorter page"
            >
              −
            </button>
            <span className="font-mono-tabular text-[11px]">{canvasHeight}px</span>
            <button
              type="button"
              onClick={() => onChangeCanvasHeight(140)}
              disabled={canvasHeight >= 2200}
              className="rounded px-1.5 py-0.5 font-bold hover:bg-white disabled:opacity-40 cursor-pointer"
              title="Taller page"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={onExportJson}
            title="Download backup file"
            className="inline-flex items-center gap-1 rounded-lg border border-[#4A2C24]/15 bg-white px-2.5 py-1.5 font-medium text-[#4A2C24] hover:bg-[#FFF5F7] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export</span>
          </button>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportJson(file);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            title="Import backup file"
            className="inline-flex items-center gap-1 rounded-lg border border-[#4A2C24]/15 bg-white px-2.5 py-1.5 font-medium text-[#4A2C24] hover:bg-[#FFF5F7] cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {bgPanelOpen && (
        <BackgroundPanel
          outerBg={outerBg}
          canvasBg={canvasBg}
          borderColor={borderColor}
          showHeader={showHeader}
          showFooter={showFooter}
          onChangeOuterBg={onChangeOuterBg}
          onChangeCanvasBg={onChangeCanvasBg}
          onChangeBorderColor={onChangeBorderColor}
          onToggleHeader={onToggleHeader}
          onToggleFooter={onToggleFooter}
          onClose={() => setBgPanelOpen(false)}
        />
      )}

      {bgMusicPanelOpen && (
        <BgMusicPanel
          bgMusic={bgMusic}
          isPreviewing={isPreviewingBgMusic}
          onTogglePreview={onTogglePreviewBgMusic}
          onChangeBgMusic={onChangeBgMusic}
          onNotify={onNotify}
          onClose={() => setBgMusicPanelOpen(false)}
        />
      )}

      {/* Selected Element Quick Inspector */}
      {selectedItem ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E11D48]/30 bg-[#FFFDFB] px-4 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Image / GIF controls */}
            {selectedItem.type === 'image' && (
              <>
                <input
                  ref={replaceImageInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => readImageFile(e, onReplaceSelectedImage)}
                />
                <button
                  type="button"
                  onClick={() => replaceImageInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-md border border-[#4A2C24]/20 bg-[#FFF5F7] px-2.5 py-1 font-semibold text-[#4A2C24] cursor-pointer hover:bg-[#FFE4EC]"
                >
                  <Upload className="h-3 w-3" aria-hidden="true" />
                  <span>Replace Photo / GIF</span>
                </button>

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={selectedImageUrlInput}
                    onChange={(e) => setSelectedImageUrlInput(e.target.value)}
                    placeholder="Or paste GIF / image URL..."
                    className="w-40 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                  />
                  {selectedImageUrlInput.trim() && (
                    <button
                      type="button"
                      onClick={handleApplySelectedImageUrl}
                      className="rounded-md bg-[#4A2C24] px-2 py-1 text-xs font-semibold text-white cursor-pointer"
                    >
                      Set
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-1.5 text-[#4A2C24]">
                  <span>Frame:</span>
                  <select
                    value={selectedItem.frameStyle}
                    onChange={(e) =>
                      onUpdateSelected({ frameStyle: e.target.value as PhotoFrameStyle })
                    }
                    className="rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs"
                  >
                    <option value="plain">Original (No Frame)</option>
                    <option value="polaroid">Polaroid</option>
                    <option value="lace">Lace Dashed</option>
                    <option value="scallop">Pink Border</option>
                    <option value="tape">Washi Tape</option>
                  </select>
                </label>

                <input
                  type="text"
                  value={selectedItem.caption}
                  onChange={(e) => onUpdateSelected({ caption: e.target.value })}
                  placeholder="Caption..."
                  className="w-32 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                />

                <button
                  type="button"
                  onClick={() => onUpdateSelected({ showCaption: !selectedItem.showCaption })}
                  className={`rounded-md border px-2 py-1 font-medium cursor-pointer ${
                    selectedItem.showCaption
                      ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                      : 'border-[#4A2C24]/20 bg-white text-[#4A2C24]'
                  }`}
                >
                  Caption
                </button>
              </>
            )}

            {/* Text-specific controls */}
            {selectedItem.type === 'text' && (
              <>
                <select
                  value={selectedItem.font}
                  onChange={(e) =>
                    onUpdateSelected({ font: e.target.value as ElementFont })
                  }
                  aria-label="Font family"
                  className="rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                >
                  <option value="coquette">Coquette Serif</option>
                  <option value="kawaii">Kawaii Rounded</option>
                  <option value="hand">Handwritten</option>
                  <option value="clean">Clean Sans</option>
                  <option value="mono">Typewriter</option>
                </select>

                <div className="flex items-center gap-1 rounded-md border border-[#4A2C24]/20 bg-white px-1.5 py-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSelected({ fontSize: Math.max(11, selectedItem.fontSize - 2) })
                    }
                    className="px-1 font-bold cursor-pointer"
                  >
                    A-
                  </button>
                  <span className="font-mono-tabular text-[11px]">{selectedItem.fontSize}</span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateSelected({ fontSize: Math.min(72, selectedItem.fontSize + 2) })
                    }
                    className="px-1 font-bold cursor-pointer"
                  >
                    A+
                  </button>
                </div>

                <select
                  value={selectedItem.cardStyle}
                  onChange={(e) =>
                    onUpdateSelected({ cardStyle: e.target.value as TextCardStyle })
                  }
                  aria-label="Box style"
                  className="rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                >
                  <option value="none">No Box</option>
                  <option value="paper">Cream Box</option>
                  <option value="lace">Lace Dashed</option>
                  <option value="pink">Pastel Pink</option>
                  <option value="choco">Chocolate Box</option>
                </select>

                <div className="flex items-center gap-1">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdateSelected({ color: c })}
                      aria-label={`Text color ${c}`}
                      className={`h-5 w-5 rounded-full border cursor-pointer ${
                        selectedItem.color === c ? 'ring-2 ring-[#E11D48]' : 'border-black/15'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <div className="flex items-center rounded-md border border-[#4A2C24]/20 bg-white">
                  <button
                    type="button"
                    onClick={() => onUpdateSelected({ align: 'left' })}
                    className={`p-1 cursor-pointer ${
                      selectedItem.align === 'left' ? 'bg-[#FFE8EE]' : ''
                    }`}
                    aria-label="Align left"
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSelected({ align: 'center' })}
                    className={`p-1 cursor-pointer ${
                      selectedItem.align === 'center' ? 'bg-[#FFE8EE]' : ''
                    }`}
                    aria-label="Align center"
                  >
                    <AlignCenter className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateSelected({ align: 'right' })}
                    className={`p-1 cursor-pointer ${
                      selectedItem.align === 'right' ? 'bg-[#FFE8EE]' : ''
                    }`}
                    aria-label="Align right"
                  >
                    <AlignRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <span className="text-[11px] text-[#8B6B63]">Double-click text to edit</span>
              </>
            )}

            {/* Link-specific controls */}
            {selectedItem.type === 'link' && (
              <>
                <input
                  type="text"
                  value={selectedItem.label}
                  onChange={(e) => onUpdateSelected({ label: e.target.value })}
                  placeholder="Button text"
                  className="w-28 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                />
                <input
                  type="text"
                  value={selectedItem.url}
                  onChange={(e) => onUpdateSelected({ url: e.target.value })}
                  onBlur={() => {
                    const normalized = normalizeLinkUrl(selectedItem.url);
                    if (normalized && normalized !== selectedItem.url) {
                      onUpdateSelected({ url: normalized });
                    }
                  }}
                  placeholder="https://... (e.g. tiktok.com/@name)"
                  className="w-52 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                />
                {normalizeLinkUrl(selectedItem.url) && (
                  <a
                    href={normalizeLinkUrl(selectedItem.url)}
                    target={
                      /^(mailto:|tel:)/i.test(normalizeLinkUrl(selectedItem.url))
                        ? undefined
                        : '_blank'
                    }
                    rel="noopener noreferrer"
                    title="Test link"
                    className="inline-flex items-center gap-1 rounded-md border border-[#4A2C24]/20 bg-[#FFF5F7] px-2 py-1 text-xs font-medium text-[#4A2C24] hover:bg-[#FFE4EC]"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    <span>Open</span>
                  </a>
                )}
                <select
                  value={selectedItem.icon}
                  onChange={(e) =>
                    onUpdateSelected({
                      icon: e.target.value as
                        | 'instagram'
                        | 'tiktok'
                        | 'twitter'
                        | 'spotify'
                        | 'mail'
                        | 'heart'
                        | 'star',
                    })
                  }
                  className="rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                >
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">Twitter</option>
                  <option value="spotify">Spotify</option>
                  <option value="mail">Mail</option>
                  <option value="heart">Heart</option>
                  <option value="star">Star</option>
                </select>
              </>
            )}

            {/* Music-specific controls */}
            {selectedItem.type === 'music' && (
              <>
                <input
                  ref={replaceAudioInputRef}
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={handleReplaceSelectedAudio}
                />
                <button
                  type="button"
                  onClick={() => replaceAudioInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-md border border-[#4A2C24]/20 bg-[#FFF5F7] px-2.5 py-1 font-semibold text-[#4A2C24] cursor-pointer hover:bg-[#FFE4EC]"
                >
                  <Upload className="h-3 w-3" aria-hidden="true" />
                  <span>Upload MP3</span>
                </button>

                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={selectedMusicUrlInput}
                    onChange={(e) => setSelectedMusicUrlInput(e.target.value)}
                    placeholder="YouTube / Spotify / .mp3 link"
                    className="w-44 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                  />
                  {selectedMusicUrlInput.trim() && (
                    <button
                      type="button"
                      onClick={handleApplySelectedMusicUrl}
                      className="rounded-md bg-[#4A2C24] px-2 py-1 text-xs font-semibold text-white cursor-pointer"
                    >
                      Apply
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={selectedItem.trackTitle}
                  onChange={(e) => onUpdateSelected({ trackTitle: e.target.value })}
                  placeholder="Player screen title"
                  className="w-36 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                />

                <label className="flex items-center gap-1 rounded-md border border-[#4A2C24]/15 bg-white px-2 py-1 text-[#4A2C24]">
                  <span>Vol:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={selectedItem.volume ?? 0.7}
                    onChange={(e) =>
                      onUpdateSelected({ volume: Number(e.target.value) })
                    }
                    className="w-14 accent-[#E11D48]"
                  />
                  <span className="font-mono-tabular w-7 text-right text-[11px]">
                    {Math.round((selectedItem.volume ?? 0.7) * 100)}%
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateSelected({ loop: selectedItem.loop === false })
                  }
                  className={`rounded-md border px-2 py-1 font-medium cursor-pointer ${
                    selectedItem.loop !== false
                      ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                      : 'border-[#4A2C24]/20 bg-white text-[#4A2C24]'
                  }`}
                >
                  Loop
                </button>
              </>
            )}
          </div>

          {/* Common Transform & Layer Actions */}
          <div className="flex items-center gap-1.5 text-xs">
            <label className="flex items-center gap-1 rounded-md border border-[#4A2C24]/15 bg-[#FAF4F0] px-2 py-1 text-[#4A2C24]">
              <span>Tilt:</span>
              <input
                type="range"
                min={-45}
                max={45}
                value={selectedItem.rotation}
                onChange={(e) => onUpdateSelected({ rotation: Number(e.target.value) })}
                className="w-16 accent-[#E11D48]"
              />
              <span className="font-mono-tabular w-8 text-right text-[11px]">
                {selectedItem.rotation}°
              </span>
            </label>

            <button
              type="button"
              onClick={() => onUpdateSelected({ rotation: 0 })}
              title="Straighten (0°)"
              className="rounded-md border border-[#4A2C24]/15 bg-white p-1.5 text-[#4A2C24] hover:bg-[#FFF5F7] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onLayerChange('front')}
              title="Bring forward"
              className="rounded-md border border-[#4A2C24]/15 bg-white p-1.5 text-[#4A2C24] hover:bg-[#FFF5F7] cursor-pointer"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => onLayerChange('back')}
              title="Send backward"
              className="rounded-md border border-[#4A2C24]/15 bg-white p-1.5 text-[#4A2C24] hover:bg-[#FFF5F7] cursor-pointer"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onDuplicateSelected}
              title="Duplicate"
              className="rounded-md border border-[#4A2C24]/15 bg-white p-1.5 text-[#4A2C24] hover:bg-[#FFF5F7] cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onDeleteSelected}
              title="Delete item"
              className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-700 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-[#4A2C24]/15 bg-[#FFFDFB]/85 px-4 py-2 text-xs text-[#6B4B42]">
          Click any photo, GIF, music widget, text box, or sticker to move, resize, tilt, or delete it. Double-click text to edit directly.
        </div>
      )}
    </div>
  );
}
