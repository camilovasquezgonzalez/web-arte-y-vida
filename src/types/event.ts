export interface CulturalEvent {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  time: string;
  venue?: string;
  locality?: string;
  image?: string;
  registrationUrl?: string;
  detailUrl?: string;
  source: { id: string; label: string; url: string };
  program?: string;
  category?: string;
  free?: boolean;
  price?: { amount: number; currency: string };
  status: string;
  accessibilityInfo?: string;
}

export type AgendaStatus = 'ready' | 'empty' | 'partial' | 'unavailable';
export interface EventSourceResult {
  items: CulturalEvent[];
  status: AgendaStatus;
  generatedAt: string;
}
export interface EventProvider {
  id: string;
  load: () => Promise<EventSourceResult>;
}
