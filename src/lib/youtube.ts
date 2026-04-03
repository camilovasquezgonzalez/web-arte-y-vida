import { curatedYouTubePlaylists } from './youtube-curated';

export type YouTubeVideoItem = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
};

export type YouTubePlaylistItem = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  videoCount: number;
  playlistUrl: string;
  videos: YouTubeVideoItem[];
};

type UnknownRecord = Record<string, unknown>;

const apiKey = import.meta.env.YOUTUBE_API_KEY;
const explicitChannelId = import.meta.env.YOUTUBE_CHANNEL_ID;
const fallbackChannelId = 'UC4H2VHO5BN36TvnQwUWYPKg';
const channelHandle = '@corparteyvida';
const channelUrl = 'https://www.youtube.com/@corparteyvida';
const curatedFallbackPlaylists: YouTubePlaylistItem[] = curatedYouTubePlaylists.map((playlist) => ({
  ...playlist,
  videos: playlist.videos.map((video) => ({ ...video })),
}));
const curatedFallbackVideos: YouTubeVideoItem[] = Array.from(
  new Map(
    curatedFallbackPlaylists
      .flatMap((playlist) => playlist.videos)
      .map((video) => [video.id, { ...video }] as const),
  ).values(),
);

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const readRenderedText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (!isRecord(value)) return '';

  const simpleText = readText(value.simpleText);
  if (simpleText) return simpleText;

  if (Array.isArray(value.runs)) {
    return value.runs
      .map((run) => (isRecord(run) ? readText(run.text) : ''))
      .join('')
      .trim();
  }

  return '';
};

const readThumbnail = (snippet: any) =>
  snippet?.thumbnails?.high?.url ??
  snippet?.thumbnails?.medium?.url ??
  snippet?.thumbnails?.default?.url ??
  '';

const decodeXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const matchXml = (block: string, pattern: RegExp) => decodeXml(block.match(pattern)?.[1] ?? '');

const readThumbnailFromNode = (value: unknown): string => {
  if (!value) return '';

  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const url = readThumbnailFromNode(value[index]);
      if (url) return url;
    }
    return '';
  }

  if (!isRecord(value)) return '';

  const directUrl = readText(value.url);
  if (directUrl.startsWith('http')) return directUrl;

  if (Array.isArray(value.thumbnails)) {
    const url = readThumbnailFromNode(value.thumbnails);
    if (url) return url;
  }

  for (const key of ['maxres', 'standard', 'high', 'medium', 'default']) {
    if (key in value) {
      const url = readThumbnailFromNode(value[key]);
      if (url) return url;
    }
  }

  for (const nestedValue of Object.values(value)) {
    const url = readThumbnailFromNode(nestedValue);
    if (url) return url;
  }

  return '';
};

const countTextToNumber = (value: string): number => {
  const digits = value.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};

const collectValuesByKey = (value: unknown, key: string, results: unknown[] = []): unknown[] => {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectValuesByKey(entry, key, results));
    return results;
  }

  if (!isRecord(value)) return results;

  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (entryKey === key) {
      results.push(entryValue);
    }
    collectValuesByKey(entryValue, key, results);
  }

  return results;
};

const extractJsonAfterMarker = (html: string, marker: string): string => {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return '';

  const start = html.indexOf('{', markerIndex);
  if (start < 0) return '';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < html.length; index += 1) {
    const char = html[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;

    if (depth === 0) {
      return html.slice(start, index + 1);
    }
  }

  return '';
};

const parseYouTubeInitialData = (html: string): unknown => {
  const jsonPayload =
    extractJsonAfterMarker(html, 'var ytInitialData =') ||
    extractJsonAfterMarker(html, 'window["ytInitialData"] =') ||
    extractJsonAfterMarker(html, 'ytInitialData =');

  if (!jsonPayload) return null;

  try {
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const fetchPublicYouTubePage = async (url: string): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
      'User-Agent': 'Mozilla/5.0',
    },
  });

  if (!response.ok) return '';
  return response.text();
};

const parseFeedVideos = (xml: string, maxResults: number): YouTubeVideoItem[] => {
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).slice(0, maxResults);

  return entries
    .map((entry) => {
      const block = entry[1] ?? '';
      const id = matchXml(block, /<yt:videoId>([^<]+)<\/yt:videoId>/);
      const thumbnail =
        block.match(/<media:thumbnail[^>]*url="([^"]+)"/)?.[1] ??
        block.match(/<media:thumbnail[^>]*url='([^']+)'/)?.[1] ??
        (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');

      return {
        id,
        title: matchXml(block, /<title>([\s\S]*?)<\/title>/),
        thumbnail,
        publishedAt: matchXml(block, /<published>([^<]+)<\/published>/),
      };
    })
    .filter((video) => Boolean(video.id) && Boolean(video.thumbnail));
};

const fetchChannelId = async (): Promise<string | null> => {
  if (explicitChannelId) return explicitChannelId as string;
  if (!apiKey) return fallbackChannelId;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=id&maxResults=1&type=channel&q=${encodeURIComponent(channelHandle)}&key=${apiKey}`,
    );
    if (!res.ok) return fallbackChannelId;

    const data = await res.json();
    const foundId = data?.items?.[0]?.id?.channelId;
    return typeof foundId === 'string' ? foundId : fallbackChannelId;
  } catch {
    return fallbackChannelId;
  }
};

const fetchLatestVideosFromApi = async (channelId: string, maxResults: number): Promise<YouTubeVideoItem[]> => {
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${maxResults}&order=date&type=video&key=${apiKey}`,
    );
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.items ?? [])
      .map((item: any) => ({
        id: item?.id?.videoId ?? '',
        title: item?.snippet?.title ?? 'Video',
        thumbnail: readThumbnail(item?.snippet),
        publishedAt: item?.snippet?.publishedAt ?? '',
      }))
      .filter((video: YouTubeVideoItem) => Boolean(video.id) && Boolean(video.thumbnail));
  } catch {
    return [];
  }
};

const fetchLatestVideosFromFeed = async (channelId: string, maxResults: number): Promise<YouTubeVideoItem[]> => {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
      headers: { Accept: 'application/atom+xml,application/xml,text/xml' },
    });
    if (!res.ok) return [];

    const xml = await res.text();
    return parseFeedVideos(xml, maxResults);
  } catch {
    return [];
  }
};

const fetchLatestVideos = async (channelId: string, maxResults: number): Promise<YouTubeVideoItem[]> => {
  const apiVideos = await fetchLatestVideosFromApi(channelId, maxResults);
  if (apiVideos.length) return apiVideos;

  return fetchLatestVideosFromFeed(channelId, maxResults);
};

const fetchPlaylistVideos = async (playlistId: string, maxResults: number): Promise<YouTubeVideoItem[]> => {
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${apiKey}`,
    );
    if (!res.ok) return [];

    const data = await res.json();
    return (data?.items ?? [])
      .map((item: any) => ({
        id: item?.snippet?.resourceId?.videoId ?? '',
        title: item?.snippet?.title ?? 'Video',
        thumbnail: readThumbnail(item?.snippet),
        publishedAt: item?.snippet?.publishedAt ?? '',
      }))
      .filter((video: YouTubeVideoItem) => Boolean(video.id) && Boolean(video.thumbnail));
  } catch {
    return [];
  }
};

const fetchPlaylists = async (channelId: string, maxResults: number): Promise<YouTubePlaylistItem[]> => {
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${channelId}&maxResults=${maxResults}&key=${apiKey}`,
    );
    if (!res.ok) return [];

    const data = await res.json();
    const playlistBase = (data?.items ?? [])
      .map((item: any) => ({
        id: item?.id ?? '',
        title: item?.snippet?.title ?? 'Proyecto',
        description: item?.snippet?.description ?? '',
        thumbnail: readThumbnail(item?.snippet),
        publishedAt: item?.snippet?.publishedAt ?? '',
        videoCount: Number(item?.contentDetails?.itemCount ?? 0),
        playlistUrl: item?.id ? `https://www.youtube.com/playlist?list=${item.id}` : channelUrl,
        videos: [] as YouTubeVideoItem[],
      }))
      .filter((playlist: YouTubePlaylistItem) => Boolean(playlist.id));

    const playlistsWithVideos = await Promise.all(
      playlistBase.map(async (playlist) => ({
        ...playlist,
        videos: await fetchPlaylistVideos(playlist.id, 6),
      })),
    );

    return playlistsWithVideos.filter((playlist) => playlist.videos.length > 0);
  } catch {
    return [];
  }
};

const extractPlaylistsFromPublicData = (data: unknown, maxResults: number): YouTubePlaylistItem[] => {
  const playlists = new Map<string, YouTubePlaylistItem>();

  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (!isRecord(node)) return;

    const directPlaylistId = readText(node.playlistId);
    const navigationEndpoint = isRecord(node.navigationEndpoint) ? node.navigationEndpoint : null;
    const watchEndpoint =
      navigationEndpoint && isRecord(navigationEndpoint.watchEndpoint) ? navigationEndpoint.watchEndpoint : null;
    const onTap = isRecord(node.onTap) ? node.onTap : null;
    const innertubeCommand =
      onTap && isRecord(onTap.innertubeCommand) ? onTap.innertubeCommand : null;
    const tapWatchEndpoint =
      innertubeCommand && isRecord(innertubeCommand.watchEndpoint) ? innertubeCommand.watchEndpoint : null;

    const playlistId = directPlaylistId || readText(watchEndpoint?.playlistId) || readText(tapWatchEndpoint?.playlistId);
    const title = readRenderedText(node.title);
    const directVideoId = readText(node.videoId);
    const videoCount =
      countTextToNumber(readRenderedText(node.videoCountText)) ||
      countTextToNumber(readRenderedText(node.videoCountShortText)) ||
      countTextToNumber(readRenderedText(node.thumbnailText));

    if (playlistId && title && !directVideoId && !playlists.has(playlistId)) {
      playlists.set(playlistId, {
        id: playlistId,
        title,
        description: readRenderedText(node.descriptionText) || readRenderedText(node.descriptionSnippet),
        thumbnail: readThumbnailFromNode(node.thumbnail),
        publishedAt: '',
        videoCount,
        playlistUrl: `https://www.youtube.com/playlist?list=${playlistId}`,
        videos: [],
      });
    }

    Object.values(node).forEach(visit);
  };

  visit(data);

  return Array.from(playlists.values()).slice(0, maxResults);
};

const fetchPlaylistVideosFromPublicPage = async (playlistId: string, maxResults: number): Promise<YouTubeVideoItem[]> => {
  try {
    const html = await fetchPublicYouTubePage(`https://www.youtube.com/playlist?list=${playlistId}`);
    if (!html) return [];

    const data = parseYouTubeInitialData(html);
    if (!data) return [];

    return collectValuesByKey(data, 'playlistVideoRenderer')
      .map((entry) => {
        if (!isRecord(entry)) return null;

        const id = readText(entry.videoId);
        const title = readRenderedText(entry.title);
        const thumbnail = readThumbnailFromNode(entry.thumbnail) || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
        const publishedAt = readRenderedText(entry.publishedTimeText);

        if (!id || !title || !thumbnail) return null;

        return {
          id,
          title,
          thumbnail,
          publishedAt,
        } as YouTubeVideoItem;
      })
      .filter((video): video is YouTubeVideoItem => Boolean(video))
      .slice(0, maxResults);
  } catch {
    return [];
  }
};

const fetchPlaylistsFromPublicPages = async (channelId: string, maxResults: number): Promise<YouTubePlaylistItem[]> => {
  try {
    const html = await fetchPublicYouTubePage(
      `https://www.youtube.com/channel/${channelId}/playlists?view=1&sort=dd&shelf_id=0`,
    );
    if (!html) return [];

    const data = parseYouTubeInitialData(html);
    if (!data) return [];

    const playlistBase = extractPlaylistsFromPublicData(data, maxResults);
    if (!playlistBase.length) return [];

    const playlistsWithVideos = await Promise.all(
      playlistBase.map(async (playlist) => {
        const videos = await fetchPlaylistVideosFromPublicPage(playlist.id, 6);
        return {
          ...playlist,
          thumbnail: playlist.thumbnail || videos[0]?.thumbnail || '',
          videos,
        };
      }),
    );

    return playlistsWithVideos.filter((playlist) => playlist.videos.length > 0);
  } catch {
    return [];
  }
};

const buildChannelSelections = (videos: YouTubeVideoItem[], playlistLimit: number): YouTubePlaylistItem[] => {
  if (!videos.length) return [];

  const labels = [
    {
      title: 'Ultimos estrenos',
      description: 'Los videos mas recientes publicados por Arte y Vida TV.',
    },
    {
      title: 'Capsulas y coberturas',
      description: 'Una seleccion reciente de registros, coberturas y piezas del canal.',
    },
    {
      title: 'Archivo reciente',
      description: 'Mas contenidos del canal para seguir explorando desde la misma pagina.',
    },
  ];

  const safeLimit = Math.max(1, Math.min(playlistLimit, labels.length));
  const chunkSize = Math.max(1, Math.ceil(videos.length / safeLimit));
  const collections: YouTubePlaylistItem[] = [];

  for (let index = 0; index < safeLimit; index += 1) {
    const start = index * chunkSize;
    const chunk = videos.slice(start, start + chunkSize).slice(0, 4);
    if (!chunk.length) continue;

    const label = labels[index] ?? labels[labels.length - 1];
    collections.push({
      id: `channel-selection-${index + 1}`,
      title: label.title,
      description: label.description,
      thumbnail: chunk[0]?.thumbnail ?? '',
      publishedAt: chunk[0]?.publishedAt ?? '',
      videoCount: chunk.length,
      playlistUrl: channelUrl,
      videos: chunk,
    });
  }

  return collections;
};

const fallbackVideos: YouTubeVideoItem[] = [
  {
    id: channelUrl,
    title: 'Suscribete a Arte y Vida TV para ver los ultimos estrenos',
    thumbnail: '/DSC06842-scaled.webp',
    publishedAt: '',
  },
  {
    id: channelUrl,
    title: 'Documentales y registros territoriales desde Nuble',
    thumbnail: '/DSC04138-Enhanced-NR-scaled.webp',
    publishedAt: '',
  },
  {
    id: channelUrl,
    title: 'Programacion cultural y social para compartir en comunidad',
    thumbnail: '/CVG08164-1-scaled.webp',
    publishedAt: '',
  },
];

const fallbackPlaylists: YouTubePlaylistItem[] = [
  {
    id: 'arte-y-vida-tv',
    title: 'Arte y Vida TV',
    description: 'Explora el canal oficial con documentales, coberturas y registros audiovisuales.',
    thumbnail: '/DSC06842-scaled.webp',
    publishedAt: '',
    videoCount: fallbackVideos.length,
    playlistUrl: channelUrl,
    videos: fallbackVideos,
  },
];

export const formatYouTubeDate = (value: string) => {
  if (!value) return 'En YouTube';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getYouTubeVideos = async (maxResults = 3) => {
  let videos: YouTubeVideoItem[] = [];
  let loadError = '';

  const channelId = await fetchChannelId();

  if (channelId) {
    videos = await fetchLatestVideos(channelId, maxResults);
    if (!videos.length) {
      loadError = 'No pudimos recuperar los videos recientes del canal en este momento.';
    }
  } else {
    loadError = 'No pudimos conectar con el canal en este momento.';
  }

  return {
    videos:
      videos.length
        ? videos
        : (curatedFallbackVideos.length ? curatedFallbackVideos : fallbackVideos).slice(0, Math.max(1, maxResults)),
    loadError,
  };
};

export const getYouTubeLibrary = async (playlistLimit = 8) => {
  let playlists: YouTubePlaylistItem[] = [];
  let loadError = '';

  const channelId = await fetchChannelId();

  if (channelId && apiKey) {
    playlists = await fetchPlaylists(channelId, playlistLimit);
  }

  if (!playlists.length && channelId) {
    playlists = await fetchPlaylistsFromPublicPages(channelId, playlistLimit);
  }

  if (!playlists.length) {
    playlists = curatedFallbackPlaylists.slice(0, Math.max(1, playlistLimit));
  }

  if (!playlists.length && channelId) {
    const recentVideos = await fetchLatestVideos(channelId, Math.max(playlistLimit * 3, 9));
    playlists = buildChannelSelections(recentVideos, playlistLimit);
  }

  if (!playlists.length) {
    loadError = 'No pudimos recuperar la biblioteca del canal en este momento.';
  }

  return {
    playlists: playlists.length ? playlists : fallbackPlaylists,
    loadError,
  };
};
