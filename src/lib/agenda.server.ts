import type { EventProvider } from '../types/event';
import { getTculturaAgenda } from './tcultura.ts';
import { normalizeTculturaEvent } from './tcultura-events.ts';
import { combineEventSources } from './events.ts';

// Add providers here; every provider returns the same event and availability contract.
const providers: EventProvider[] = [{
  id: 'tcultura',
  async load() {
    const result = await getTculturaAgenda({ limit: 200 });
    return { ...result, items: result.items.map(normalizeTculturaEvent).filter(item => item !== null) };
  },
}];

export async function getAgenda(limit?: number) {
  const results = await Promise.all(providers.map(async provider => {
    try { return await provider.load(); }
    catch { return { items: [], status: 'unavailable' as const, generatedAt: new Date().toISOString() }; }
  }));
  const result = combineEventSources(results);
  return { ...result, items: limit === undefined ? result.items : result.items.slice(0, limit) };
}
