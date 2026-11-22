import React, { useRef } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { BackdropPattern, BackgroundConfig } from '../types/strawpage';
import { compressImageFile } from '../utils/imageOptimize';

interface BackgroundPanelProps {
  outerBg: BackgroundConfig;
  canvasBg: BackgroundConfig;
  borderColor: string;
  showHeader: boolean;
  showFooter: boolean;
  onChangeOuterBg: (next: BackgroundConfig) => void;
  onChangeCanvasBg: (next: BackgroundConfig) => void;
  onChangeBorderColor: (color: string) => void;
  onToggleHeader: () => void;
  onToggleFooter: () => void;
  onClose: () => void;
}

const PATTERN_OPTIONS: Array<{ id: BackdropPattern; label: string }> = [
  { id: 'dots', label: 'Polka Dots' },
  { id: 'gingham', label: 'Gingham' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'grid', label: 'Grid' },
  { id: 'solid', label: 'Solid Color' },
];

export function BackgroundPanel({
  outerBg,
  canvasBg,
  borderColor,
  showHeader,
  showFooter,
  onChangeOuterBg,
  onChangeCanvasBg,
  onChangeBorderColor,
  onToggleHeader,
  onToggleFooter,
  onClose,
}: BackgroundPanelProps) {
  const outerImgRef = useRef<HTMLInputElement | null>(null);
  const canvasImgRef = useRef<HTMLInputElement | null>(null);

  const handleUploadBgImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    current: BackgroundConfig,
    onUpdate: (next: BackgroundConfig) => void
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const result = await compressImageFile(file, 1400);
      onUpdate({
        ...current,
        pattern: 'image',
        imageUrl: result.dataUrl,
        imageFit: current.imageFit || 'cover',
      });
    } catch {
      // Ignore invalid image
    }
  };

  return (
    <div className="rounded-2xl border border-[#4A2C24]/25 bg-[#FFFDFB] p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between border-b border-[#4A2C24]/10 pb-2">
        <div>
          <h3 className="font-coquette text-base font-bold text-[#4A2C24]">
            Customize Backgrounds &amp; Page Frame
          </h3>
          <p className="text-[11px] text-[#6B4B42]">
            Change the outer dotted area, inner paper background, border color, or upload your own wallpaper
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close background panel"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#4A2C24]/15 bg-white text-[#4A2C24] cursor-pointer hover:bg-[#FFF5F7]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Outer Dotted Backdrop Controls */}
        <div className="space-y-2.5 rounded-xl border border-[#4A2C24]/15 bg-[#FAF5F3] p-3">
          <div className="text-xs font-bold text-[#4A2C24]">
            1. Outer Background (Dotted Area)
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PATTERN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeOuterBg({ ...outerBg, pattern: opt.id })}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                  outerBg.pattern === opt.id
                    ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                    : 'border-[#4A2C24]/20 bg-white text-[#4A2C24]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#4A2C24]">
            <label className="flex items-center gap-1.5">
              <span>Base:</span>
              <input
                type="color"
                value={outerBg.color}
                onChange={(e) => onChangeOuterBg({ ...outerBg, color: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-[#4A2C24]/20 bg-white p-0.5"
              />
            </label>

            {outerBg.pattern !== 'solid' && outerBg.pattern !== 'image' && (
              <label className="flex items-center gap-1.5">
                <span>Dots/Lines:</span>
                <input
                  type="color"
                  value={outerBg.patternColor}
                  onChange={(e) =>
                    onChangeOuterBg({ ...outerBg, patternColor: e.target.value })
                  }
                  className="h-6 w-8 cursor-pointer rounded border border-[#4A2C24]/20 bg-white p-0.5"
                />
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              ref={outerImgRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleUploadBgImage(e, outerBg, onChangeOuterBg)}
            />
            <button
              type="button"
              onClick={() => outerImgRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#E11D48] px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer hover:bg-[#BE123C]"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Upload Photo / GIF</span>
            </button>

            {outerBg.pattern === 'image' && outerBg.imageUrl && (
              <>
                <select
                  value={outerBg.imageFit || 'cover'}
                  onChange={(e) =>
                    onChangeOuterBg({
                      ...outerBg,
                      imageFit: e.target.value as 'cover' | 'repeat',
                    })
                  }
                  className="rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-[11px]"
                >
                  <option value="cover">Full Cover</option>
                  <option value="repeat">Tile / Repeat</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onChangeOuterBg({ ...outerBg, pattern: 'dots', imageUrl: undefined })
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-[11px] text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inner Page Canvas Controls */}
        <div className="space-y-2.5 rounded-xl border border-[#4A2C24]/15 bg-[#FAF5F3] p-3">
          <div className="text-xs font-bold text-[#4A2C24]">
            2. Inner Page Background (Scrapbook Area)
          </div>

          <div className="flex flex-wrap gap-1.5">
            {PATTERN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeCanvasBg({ ...canvasBg, pattern: opt.id })}
                className={`rounded-md border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                  canvasBg.pattern === opt.id
                    ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
                    : 'border-[#4A2C24]/20 bg-white text-[#4A2C24]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-[#4A2C24]">
            <label className="flex items-center gap-1.5">
              <span>Paper:</span>
              <input
                type="color"
                value={canvasBg.color}
                onChange={(e) => onChangeCanvasBg({ ...canvasBg, color: e.target.value })}
                className="h-6 w-8 cursor-pointer rounded border border-[#4A2C24]/20 bg-white p-0.5"
              />
            </label>

            {canvasBg.pattern !== 'solid' && canvasBg.pattern !== 'image' && (
              <label className="flex items-center gap-1.5">
                <span>Dots/Lines:</span>
                <input
                  type="color"
                  value={canvasBg.patternColor}
                  onChange={(e) =>
                    onChangeCanvasBg({ ...canvasBg, patternColor: e.target.value })
                  }
                  className="h-6 w-8 cursor-pointer rounded border border-[#4A2C24]/20 bg-white p-0.5"
                />
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              ref={canvasImgRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleUploadBgImage(e, canvasBg, onChangeCanvasBg)}
            />
            <button
              type="button"
              onClick={() => canvasImgRef.current?.click()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#E11D48] px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer hover:bg-[#BE123C]"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Upload Paper / GIF</span>
            </button>

            {canvasBg.pattern === 'image' && canvasBg.imageUrl && (
              <>
                <select
                  value={canvasBg.imageFit || 'cover'}
                  onChange={(e) =>
                    onChangeCanvasBg({
                      ...canvasBg,
                      imageFit: e.target.value as 'cover' | 'repeat',
                    })
                  }
                  className="rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-[11px]"
                >
                  <option value="cover">Full Cover</option>
                  <option value="repeat">Tile / Repeat</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onChangeCanvasBg({ ...canvasBg, pattern: 'dots', imageUrl: undefined })
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-[#4A2C24]/20 bg-white px-2 py-1 text-[11px] text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Border & Header/Footer Toggles */}
      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#4A2C24]/10 pt-3 text-xs text-[#4A2C24]">
        <label className="flex items-center gap-1.5 font-medium">
          <span>Page Border:</span>
          <input
            type="color"
            value={borderColor}
            onChange={(e) => onChangeBorderColor(e.target.value)}
            className="h-6 w-8 cursor-pointer rounded border border-[#4A2C24]/20 bg-white p-0.5"
          />
        </label>

        <button
          type="button"
          onClick={onToggleHeader}
          className={`rounded-lg border px-3 py-1.5 font-medium cursor-pointer ${
            showHeader
              ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
              : 'border-[#4A2C24]/20 bg-white text-[#4A2C24]'
          }`}
        >
          {showHeader ? 'Top Banner: Shown' : 'Top Banner: Hidden'}
        </button>

        <button
          type="button"
          onClick={onToggleFooter}
          className={`rounded-lg border px-3 py-1.5 font-medium cursor-pointer ${
            showFooter
              ? 'border-[#4A2C24] bg-[#4A2C24] text-white'
              : 'border-[#4A2C24]/20 bg-white text-[#4A2C24]'
          }`}
        >
          {showFooter ? 'Bottom Bar: Shown' : 'Bottom Bar: Hidden'}
        </button>
      </div>
    </div>
  );
}
