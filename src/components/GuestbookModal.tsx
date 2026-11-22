import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, MessageSquarePlus, PenTool, Send, Trash2, Undo2, X } from 'lucide-react';

export interface ServerGuestbookEntry {
  id: string;
  type: 'doodle' | 'note';
  author: string;
  createdAt: string;
  imageDataUrl?: string;
  message?: string;
  noteTone?: 'cream' | 'blush' | 'sky' | 'butter';
}

interface GuestbookModalProps {
  isOpen: boolean;
  isOwner: boolean;
  ownerToken: string | null;
  onClose: () => void;
}

const PEN_COLORS = ['#4A2C24', '#E11D48', '#2563EB', '#0F766E', '#D97706', '#7C3AED'];
const NOTE_TONES: Array<{ id: 'cream' | 'blush' | 'sky' | 'butter'; label: string; bg: string }> = [
  { id: 'cream', label: 'Cream', bg: 'bg-[#FFFDF5] text-[#4A2C24] border-[#E5DEC9]' },
  { id: 'blush', label: 'Blush', bg: 'bg-[#FFF0F4] text-[#4A2C24] border-[#F3B8C8]' },
  { id: 'butter', label: 'Butter', bg: 'bg-[#FEF9E3] text-[#4A2C24] border-[#EFE0A5]' },
  { id: 'sky', label: 'Sky', bg: 'bg-[#F0F7FF] text-[#1E293B] border-[#C7DDF9]' },
];

export function GuestbookModal({
  isOpen,
  isOwner,
  ownerToken,
  onClose,
}: GuestbookModalProps) {
  const [entries, setEntries] = useState<ServerGuestbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'doodle' | 'note'>('doodle');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#4A2C24');
  const [isEraser, setIsEraser] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [author, setAuthor] = useState('');
  const [noteMessage, setNoteMessage] = useState('');
  const [noteTone, setNoteTone] = useState<'cream' | 'blush' | 'sky' | 'butter'>('blush');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/guestbook');
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        setEntries(data.entries);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadEntries();
      window.setTimeout(initCanvas, 40);
    }
  }, [isOpen, loadEntries, initCanvas]);

  useEffect(() => {
    if (isOpen && tab === 'doodle') {
      window.setTimeout(initCanvas, 20);
    }
  }, [isOpen, tab, initCanvas]);

  if (!isOpen) return null;

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    setHistory((prev) => [...prev.slice(-12), canvas.toDataURL('image/png')]);
    const { x, y } = getPos(e);
    canvas.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isEraser ? '#FFFDF9' : penColor;
    ctx.lineWidth = isEraser ? 14 : 5;
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
      canvasRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
  };

  const handleUndo = () => {
    if (!history.length) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = last;
  };

  const submitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'doodle') {
      if (!hasDrawn || !canvasRef.current) {
        setStatusMsg('Draw something cute first!');
        return;
      }
      const imageDataUrl = canvasRef.current.toDataURL('image/png');
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'doodle', author, imageDataUrl }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries((prev) => [data.entry, ...prev]);
        setAuthor('');
        setHistory([]);
        initCanvas();
        setHasDrawn(false);
        setStatusMsg('Doodle pinned to guestbook!');
      }
    } else {
      if (!noteMessage.trim()) {
        setStatusMsg('Write a short note first!');
        return;
      }
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', author, message: noteMessage, noteTone }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries((prev) => [data.entry, ...prev]);
        setNoteMessage('');
        setAuthor('');
        setStatusMsg('Note posted!');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!ownerToken) return;
    const res = await fetch(`/api/guestbook/${id}`, {
      method: 'DELETE',
      headers: { 'x-owner-token': ownerToken },
    });
    if (res.ok) {
      setEntries((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visitor Guestbook"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-[#4A2C24] bg-[#FFF9F7] text-[#4A2C24] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#4A2C24]/15 px-6 py-4">
          <div>
            <h2 className="font-coquette text-2xl font-bold">Visitor Guestbook &amp; Doodles</h2>
            <p className="text-xs text-[#6B4B42]">
              Leave a little sketch or note for everyone visiting this page
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guestbook"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#4A2C24]/15 bg-white cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-12">
          {/* Left Composer */}
          <div className="md:col-span-5">
            <div className="inline-flex rounded-xl border border-[#4A2C24]/15 bg-white p-1">
              <button
                type="button"
                onClick={() => setTab('doodle')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                  tab === 'doodle' ? 'bg-[#4A2C24] text-white' : 'text-[#6B4B42]'
                }`}
              >
                <PenTool className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Draw Doodle</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('note')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                  tab === 'note' ? 'bg-[#4A2C24] text-white' : 'text-[#6B4B42]'
                }`}
              >
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Leave Note</span>
              </button>
            </div>

            {statusMsg && (
              <p className="mt-3 rounded-lg bg-[#FFEFF4] px-3 py-1.5 text-xs font-medium text-[#9D174D]">
                {statusMsg}
              </p>
            )}

            <form onSubmit={submitEntry} className="mt-3 space-y-3">
              {tab === 'doodle' ? (
                <>
                  <div className="overflow-hidden rounded-xl border-2 border-[#4A2C24]/25 bg-[#FFFDF9]">
                    <canvas
                      ref={canvasRef}
                      width={420}
                      height={300}
                      onPointerDown={handleDown}
                      onPointerMove={handleMove}
                      onPointerUp={handleUp}
                      onPointerCancel={handleUp}
                      className="block aspect-[7/5] w-full touch-none cursor-crosshair"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {PEN_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setIsEraser(false);
                            setPenColor(c);
                          }}
                          className={`h-6 w-6 rounded-full border-2 cursor-pointer ${
                            !isEraser && penColor === c ? 'border-[#E11D48] scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsEraser((v) => !v)}
                        className={`rounded-md border px-2 py-1 text-xs cursor-pointer ${
                          isEraser ? 'bg-[#4A2C24] text-white' : 'bg-white'
                        }`}
                      >
                        <Eraser className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleUndo}
                        className="rounded-md border bg-white px-2 py-1 text-xs cursor-pointer"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <textarea
                    rows={4}
                    maxLength={240}
                    value={noteMessage}
                    onChange={(e) => setNoteMessage(e.target.value)}
                    placeholder="Write a sweet note..."
                    className="w-full rounded-xl border border-[#4A2C24]/20 bg-white p-3 text-sm"
                  />
                  <div className="grid grid-cols-4 gap-1.5">
                    {NOTE_TONES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNoteTone(t.id)}
                        className={`rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer ${t.bg} ${
                          noteTone === t.id ? 'ring-2 ring-[#4A2C24]' : ''
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name..."
                  className="min-w-0 flex-1 rounded-xl border border-[#4A2C24]/20 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#E11D48] px-4 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#BE123C]"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Entries Wall */}
          <div className="md:col-span-7">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-kawaii text-base font-semibold">Pinned by Visitors</h3>
              <span className="font-mono-tabular text-xs text-[#6B4B42]">{entries.length}</span>
            </div>

            {loading ? (
              <p className="text-xs text-[#6B4B42]">Loading guestbook...</p>
            ) : entries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#4A2C24]/25 bg-white p-8 text-center text-xs text-[#6B4B42]">
                No entries yet. Be the first to leave a doodle or note!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {entries.map((item) => {
                  const toneObj =
                    NOTE_TONES.find((t) => t.id === item.noteTone) || NOTE_TONES[0];
                  return (
                    <article
                      key={item.id}
                      className={`rounded-xl border p-3 shadow-xs ${
                        item.type === 'note' ? toneObj.bg : 'bg-white border-[#4A2C24]/15'
                      }`}
                    >
                      {item.type === 'doodle' && item.imageDataUrl ? (
                        <img
                          src={item.imageDataUrl}
                          alt={`Doodle from ${item.author}`}
                          className="aspect-[7/5] w-full rounded-lg border border-black/10 bg-[#FFFDF9] object-contain"
                        />
                      ) : (
                        <p className="font-coquette text-sm leading-relaxed">“{item.message}”</p>
                      )}
                      <div className="mt-2 flex items-center justify-between text-[11px] opacity-75">
                        <span>
                          {item.author} · {item.createdAt}
                        </span>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            aria-label="Delete guestbook item"
                            className="text-rose-600 hover:underline cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
