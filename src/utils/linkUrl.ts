export function normalizeLinkUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '#') return '';
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';

  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  if (!trimmed.includes('/') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed.replace(/^\/+/, '')}`;
}
