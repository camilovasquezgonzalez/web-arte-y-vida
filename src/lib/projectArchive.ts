import fs from 'node:fs';
import path from 'node:path';

export interface ArchiveImage {
  src: string;
  alt: string;
}

export interface ArchiveProject {
  key: string;
  slug: string;
  year: number;
  title: string;
  summary: string;
  tags: string[];
  coverImage: string;
  images: ArchiveImage[];
  photoCount: number;
  directoryLabel: string;
}

export interface ArchiveYear {
  year: number;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  photoCount: number;
  projectCount: number;
  highlights: string[];
  projects: ArchiveProject[];
}

interface ProjectOverride {
  title?: string;
  summary?: string;
  tags?: string[];
  sortOrder?: number;
}

interface YearOverride {
  title?: string;
  description?: string;
}

const PUBLIC_ARCHIVE_ROOT = path.join(process.cwd(), 'public', 'fotos-web-actualizadas');
const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png']);

const PROJECT_OVERRIDES: Record<string, ProjectOverride> = {
  'Arte y Voz Comunitaria - diagnóstico cultural participativo Coelemu 2024': {
    title: 'Arte y Voz Comunitaria',
    summary:
      'Proceso de diagnóstico cultural participativo desarrollado en Coelemu para levantar voces, memorias y necesidades del territorio junto a la comunidad.',
    tags: ['InvestigAcción', 'diagnóstico cultural', 'participación'],
    sortOrder: 10,
  },
  'Casa Abierta 2024': {
    title: 'Casa Abierta',
    summary:
      'Programación abierta de verano con talleres FormArte y presentaciones EduCultura para activar la casa de Arte y Vida como espacio de encuentro.',
    tags: ['FormArte', 'EduCultura', 'comunidad'],
    sortOrder: 30,
  },
  'Cineclub Arte y Vida 2026': {
    summary:
      'Instancia de exhibición y conversación en torno al cine para abrir espacios de formación de públicos y encuentro cultural.',
    tags: ['EduCultura', 'cineclub', 'formación de públicos'],
    sortOrder: 50,
  },
  'Concierto Disney en JJJVV El Conquistador 2024': {
    summary:
      'Concierto comunitario realizado junto a la Junta de Vecinos El Conquistador para acercar repertorios familiares y experiencia escénica al barrio.',
    tags: ['EduCultura', 'música', 'barrio'],
    sortOrder: 20,
  },
  'Cultura vive en tu barrio 2024': {
    title: 'Cultura Vive en tu Barrio',
    summary:
      'Proyecto territorial con talleres, diagnósticos, mediación y programación cultural desplegado en barrios de Ñuble.',
    tags: ['FormArte', 'EduCultura', 'InvestigAcción'],
    sortOrder: 40,
  },
  "'Desde mi celular' - Festival de cortos escolares 2025": {
    title: 'Desde mi Celular',
    summary:
      'Festival de cortos escolares que impulsa la creación audiovisual desde la experiencia de niñas, niños y jóvenes.',
    tags: ['FormArte', 'audiovisual', 'escuelas'],
    sortOrder: 15,
  },
  'Día de Educultura 2025': {
    title: 'Día de EduCultura',
    summary:
      'Jornada artística de circulación y encuentro que reunió música y cine chileno en una programación abierta a la comunidad.',
    tags: ['EduCultura', 'música', 'cine'],
    sortOrder: 60,
  },
  'Día de los patrimonios 2025': {
    title: 'Día de los Patrimonios',
    summary:
      'Activación comunitaria en torno al patrimonio, la memoria local y el encuentro intergeneracional.',
    tags: ['patrimonio', 'memoria', 'comunidad'],
    sortOrder: 70,
  },
  'Encuentro de dos mundos 2023': {
    summary:
      'Encuentro cultural con énfasis en mediación artística, participación comunitaria e intercambio de experiencias.',
    tags: ['encuentro', 'cultura', 'comunidad'],
    sortOrder: 20,
  },
  'Expo Arte y Vida - muestra de talleres a fin de año 2025': {
    title: 'Expo Arte y Vida',
    summary:
      'Muestra de cierre de año que reúne procesos y resultados de los talleres FormArte en un formato expositivo abierto a la comunidad.',
    tags: ['FormArte', 'muestra', 'talleres'],
    sortOrder: 30,
  },
  'FICC 2023': {
    summary:
      'Programación cultural con talleres, mural participativo, concierto y actividades de mediación orientadas al trabajo comunitario.',
    tags: ['festival', 'talleres', 'comunidad'],
    sortOrder: 10,
  },
  'Fotos para Proyectos medioambientales/2023': {
    title: 'Proyectos medioambientales',
    summary:
      'Registros de acciones medioambientales y mediación en torno a la flora nativa desarrolladas durante 2023.',
    tags: ['medioambiente', 'territorio', 'educación ambiental'],
    sortOrder: 40,
  },
  'Fotos para Proyectos medioambientales/2024/Escuela de Meipo': {
    title: 'Escuela de Meipo',
    summary:
      'Jornadas de plantación, mediación y aprendizaje en torno a especies nativas junto a la comunidad educativa de la Escuela de Meipo.',
    tags: ['medioambiente', 'escuela', 'flora nativa'],
    sortOrder: 50,
  },
  'Fotos para Proyectos medioambientales/2024/Liceo de Guarilihue': {
    title: 'Liceo de Guarilihue',
    summary:
      'Acciones de educación ambiental y trabajo comunitario con estudiantes y docentes del Liceo de Guarilihue.',
    tags: ['medioambiente', 'liceo', 'educación ambiental'],
    sortOrder: 60,
  },
  'Fotos para Proyectos medioambientales/2024/Liceo DOR': {
    title: 'Liceo Domingo Ortiz de Rozas',
    summary:
      'Actividades de arborización, mediación y participación escolar vinculadas al cuidado del entorno.',
    tags: ['medioambiente', 'liceo', 'participación escolar'],
    sortOrder: 70,
  },
  'Fotos para Proyectos medioambientales/2024/Marchant+Magdalena': {
    title: 'Marchant y Magdalena',
    summary:
      'Trabajo territorial y medioambiental desarrollado con comunidades de Marchant y Magdalena a través de acciones participativas.',
    tags: ['medioambiente', 'territorio', 'comunidad'],
    sortOrder: 80,
  },
  'Fotos para Proyectos medioambientales/2024/Villa Jesus de Coelemu': {
    title: 'Villa Jesús de Coelemu',
    summary:
      'Experiencias de educación ambiental y encuentro comunitario en torno a la plantación de especies nativas.',
    tags: ['medioambiente', 'barrio', 'flora nativa'],
    sortOrder: 90,
  },
  'Fotos para Proyectos medioambientales/2025': {
    title: 'Proyectos medioambientales',
    summary:
      'Continuidad del trabajo medioambiental con foco en flora nativa, participación y cuidado del territorio durante 2025.',
    tags: ['medioambiente', 'territorio', 'continuidad'],
    sortOrder: 80,
  },
  'Jornadas de Talleres Express en Verano 2026': {
    title: 'Talleres Express en Verano',
    summary:
      'Ciclo intensivo de talleres creativos y experiencias de verano para activar la participación artística en vacaciones.',
    tags: ['FormArte', 'verano', 'talleres'],
    sortOrder: 20,
  },
  'Orquesta Arte y Vida 2025': {
    summary:
      'Proceso musical colectivo que fortalece el trabajo colaborativo, la formación instrumental y la circulación artística.',
    tags: ['música', 'formación', 'orquesta'],
    sortOrder: 40,
  },
  'Presentación Elenco teatral Arte y Vida 2025': {
    title: 'Elenco Teatral Arte y Vida',
    summary:
      'Presentación escénica del elenco teatral de la corporación como parte de los procesos de formación y circulación artística.',
    tags: ['teatro', 'FormArte', 'circulación'],
    sortOrder: 50,
  },
  'Reactivemos el teatro 2026': {
    title: 'Reactivemos el Teatro',
    summary:
      'Programación artística gratuita y sostenida en el Teatro Municipal de Coelemu para recuperar el encuentro con las artes escénicas y musicales.',
    tags: ['EduCultura', 'teatro', 'programación'],
    sortOrder: 10,
  },
  'Tumbe Canela en Liceo Domingo Ortíz de Rozas 2025': {
    title: 'Tumbe Canela en Liceo DOR',
    summary:
      'Presentación musical en contexto escolar que acerca nuevas sonoridades y experiencias de escena a estudiantes y comunidad educativa.',
    tags: ['EduCultura', 'música', 'escuela'],
    sortOrder: 90,
  },
};

const YEAR_OVERRIDES: Record<number, YearOverride> = {
  2023: {
    title: 'Archivo 2023',
    description: 'Primeros hitos, encuentros y procesos comunitarios registrados en el territorio durante 2023.',
  },
  2024: {
    title: 'Archivo 2024',
    description: 'Proyectos, diagnósticos, encuentros y acciones territoriales desarrolladas durante 2024.',
  },
  2025: {
    title: 'Archivo 2025',
    description: 'Programación, circulación artística y procesos formativos impulsados por Arte y Vida durante 2025.',
  },
  2026: {
    title: 'Archivo 2026',
    description: 'Nuevas programaciones, talleres y activaciones culturales desplegadas durante 2026.',
  },
};

let projectCache: ArchiveProject[] | null = null;

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"`´]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function encodePublicPath(relativePath: string) {
  return `/${relativePath.split(path.sep).map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function listImagesRecursive(directoryPath: string) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listImagesRecursive(fullPath));
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => collator.compare(left, right));
}

function listImagesDirect(directoryPath: string) {
  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(directoryPath, entry.name))
    .sort((left, right) => collator.compare(left, right));
}

function stripTrailingYear(value: string) {
  return value.replace(/\s+20\d{2}$/, '').trim();
}

function inferTags(key: string, title: string) {
  const haystack = `${key} ${title}`.toLowerCase();
  const tags = new Set<string>();

  if (haystack.includes('taller')) tags.add('talleres');
  if (haystack.includes('teatro')) tags.add('teatro');
  if (haystack.includes('cine')) tags.add('cine');
  if (haystack.includes('orquesta') || haystack.includes('concierto') || haystack.includes('bigband') || haystack.includes('tumbe')) tags.add('música');
  if (haystack.includes('diagnóstico')) tags.add('diagnóstico');
  if (haystack.includes('patrimonio')) tags.add('patrimonio');
  if (haystack.includes('medioambient')) tags.add('medioambiente');
  if (haystack.includes('festival')) tags.add('festival');
  if (haystack.includes('barrio') || haystack.includes('comunit')) tags.add('territorio');

  return Array.from(tags);
}

function fallbackSummary(title: string, year: number, key: string) {
  if (key.includes('Fotos para Proyectos medioambientales')) {
    return `Registro visual de acciones medioambientales y trabajo territorial desarrollados durante ${year}.`;
  }

  return `Registro visual del proyecto ${title} desarrollado por Arte y Vida durante ${year}.`;
}

function buildProject(options: {
  key: string;
  title: string;
  year: number;
  directoryLabel: string;
  files: string[];
}) {
  const override = PROJECT_OVERRIDES[options.key] ?? {};
  const title = override.title ?? options.title;
  const images = options.files.map((filePath, index) => {
    const relativePath = path.relative(path.join(process.cwd(), 'public'), filePath);
    return {
      src: encodePublicPath(relativePath),
      alt: `${title} - registro ${index + 1}`,
    };
  });

  return {
    key: options.key,
    slug: slugify(options.key),
    year: options.year,
    title,
    summary: override.summary ?? fallbackSummary(title, options.year, options.key),
    tags: override.tags ?? inferTags(options.key, title),
    coverImage: images[0]?.src ?? '',
    images,
    photoCount: images.length,
    directoryLabel: options.directoryLabel,
    sortOrder: override.sortOrder ?? 999,
  };
}

function readArchiveProjects() {
  if (!fs.existsSync(PUBLIC_ARCHIVE_ROOT)) return [];

  const topLevelDirectories = fs
    .readdirSync(PUBLIC_ARCHIVE_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => collator.compare(left.name, right.name));

  const projects = [];

  for (const directory of topLevelDirectories) {
    const topLevelPath = path.join(PUBLIC_ARCHIVE_ROOT, directory.name);
    const topLevelYearMatch = directory.name.match(/(20\d{2})$/);

    if (topLevelYearMatch) {
      const files = listImagesRecursive(topLevelPath);
      if (!files.length) continue;
      projects.push(
        buildProject({
          key: directory.name,
          title: stripTrailingYear(directory.name),
          year: Number(topLevelYearMatch[1]),
          directoryLabel: directory.name,
          files,
        }),
      );
      continue;
    }

    const yearDirectories = fs
      .readdirSync(topLevelPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^20\d{2}$/.test(entry.name))
      .sort((left, right) => collator.compare(left.name, right.name));

    for (const yearDirectory of yearDirectories) {
      const year = Number(yearDirectory.name);
      const yearPath = path.join(topLevelPath, yearDirectory.name);
      const directImages = listImagesDirect(yearPath);

      if (directImages.length) {
        projects.push(
          buildProject({
            key: `${directory.name}/${yearDirectory.name}`,
            title: directory.name,
            year,
            directoryLabel: `${directory.name}/${yearDirectory.name}`,
            files: directImages,
          }),
        );
      }

      const childDirectories = fs
        .readdirSync(yearPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .sort((left, right) => collator.compare(left.name, right.name));

      for (const childDirectory of childDirectories) {
        const childPath = path.join(yearPath, childDirectory.name);
        const childFiles = listImagesRecursive(childPath);
        if (!childFiles.length) continue;

        projects.push(
          buildProject({
            key: `${directory.name}/${yearDirectory.name}/${childDirectory.name}`,
            title: childDirectory.name.replace(/\+/g, ' y '),
            year,
            directoryLabel: `${directory.name}/${yearDirectory.name}/${childDirectory.name}`,
            files: childFiles,
          }),
        );
      }
    }
  }

  return projects
    .sort((left, right) => {
      if (left.year !== right.year) return right.year - left.year;
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return collator.compare(left.title, right.title);
    })
    .map(({ sortOrder, ...project }) => project as ArchiveProject);
}

export function getArchiveProjects() {
  projectCache ??= readArchiveProjects();
  return projectCache;
}

export function getArchiveProjectByKey(key: string) {
  return getArchiveProjects().find((project) => project.key === key);
}

export function getArchiveProjectBySlug(slug: string) {
  return getArchiveProjects().find((project) => project.slug === slug);
}

export function getArchiveYears() {
  const grouped = new Map<number, ArchiveProject[]>();

  for (const project of getArchiveProjects()) {
    const projects = grouped.get(project.year) ?? [];
    projects.push(project);
    grouped.set(project.year, projects);
  }

  return Array.from(grouped.entries())
    .sort((left, right) => right[0] - left[0])
    .map(([year, projects]) => {
      const override = YEAR_OVERRIDES[year] ?? {};
      return {
        year,
        slug: String(year),
        title: override.title ?? `Archivo ${year}`,
        description: override.description ?? `Registro de proyectos y actividades desarrolladas durante ${year}.`,
        coverImage: projects[0]?.coverImage ?? '',
        photoCount: projects.reduce((sum, project) => sum + project.photoCount, 0),
        projectCount: projects.length,
        highlights: projects.slice(0, 3).map((project) => project.title),
        projects,
      } satisfies ArchiveYear;
    });
}

export function getArchiveYear(year: number) {
  return getArchiveYears().find((entry) => entry.year === year);
}
