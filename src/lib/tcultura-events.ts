import type { CulturalEvent } from '../types/event';
import type { TculturaAgendaItem } from './tcultura';
import { formatEventTime } from './events.ts';

// Boundary adapter: presentation never depends on Tcultura field names.
export function normalizeTculturaEvent(item: TculturaAgendaItem): CulturalEvent | null {
  if (!item.title || !Number.isFinite(Date.parse(item.dateIso))) return null;
  const safeUrl = (value: string) => /^https?:\/\//i.test(value) ? value : undefined;
  const url = safeUrl(item.link);
  return {
    id: `${item.type}:${item.id}`,
    title: item.title,
    slug: item.slug,
    endDate: item.endDateIso && Number.isFinite(Date.parse(item.endDateIso)) ? item.endDateIso : undefined,
    locality: item.locality,
    free: item.free,
    price: item.price,
    accessibilityInfo: item.accessibilityInfo,
    description: item.description || undefined,
    startDate: item.dateIso,
    time: formatEventTime(item.dateIso),
    venue: item.location || undefined,
    image: safeUrl(item.image) || (item.image.startsWith('/') && !item.image.startsWith('//') ? item.image : undefined),
    detailUrl: url,
    // Only identify registration when the link explicitly represents that flow.
    registrationUrl: url && /\/inscripcion\//i.test(url) ? url : undefined,
    category: item.category || undefined,
    status: item.status || 'unknown',
    source: { id: 'tcultura', label: 'Tcultura', url: 'https://tcultura.com/eventos/?ciudad=336' },
  };
}
