import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TCULTURA_API_BASE = 'https://tcultura.com/api/b2b/';
const TCULTURA_API_HEADER = 'X-Project-Api-Key';
const TCULTURA_MAX_PAGES = 20;
const TCULTURA_TIME_ZONE = 'America/Santiago';

type RawTculturaItem = Record<string, unknown>;

interface PaginatedResponse {
  next?: string | null;
  results?: RawTculturaItem[];
}

export interface TculturaAgendaItem {
  id: string;
  title: string;
  description: string;
  dateIso: string;
  dateFormatted: string;
  category: string;
  location: string;
  image: string;
  link: string;
  status: string;
  type: 'evento' | 'actividad';
  typeLabel: string;
}

export interface TculturaAgendaResult {
  items: TculturaAgendaItem[];
  error: string | null;
  generatedAt: string;
  source: 'env' | 'file' | 'missing';
}

const API_KEY_FILE_CANDIDATES = [
  path.resolve(process.cwd(), 'TCULTURA_API_KEY.txt'),
  path.resolve(process.cwd(), 'tcultura-connect.2.0.0', 'tcultura-connect', 'TCULTURA_API_KEY.txt'),
];

let apiKeyPromise: Promise<{ key: string; source: 'env' | 'file' | 'missing' }> | null = null;

const readText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = readText(value);
    if (text) return text;
  }

  return '';
};

const describeLocation = (item: RawTculturaItem): string => {
  const direct = firstText(item.location, item.ubicacion, item.lugar, item.venue, item.recinto, item.address);
  if (direct) return direct;

  const commune = firstText(item.comuna, item.ciudad, item.city);
  const region = firstText(item.region, item.state);

  if (commune && region) return `${commune}, ${region}`;
  return commune || region;
};

const describeCategory = (item: RawTculturaItem): string => {
  const direct = firstText(item.category, item.categoria, item.category_name, item.tipo_categoria);
  if (direct) return direct;

  const nestedCategory = item.category_data;
  if (nestedCategory && typeof nestedCategory === 'object') {
    return firstText(
      (nestedCategory as Record<string, unknown>).name,
      (nestedCategory as Record<string, unknown>).nombre,
      (nestedCategory as Record<string, unknown>).title,
    );
  }

  return '';
};

const describeImage = (item: RawTculturaItem): string => {
  const direct = firstText(item.image, item.imagen, item.cover, item.portada, item.banner, item.thumbnail);
  if (direct) return direct;

  const nestedImage = item.image_data;
  if (nestedImage && typeof nestedImage === 'object') {
    return firstText((nestedImage as Record<string, unknown>).url, (nestedImage as Record<string, unknown>).src);
  }

  return '';
};

const describeLink = (item: RawTculturaItem): string =>
  firstText(item.link, item.url, item.url_inscripcion, item.registration_url, item.permalink, item.detalle_url);

const formatDate = (dateIso: string): string => {
  if (!dateIso) return '';

  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.valueOf())) return '';

  return new Intl.DateTimeFormat('es-CL', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TCULTURA_TIME_ZONE,
  }).format(parsed);
};

const normalizeItem = (item: RawTculturaItem, type: 'evento' | 'actividad'): TculturaAgendaItem | null => {
  const title = firstText(item.title, item.nombre, item.name);
  if (!title) return null;

  const dateIso = firstText(item.date_iso, item.fecha_inicio, item.fecha, item.start_date, item.fecha_evento);
  const dateFormatted = firstText(item.date_formatted, item.fecha_formateada, formatDate(dateIso));

  return {
    id: firstText(item.id, item.uuid, `${type}-${title}-${dateIso}`),
    title,
    description: firstText(item.description, item.descripcion, item.summary, item.resumen),
    dateIso,
    dateFormatted,
    category: describeCategory(item),
    location: describeLocation(item),
    image: describeImage(item),
    link: describeLink(item),
    status: firstText(item.status, item.estado, 'DISPONIBLE'),
    type,
    typeLabel: type === 'evento' ? 'Evento' : 'Actividad',
  };
};

const resolveApiKey = async () => {
  if (apiKeyPromise) return apiKeyPromise;

  apiKeyPromise = (async () => {
    const envKey = readText(process.env.TCULTURA_API_KEY);
    if (envKey) return { key: envKey, source: 'env' as const };

    for (const candidate of API_KEY_FILE_CANDIDATES) {
      try {
        const fileContents = await readFile(candidate, 'utf8');
        const fileKey = fileContents.trim();
        if (fileKey) return { key: fileKey, source: 'file' as const };
      } catch {
        // Try the next candidate.
      }
    }

    return { key: '', source: 'missing' as const };
  })();

  return apiKeyPromise;
};

const fetchPaginated = async (endpoint: string, apiKey: string): Promise<RawTculturaItem[]> => {
  let nextUrl = new URL(endpoint, TCULTURA_API_BASE).toString();
  let page = 1;
  const items: RawTculturaItem[] = [];

  while (nextUrl && page <= TCULTURA_MAX_PAGES) {
    const response = await fetch(nextUrl, {
      headers: {
        [TCULTURA_API_HEADER]: apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TCULTURA respondió con HTTP ${response.status} en ${endpoint}`);
    }

    const data = (await response.json()) as PaginatedResponse;
    if (Array.isArray(data.results)) items.push(...data.results);

    nextUrl = typeof data.next === 'string' && data.next ? data.next : '';
    page += 1;
  }

  return items;
};

const isUpcoming = (item: TculturaAgendaItem): boolean => {
  if (!item.dateIso) return true;
  const timestamp = new Date(item.dateIso).valueOf();
  if (Number.isNaN(timestamp)) return true;
  return timestamp >= Date.now() - 60 * 60 * 1000;
};

export const getTculturaAgenda = async (
  options: { limit?: number } = {},
): Promise<TculturaAgendaResult> => {
  const generatedAt = new Date().toISOString();
  const { key, source } = await resolveApiKey();
  const limit = typeof options.limit === 'number' ? options.limit : 6;

  if (!key) {
    return {
      items: [],
      error: 'La cartelera no está disponible en este momento.',
      generatedAt,
      source,
    };
  }

  try {
    const settled = await Promise.allSettled([fetchPaginated('eventos/', key), fetchPaginated('actividades/', key)]);

    const items = settled.flatMap((result, index) => {
      if (result.status !== 'fulfilled') return [];
      const type = index === 0 ? 'evento' : 'actividad';

      return result.value
        .map((item) => normalizeItem(item, type))
        .filter((item): item is TculturaAgendaItem => Boolean(item));
    });

    if (!items.length) {
      return {
        items: [],
        error: 'La cartelera no tiene actividades disponibles para mostrar en este momento.',
        generatedAt,
        source,
      };
    }

    const upcomingItems = items
      .filter(isUpcoming)
      .sort((a, b) => new Date(a.dateIso).valueOf() - new Date(b.dateIso).valueOf())
      .slice(0, limit);

    return {
      items: upcomingItems,
      error: upcomingItems.length ? null : 'No hay eventos próximos publicados para este proyecto.',
      generatedAt,
      source,
    };
  } catch {
    return {
      items: [],
      error: 'No pudimos actualizar la cartelera en este momento.',
      generatedAt,
      source,
    };
  }
};
