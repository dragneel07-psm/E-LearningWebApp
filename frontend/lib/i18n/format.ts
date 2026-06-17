// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
import type { Locale } from '@/lib/localization';
import { adToBs, formatBs } from '@/lib/i18n/bs';

const DEVANAGARI = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

function toDevanagari(s: string): string {
  return s.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)]);
}

export function formatNumber(n: number, locale: Locale): string {
  const grouped = n.toLocaleString('en-US'); // stable grouping: 12,500
  return locale === 'ne' ? toDevanagari(grouped) : grouped;
}

export function formatDate(date: Date, locale: Locale): string {
  if (locale === 'ne') {
    const bs = adToBs(date);
    if (bs) return toDevanagari(formatBs(bs));
    if (process.env.NODE_ENV !== 'production') console.warn('[i18n] BS out of range, using AD');
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatCurrency(amount: number, locale: Locale): string {
  return locale === 'ne' ? `रू ${formatNumber(amount, 'ne')}` : `Rs ${formatNumber(amount, 'en')}`;
}
