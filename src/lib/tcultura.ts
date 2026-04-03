import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TCULTURA_API_BASE = 'https://tcultura.com/api/b2b/';
const TCULTURA_PUBLIC_URL = 'https://tcultura.com/eventos/?ciudad=336&vista=actividades';
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
  source: 'env' | 'file' | 'missing' | 'public';
}

interface PublicTculturaCard extends TculturaAgendaItem {
  badge: string;
  organizer: string;
}

const fallbackAgendaItems: TculturaAgendaItem[] = [
  {
    id: '5e3b7b33-96db-4c06-93c0-ca3ee8e3f21c',
    title: 'La Pasion de Cristo',
    description:
      'Exhibicion especial de Semana Santa dentro de la cartelera de Reactivemos el Teatro en Coelemu.',
    dateIso: '2026-04-10T19:00:00-04:00',
    dateFormatted: '',
    category: 'Funcion de cine',
    location: 'Teatro de Coelemu',
    image: 'https://stg.datacultura.org/media/eventos/actividades/ChatGPT_Image_Mar_26_2026_03_41_04_PM.png',
    link: 'https://tcultura.com/eventos/inscripcion/reactivemos-el-teatro-mes-de-abril/?instancia_id=5e3b7b33-96db-4c06-93c0-ca3ee8e3f21c',
    status: 'DISPONIBLE',
    type: 'actividad',
    typeLabel: 'Actividad',
  },
  {
    id: '3fad8f4e-cd4e-4ba9-bbca-c77e23dfe0bb',
    title: 'Cocharcas Latinoamericano',
    description: 'Concierto abierto a la comunidad dentro de la cartelera de abril de Reactivemos el Teatro.',
    dateIso: '2026-04-17T19:00:00-04:00',
    dateFormatted: '',
    category: 'Concierto',
    location: 'Teatro de Coelemu',
    image: 'https://stg.datacultura.org/media/eventos/actividades/FOTO_1.jpg',
    link: 'https://tcultura.com/eventos/inscripcion/reactivemos-el-teatro-mes-de-abril/?instancia_id=3fad8f4e-cd4e-4ba9-bbca-c77e23dfe0bb',
    status: 'DISPONIBLE',
    type: 'actividad',
    typeLabel: 'Actividad',
  },
  {
    id: 'b8e27922-79d7-4567-b2e6-35cbcb8b9ee0',
    title: 'El Origen Extraterrestre de la Vida',
    description:
      'Charla de cierre de abril a cargo del astrofisico Ricardo Demarco Lopez en Reactivemos el Teatro.',
    dateIso: '2026-04-24T19:00:00-04:00',
    dateFormatted: '',
    category: 'Charla / Conferencia',
    location: 'Teatro de Coelemu',
    image: 'https://stg.datacultura.org/media/eventos/actividades/Cartelera_Mensual_Abril-22_1.png',
    link: 'https://tcultura.com/eventos/inscripcion/reactivemos-el-teatro-mes-de-abril/?instancia_id=b8e27922-79d7-4567-b2e6-35cbcb8b9ee0',
    status: 'DISPONIBLE',
    type: 'actividad',
    typeLabel: 'Actividad',
  },
];

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

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&hellip;/g, '...')
    .replace(/&aacute;/gi, 'a')
    .replace(/&eacute;/gi, 'e')
    .replace(/&iacute;/gi, 'i')
    .replace(/&oacute;/gi, 'o')
    .replace(/&uacute;/gi, 'u')
    .replace(/&ntilde;/gi, 'n');

const stripTags = (value: string): string => decodeHtmlEntities(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const absoluteTculturaUrl = (value: string): string => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `https://tcultura.com${value}`;
  return `https://tcultura.com/${value.replace(/^\/+/, '')}`;
};

const extractText = (block: string, pattern: RegExp): string => stripTags(block.match(pattern)?.[1] ?? '');

const extractAttribute = (block: string, pattern: RegExp): string => decodeHtmlEntities(block.match(pattern)?.[1] ?? '').trim();

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

const normalizeTypeLabel = (item: RawTculturaItem, type: 'evento' | 'actividad'): string => {
  const direct = firstText(item.type, item.tipo, item.kind);
  if (direct) return direct;
  return type === 'evento' ? 'Evento' : 'Actividad';
};

const normalizeItem = (item: RawTculturaItem, type: 'evento' | 'actividad'): TculturaAgendaItem | null => {
  const title = firstText(item.title, item.nombre, item.name);
  if (!title) return null;

  const dateIso = firstText(item.date_iso, item.fecha_inicio, item.fecha, item.start_date, item.fecha_evento);
  const dateFormatted = formatDate(dateIso) || firstText(item.date_formatted, item.fecha_formateada);

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
    typeLabel: normalizeTypeLabel(item, type),
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
      throw new Error(`TCULTURA respondio con HTTP ${response.status} en ${endpoint}`);
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

const normalizePublicCard = (block: string): PublicTculturaCard | null => {
  const title =
    extractText(block, /<h3[^>]*class="event-card-title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i) ||
    extractAttribute(block, /<img[^>]+alt="([^"]+)"/i);

  if (!title) return null;

  const day = extractText(block, /<div class="text-2xl leading-none">([^<]+)<\/div>/i);
  const month = extractText(block, /<div class="text-xs uppercase mt-1 opacity-80">([^<]+)<\/div>/i);
  const time = extractText(block, /<div class="text-xs mt-1 opacity-90">([^<]+)<\/div>/i);
  const dateFormatted = [day, month, time].filter(Boolean).join(' · ');
  const detailPath = extractAttribute(block, /window\.location\.href='([^']+)'/i);
  const organizer = extractText(block, /<p[^>]*class="text-xs mb-2 truncate"[^>]*>([\s\S]*?)<\/p>/i);
  const badge = extractText(block, /<div class="absolute top-3 left-3[\s\S]*?<svg[\s\S]*?<\/svg>\s*([\s\S]*?)<\/div>/i);

  return {
    id: detailPath.split('/').filter(Boolean).pop() ?? `public-${normalizeSearchText(title)}`,
    title,
    description: extractText(block, /<p[^>]*class="event-card-description[^"]*"[^>]*>([\s\S]*?)<\/p>/i),
    dateIso: '',
    dateFormatted,
    category: extractText(block, /<div class="text-sm font-semibold"[^>]*>([\s\S]*?)<\/div>/i),
    location: extractText(block, /<span class="truncate">([\s\S]*?)<\/span>/i),
    image: absoluteTculturaUrl(extractAttribute(block, /<img[^>]+src="([^"]+)"/i)),
    link: absoluteTculturaUrl(detailPath),
    status: 'DISPONIBLE',
    type: 'actividad',
    typeLabel: 'Actividad',
    badge,
    organizer,
  };
};

const isProjectPublicCard = (item: PublicTculturaCard): boolean => {
  const haystack = normalizeSearchText([item.badge, item.organizer, item.location, item.title].join(' '));
  return haystack.includes('reactivemos');
};

const fetchPublicAgenda = async (limit: number): Promise<TculturaAgendaItem[]> => {
  try {
    const response = await fetch(TCULTURA_PUBLIC_URL, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) return [];

    const html = await response.text();
    const matches = Array.from(html.matchAll(/<article class="card-tcultura-event[\s\S]*?<\/article>/g));
    const items = matches
      .map((match) => normalizePublicCard(match[0]))
      .filter((item): item is PublicTculturaCard => Boolean(item))
      .filter(isProjectPublicCard);

    const deduped = new Map<string, TculturaAgendaItem>();
    for (const item of items) {
      if (!deduped.has(item.id)) {
        deduped.set(item.id, item);
      }
    }

    return Array.from(deduped.values()).slice(0, limit);
  } catch {
    return [];
  }
};

const getFallbackAgenda = (limit: number): TculturaAgendaItem[] =>
  fallbackAgendaItems.slice(0, limit).map((item) => ({
    ...item,
    dateFormatted: formatDate(item.dateIso) || item.dateFormatted,
  }));

export const getTculturaAgenda = async (
  options: { limit?: number } = {},
): Promise<TculturaAgendaResult> => {
  const generatedAt = new Date().toISOString();
  const { key, source } = await resolveApiKey();
  const limit = typeof options.limit === 'number' ? options.limit : 6;

  if (!key) {
    const publicItems = await fetchPublicAgenda(limit);
    if (publicItems.length) {
      return {
        items: publicItems,
        error: null,
        generatedAt,
        source: 'public',
      };
    }

    const fallbackItems = getFallbackAgenda(limit);
    return {
      items: fallbackItems,
      error: fallbackItems.length ? null : 'La cartelera no esta disponible en este momento.',
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

    const upcomingItems = items
      .filter(isUpcoming)
      .sort((a, b) => {
        if (!a.dateIso && !b.dateIso) return 0;
        if (!a.dateIso) return 1;
        if (!b.dateIso) return -1;
        return new Date(a.dateIso).valueOf() - new Date(b.dateIso).valueOf();
      })
      .slice(0, limit);

    if (upcomingItems.length) {
      return {
        items: upcomingItems,
        error: null,
        generatedAt,
        source,
      };
    }

    const publicItems = await fetchPublicAgenda(limit);
    if (publicItems.length) {
      return {
        items: publicItems,
        error: null,
        generatedAt,
        source: 'public',
      };
    }

    const fallbackItems = getFallbackAgenda(limit);
    return {
      items: fallbackItems,
      error: fallbackItems.length ? null : 'No hay eventos proximos publicados para este proyecto.',
      generatedAt,
      source: fallbackItems.length ? 'public' : source,
    };
  } catch {
    const publicItems = await fetchPublicAgenda(limit);
    if (publicItems.length) {
      return {
        items: publicItems,
        error: null,
        generatedAt,
        source: 'public',
      };
    }

    const fallbackItems = getFallbackAgenda(limit);
    return {
      items: fallbackItems,
      error: fallbackItems.length ? null : 'No pudimos actualizar la cartelera en este momento.',
      generatedAt,
      source: fallbackItems.length ? 'public' : source,
    };
  }
};
