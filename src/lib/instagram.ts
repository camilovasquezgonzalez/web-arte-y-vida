const INSTAGRAM_USERNAME = 'corparteyvida';
const INSTAGRAM_PROFILE_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
const INSTAGRAM_WEB_PROFILE_URL = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${INSTAGRAM_USERNAME}`;
const INSTAGRAM_APP_ID = '936619743392459';

export interface InstagramPostItem {
  id: string;
  permalink: string;
  timestamp: string;
  caption: string;
  mediaType: string;
  cover: string;
}

export interface InstagramFeedData {
  username: string;
  biography: string;
  profilePictureUrl: string;
  website: string;
  followersCount: number | null;
  followsCount: number | null;
  posts: InstagramPostItem[];
}

export interface InstagramFeedResult {
  feed: InstagramFeedData;
  error: string | null;
  generatedAt: string;
  source: 'live' | 'fallback';
}

type RawInstagramNode = Record<string, unknown>;

const fallbackFeed: InstagramFeedData = {
  username: INSTAGRAM_USERNAME,
  biography:
    `Creemos que la gestion cultural es la base sobre la que se sostiene el desarrollo de las comunidades.
Entradas para eventos e inscripcion a talleres aqui.`,
  profilePictureUrl:
    'https://cdn2.behold.pictures/6CJI9ZwlwXWfIMGd2pPh7MvdAxk2/17841407353889211/profile.webp',
  website: 'https://www.facebook.com/corparteyvida',
  followersCount: 3411,
  followsCount: 323,
  posts: [
    {
      id: '18389074348152754',
      timestamp: '2026-03-31T15:02:53+0000',
      permalink: 'https://www.instagram.com/p/DWjZpZIiCDt/',
      mediaType: 'CAROUSEL_ALBUM',
      caption: 'Taller de Yoga | FormArte 2026',
      cover:
        'https://behold.pictures/6CJI9ZwlwXWfIMGd2pPh7MvdAxk2/4gCtfgh1AA9Oqq4SFGb5/18389074348152754/medium.jpg',
    },
    {
      id: '18092758589143595',
      timestamp: '2026-03-31T15:02:42+0000',
      permalink: 'https://www.instagram.com/p/DWjZoBIiOq_/',
      mediaType: 'CAROUSEL_ALBUM',
      caption: 'Taller de Danzas Latinas | FormArte 2026',
      cover:
        'https://behold.pictures/6CJI9ZwlwXWfIMGd2pPh7MvdAxk2/4gCtfgh1AA9Oqq4SFGb5/18092758589143595/medium.jpg',
    },
    {
      id: '18104860603730361',
      timestamp: '2026-03-31T15:02:33+0000',
      permalink: 'https://www.instagram.com/p/DWjZm2viW1B/',
      mediaType: 'CAROUSEL_ALBUM',
      caption: 'Taller de Telar de Bastidor | FormArte 2026',
      cover:
        'https://behold.pictures/6CJI9ZwlwXWfIMGd2pPh7MvdAxk2/4gCtfgh1AA9Oqq4SFGb5/18104860603730361/medium.jpg',
    },
    {
      id: '18309931123285996',
      timestamp: '2026-03-31T15:01:26+0000',
      permalink: 'https://www.instagram.com/p/DWjZexkEf0J/',
      mediaType: 'CAROUSEL_ALBUM',
      caption: 'Taller de Musica Infantil | FormArte 2026',
      cover:
        'https://behold.pictures/6CJI9ZwlwXWfIMGd2pPh7MvdAxk2/4gCtfgh1AA9Oqq4SFGb5/18309931123285996/medium.jpg',
    },
    {
      id: '18098963651067063',
      timestamp: '2026-03-31T15:01:23+0000',
      permalink: 'https://www.instagram.com/p/DWjZeZ0Db2c/',
      mediaType: 'CAROUSEL_ALBUM',
      caption: 'Taller de Cine | FormArte 2026',
      cover:
        'https://behold.pictures/6CJI9ZwlwXWfIMGd2pPh7MvdAxk2/4gCtfgh1AA9Oqq4SFGb5/18098963651067063/medium.jpg',
    },
    {
      id: '18261836056293477',
      timestamp: '2026-03-31T15:01:22+0000',
      permalink: 'https://www.instagram.com/p/DWjZePHiHfP/',
      mediaType: 'CAROUSEL_ALBUM',
      caption: 'Taller de Teatro para Personas Adultas | FormArte 2026',
      cover:
        'https://behold.pictures/6CJI9ZwlwXWfIMGd2pPh7MvdAxk2/4gCtfgh1AA9Oqq4SFGb5/18261836056293477/medium.jpg',
    },
  ],
};

const readText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const getCaption = (node: RawInstagramNode): string => {
  const edgeMedia = asRecord(node.edge_media_to_caption);
  const edges = Array.isArray(edgeMedia?.edges) ? edgeMedia.edges : [];
  const firstEdge = asRecord(edges[0]);
  const edgeNode = asRecord(firstEdge?.node);
  return readText(edgeNode?.text);
};

const normalizePost = (node: RawInstagramNode): InstagramPostItem | null => {
  const id = readText(node.id);
  const shortcode = readText(node.shortcode);
  const cover = readText(node.display_url);

  if (!id || !shortcode || !cover) return null;

  const timestamp = readNumber(node.taken_at_timestamp);
  const isoTimestamp = timestamp ? new Date(timestamp * 1000).toISOString() : '';

  return {
    id,
    permalink: `https://www.instagram.com/p/${shortcode}/`,
    timestamp: isoTimestamp,
    caption: getCaption(node),
    mediaType: readText(node.__typename) || 'Post',
    cover,
  };
};

const normalizeFeed = (user: Record<string, unknown>): InstagramFeedData | null => {
  const media = asRecord(user.edge_owner_to_timeline_media);
  const edges = Array.isArray(media?.edges) ? media.edges : [];
  const posts = edges
    .map((edge) => asRecord(edge))
    .map((edge) => asRecord(edge?.node))
    .map((node) => (node ? normalizePost(node) : null))
    .filter((post): post is InstagramPostItem => Boolean(post))
    .slice(0, 6);

  if (!posts.length) return null;

  return {
    username: readText(user.username) || fallbackFeed.username,
    biography: readText(user.biography) || fallbackFeed.biography,
    profilePictureUrl: readText(user.profile_pic_url_hd) || readText(user.profile_pic_url) || fallbackFeed.profilePictureUrl,
    website: readText(user.external_url) || fallbackFeed.website,
    followersCount: readNumber(asRecord(user.edge_followed_by)?.count) ?? fallbackFeed.followersCount,
    followsCount: readNumber(asRecord(user.edge_follow)?.count) ?? fallbackFeed.followsCount,
    posts,
  };
};

const fetchLiveFeed = async (): Promise<InstagramFeedData | null> => {
  const response = await fetch(INSTAGRAM_WEB_PROFILE_URL, {
    headers: {
      Accept: 'application/json',
      Referer: INSTAGRAM_PROFILE_URL,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      'X-IG-App-ID': INSTAGRAM_APP_ID,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (!response.ok) {
    throw new Error(`Instagram respondio con HTTP ${response.status}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const data = asRecord(payload.data);
  const user = asRecord(data?.user);
  if (!user) return null;
  return normalizeFeed(user);
};

export const getInstagramFeed = async (): Promise<InstagramFeedResult> => {
  const generatedAt = new Date().toISOString();

  try {
    const liveFeed = await fetchLiveFeed();
    if (liveFeed) {
      return {
        feed: liveFeed,
        error: null,
        generatedAt,
        source: 'live',
      };
    }
  } catch {
    // Keep curated fallback when Instagram blocks the request.
  }

  return {
    feed: fallbackFeed,
    error: 'No pudimos actualizar Instagram en este momento.',
    generatedAt,
    source: 'fallback',
  };
};
