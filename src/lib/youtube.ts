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

const apiKey = import.meta.env.YOUTUBE_API_KEY;
const explicitChannelId = import.meta.env.YOUTUBE_CHANNEL_ID;
const fallbackChannelId = 'UC4H2VHO5BN36TvnQwUWYPKg';
const channelHandle = '@corparteyvida';
const channelUrl = 'https://www.youtube.com/@corparteyvida';

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

export const formatYouTubeDate = (isoString: string) => {
  if (!isoString) return 'En YouTube';
  const date = new Date(isoString);
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
    videos: videos.length ? videos : fallbackVideos.slice(0, Math.max(1, maxResults)),
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
