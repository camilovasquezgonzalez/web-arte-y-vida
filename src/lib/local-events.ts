import type { CulturalEvent, EventSourceResult } from '../types/event';

const localEvents: CulturalEvent[] = [
  {
    id: 'accion-futuro-paisajismo-flora-nativa-2026',
    title: 'Paisajismo y flora nativa para el cuidado de la biodiversidad local',
    description:
      'Charla de Acción Futuro junto a Jocelyn Soto Abarzúa, ingeniera ambiental y paisajista. Conoceremos conceptos básicos de paisajismo y aprenderemos a aplicarlos usando plantas nativas de nuestra zona.',
    startDate: '2026-10-08T17:00:00-03:00',
    time: '17:00',
    venue: 'Casa Taller Arte y Vida',
    locality: 'Pedro León Gallo 547, Coelemu',
    image: '/agenda/charla-accion-futuro-paisajismo-flora-nativa.png',
    source: {
      id: 'arte-y-vida',
      label: 'Arte y Vida',
      url: 'https://arteyvida.cl/agenda',
    },
    program: 'Acción Futuro',
    category: 'Medioambiente',
    free: true,
    status: 'Confirmada',
  },
];

export function getLocalAgenda(): EventSourceResult {
  return {
    items: localEvents,
    status: localEvents.length ? 'ready' : 'empty',
    generatedAt: new Date().toISOString(),
  };
}
