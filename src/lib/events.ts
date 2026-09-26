import type { CulturalEvent, EventSourceResult } from '../types/event';

export const EVENT_TIME_ZONE = 'America/Santiago';
const dateOptions = { timeZone: EVENT_TIME_ZONE };

export function formatEventDate(value: string) {
  const text = new Intl.DateTimeFormat('es-CL', {
    ...dateOptions, weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(value));
  return (text.charAt(0).toUpperCase() + text.slice(1)).replace(', ', ' ');
}

export const formatEventTime = (value: string) => new Intl.DateTimeFormat('es-CL', {
  ...dateOptions, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).format(new Date(value));

export function upcomingEvents(items: CulturalEvent[], now = Date.now()) {
  return items.filter((event) => Number.isFinite(Date.parse(event.startDate)) && Date.parse(event.startDate) >= now)
    .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate) || a.id.localeCompare(b.id));
}

export function groupEventsByMonth(items: CulturalEvent[]) {
  const groups = new Map<string, { label: string; items: CulturalEvent[] }>();
  for (const event of [...items].sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate))) {
    const parts = new Intl.DateTimeFormat('es-CL', { ...dateOptions, year: 'numeric', month: '2-digit' }).formatToParts(new Date(event.startDate));
    const key = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value.padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, { label: new Intl.DateTimeFormat('es-CL', { ...dateOptions, month: 'long', year: 'numeric' }).format(new Date(event.startDate)), items: [] });
    groups.get(key)!.items.push(event);
  }
  return Array.from(groups, ([key, value]) => ({ key, ...value }));
}

export function eventCategories(items: CulturalEvent[]) {
  return [...new Set(items.map(item => item.category).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, 'es'));
}

export function combineEventSources(results: EventSourceResult[], now = Date.now()): EventSourceResult {
  const items = upcomingEvents(Array.from(new Map(results.flatMap(result => result.items)
    .map(item => [`${item.source.id}:${item.id}`, item])).values()), now);
  const failed = results.some(result => result.status === 'unavailable' || result.status === 'partial');
  return {
    items,
    status: items.length ? (failed ? 'partial' : 'ready') : (failed ? 'unavailable' : 'empty'),
    generatedAt: new Date(now).toISOString(),
  };
}
