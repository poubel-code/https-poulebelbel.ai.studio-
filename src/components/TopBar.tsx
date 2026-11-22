import { Check, Eye, Lock, Pencil, RotateCcw, Save, Share2 } from 'lucide-react';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface TopBarProps {
  isEditMode: boolean;
  isOwner: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  saveStatus: SaveStatus;
  copiedLink: boolean;
  onResetLayout: () => void;
  onCopyShareLink: () => void;
  onSaveNow: () => void;
  onPrimaryAction: () => void;
}

export function TopBar({
  isEditMode,
  isOwner,
  isSaving,
  isPublishing,
  saveStatus,
  copiedLink,
  onResetLayout,
  onCopyShareLink,
  onSaveNow,
  onPrimaryAction,
}: TopBarProps) {
  const statusLabel =
    saveStatus === 'saving'
      ? 'Saving...'
      : saveStatus === 'unsaved'
        ? 'Unsaved changes'
        : saveStatus === 'error'
          ? 'Save failed'
          : 'All saved';

  return (
    <header className="sticky top-0 z-40 border-b border-[#4A2C24]/15 bg-[#FFF9F7]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-4 py-3 sm:px-6">
        {isEditMode ? (
          <nav
            aria-label="Editor navigation"
            className="flex items-center gap-5 text-sm font-medium text-[#6B4B42]"
          >
            <button
              type="button"
              onClick={onResetLayout}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer hover:text-[#4A2C24] hover:underline underline-offset-4"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reset Template</span>
            </button>
            <button
              type="button"
              onClick={onCopyShareLink}
              className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer hover:text-[#4A2C24] hover:underline underline-offset-4"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span className="text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>Copy Share Link</span>
                </>
              )}
            </button>
          </nav>
        ) : (
          <nav
            aria-label="Visitor navigation"
            className="flex items-center gap-6 text-sm font-medium text-[#6B4B42]"
          >
            <button
              type="button"
              onClick={onCopyShareLink}
              className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer hover:text-[#4A2C24] hover:underline underline-offset-4"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                  <span className="text-emerald-700">Link Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                  <span>Copy Share Link</span>
                </>
              )}
            </button>
          </nav>
        )}

        <div className="flex items-center gap-2.5 shrink-0">
          {isEditMode && (
            <>
              <span
                className={`hidden md:inline text-xs font-medium whitespace-nowrap ${
                  saveStatus === 'error'
                    ? 'text-rose-700'
                    : saveStatus === 'saved'
                      ? 'text-emerald-700'
                      : 'text-[#8B6B63]'
                }`}
              >
                {statusLabel}
              </span>

              <button
                type="button"
                onClick={onSaveNow}
                disabled={isSaving || isPublishing}
                title="Save changes (Ctrl+S)"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#4A2C24]/25 bg-white px-3.5 py-2 text-xs font-semibold text-[#4A2C24] whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:bg-[#FFF0F4] disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={isPublishing || isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#4A2C24] px-4 py-2 text-xs font-semibold text-[#FFF8F5] whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:bg-[#361E18] disabled:opacity-60"
          >
            {isEditMode ? (
              <>
                <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{isPublishing ? 'Publishing...' : 'Publish & View'}</span>
              </>
            ) : isOwner ? (
              <>
                <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Edit Canvas</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Owner Edit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
