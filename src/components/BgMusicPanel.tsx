import React, { useRef, useState } from 'react';
import { Music2, Pause, Play, Trash2, Upload, Volume2, X } from 'lucide-react';
import { BackgroundMusicConfig } from '../types/strawpage';
import { parseBackgroundMusicUrl, readAudioFileAsDataUrl } from '../utils/musicEmbed';

interface BgMusicPanelProps {
  bgMusic?: BackgroundMusicConfig;
  isPreviewing: boolean;
  onTogglePreview: () => void;
  onChangeBgMusic: (next: BackgroundMusicConfig | undefined) => void;
  onNotify: (msg: string) => void;
  onClose: () => void;
}

export function BgMusicPanel({
  bgMusic,
  isPreviewing,
  onTogglePreview,
  onChangeBgMusic,
  onNotify,
  onClose,
}: BgMusicPanelProps) {
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { dataUrl, fileNameTitle } = await readAudioFileAsDataUrl(file);
      onChangeBgMusic({
        enabled: true,
        sourceKind: 'audio',
        src: dataUrl,
        title: fileNameTitle,
        volume: bgMusic?.volume ?? 0.6,
      });
      onNotify('Background music uploaded! Visitors will hear it loop automatically.');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Could not read audio file.');
    }
  };

  const handleSetUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBackgroundMusicUrl(urlInput);
    if (!parsed) {
      onNotify('Please enter a valid MP3/audio link or YouTube link.');
      return;
    }
    if ('error' in parsed) {
      onNotify(parsed.error);
      return;
    }
    onChangeBgMusic({
      enabled: true,
      sourceKind: parsed.sourceKind,
      src: parsed.src,
      title: bgMusic?.title || parsed.defaultTitle,
      volume: bgMusic?.volume ?? 0.6,
    });
    setUrlInput('');
    onNotify('Background music link saved!');
  };

  return (
    <div className="rounded-2xl border border-[#4A2C24]/25 bg-[#FFFDFB] p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between border-b border-[#4A2C24]/10 pb-2">
        <div>
          <h3 className="font-coquette text-base font-bold text-[#4A2C24]">
            Page Background Music (Autoplay &amp; Loop)
          </h3>
          <p className="text-[11px] text-[#6B4B42]">
            Plays automatically in a loop whenever visitors enter your page. (If a browser blocks initial sound, it starts on their very first tap/click.)
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close background music panel"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#4A2C24]/15 bg-white text-[#4A2C24] cursor-pointer hover:bg-[#FFF5F7]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Source Upload or Link */}
        <div className="space-y-2.5 rounded-xl border border-[#4A2C24]/15 bg-[#FAF5F3] p-3">
          <div className="text-xs font-bold text-[#4A2C24]">
            1. Choose Background Track
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="sr-only"
            onChange={handleUploadFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E11D48] px-3 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#BE123C]"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Upload MP3 / WAV / M4A (Recommended)</span>
          </button>

          <form onSubmit={handleSetUrl} className="space-y-1.5 pt-1">
            <label className="block text-[11px] font-medium text-[#6B4B42]">
              Or paste direct `.mp3` link / YouTube link
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://.../song.mp3 or YouTube URL"
                className="min-w-0 flex-1 rounded-lg border border-[#4A2C24]/20 bg-white px-2.5 py-1.5 text-xs text-[#4A2C24] outline-none focus:border-[#E11D48]"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#4A2C24] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer hover:bg-[#3A211B]"
              >
                Set
              </button>
            </div>
          </form>
        </div>

        {/* Active BGM Settings */}
        <div className="space-y-2.5 rounded-xl border border-[#4A2C24]/15 bg-[#FAF5F3] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#4A2C24]">
              2. Playback Settings
            </span>
            {bgMusic?.src && (
              <button
                type="button"
                onClick={() => onChangeBgMusic(undefined)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:underline cursor-pointer"
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
                <span>Remove BGM</span>
              </button>
            )}
          </div>

          {bgMusic?.src ? (
            <div className="space-y-2.5 text-xs text-[#4A2C24]">
              <div className="flex items-center gap-2">
                <Music2 className="h-4 w-4 shrink-0 text-[#E11D48]" aria-hidden="true" />
                <input
                  type="text"
                  value={bgMusic.title}
                  onChange={(e) =>
                    onChangeBgMusic({ ...bgMusic, title: e.target.value })
                  }
                  placeholder="Track name shown on mute button"
                  className="min-w-0 flex-1 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-xs text-[#4A2C24]"
                />
              </div>

              {bgMusic.sourceKind === 'audio' && (
                <label className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 shrink-0 text-[#6B4B42]" aria-hidden="true" />
                  <span className="w-12 text-[11px]">Volume:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={bgMusic.volume ?? 0.6}
                    onChange={(e) =>
                      onChangeBgMusic({
                        ...bgMusic,
                        volume: Number(e.target.value),
                      })
                    }
                    className="flex-1 accent-[#E11D48]"
                  />
                  <span className="font-mono-tabular w-9 text-right text-[11px]">
                    {Math.round((bgMusic.volume ?? 0.6) * 100)}%
                  </span>
                </label>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    onChangeBgMusic({ ...bgMusic, enabled: !bgMusic.enabled })
                  }
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer ${
                    bgMusic.enabled
                      ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                      : 'border-[#4A2C24]/20 bg-white text-[#4A2C24]'
                  }`}
                >
                  {bgMusic.enabled ? 'Autoplay & Loop: ON' : 'Autoplay & Loop: OFF'}
                </button>

                <button
                  type="button"
                  onClick={onTogglePreview}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#4A2C24]/20 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#4A2C24] cursor-pointer hover:bg-[#FFE8EE]"
                >
                  {isPreviewing ? (
                    <>
                      <Pause className="h-3 w-3" aria-hidden="true" />
                      <span>Stop Preview</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" aria-hidden="true" />
                      <span>Test Play</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-[#4A2C24]/20 bg-white/70 px-3 text-center text-[11px] text-[#8B6B63]">
              No background song set yet. Upload an MP3 or paste a link on the left to enable looping BGM.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
