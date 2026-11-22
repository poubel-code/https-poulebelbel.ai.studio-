import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface OwnerAuthModalProps {
  isOpen: boolean;
  hasPasscode: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export function OwnerAuthModal({
  isOpen,
  hasPasscode,
  onClose,
  onSuccess,
}: OwnerAuthModalProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim().length < 4) {
      setError('Please enter at least 4 characters.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/owner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setError(data.error || 'Could not verify passcode.');
        setSubmitting(false);
        return;
      }
      setPasscode('');
      onSuccess(data.token);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Owner access"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-2xl border-2 border-[#4A2C24] bg-[#FFF9F7] p-6 text-[#4A2C24] shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#4A2C24]/15 bg-white text-[#4A2C24] cursor-pointer hover:bg-[#FFF0F3]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4A2C24] text-[#FFF8F5]">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-coquette text-xl font-bold">
              {hasPasscode ? 'Unlock Owner Edit' : 'Set Owner Passcode'}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[#6B4B42]">
          {hasPasscode
            ? 'Enter your passcode to edit, move, or upload photos on your published page.'
            : 'Create a private passcode (4+ characters) so only you can edit this website while visitors view it cleanly.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            type="password"
            autoFocus
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter passcode..."
            className="w-full rounded-xl border border-[#4A2C24]/25 bg-white px-3.5 py-2.5 text-sm text-[#4A2C24] focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
          />

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#4A2C24] py-2.5 text-sm font-semibold text-[#FFF8F5] cursor-pointer transition-colors hover:bg-[#361E18] disabled:opacity-60"
          >
            {submitting
              ? 'Verifying...'
              : hasPasscode
                ? 'Unlock & Edit Page'
                : 'Save Passcode & Start Editing'}
          </button>
        </form>
      </div>
    </div>
  );
}
