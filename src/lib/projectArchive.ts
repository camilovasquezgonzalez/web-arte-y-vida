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

interface AggregateRule {
  title: string;
  directoryLabel: string;
}

const PUBLIC_ARCHIVE_ROOT = path.join(process.cwd(), 'public', 'fotos-web-actualizadas');
const IMAGE_EXTENSIONS = new Set(['.webp', '.jpg', '.jpeg', '.png']);

const PROJECT_OVERRIDES: Record<string, ProjectOverride> = {
  'Arte y Voz Comunitaria - diagnÃ³stico cultural participativo Coelemu 2024': {
    title: 'Arte y Voz Comunitaria',
    summary:
      'Proceso de diagnostico cultural participativo desarrollado en Coelemu para levantar voces, memorias y necesidades del territorio junto a la comunidad.',
    tags: ['InvestigAccion', 'diagnostico cultural', 'participacion'],
    sortOrder: 10,
  },
  'Casa Abierta 2024': {
    title: 'Casa Abierta',
    summary:
      'Programacion abierta de verano con talleres FormArte y presentaciones EduCultura para activar la casa de Arte y Vida como espacio de encuentro.',
    tags: ['FormArte', 'EduCultura', 'comunidad'],
    sortOrder: 30,
  },
  'Cineclub Arte y Vida 2026': {
    summary:
      'Instancia de exhibicion y conversacion en torno al cine para abrir espacios de formacion de publicos y encuentro cultural.',
    tags: ['EduCultura', 'cineclub', 'formacion de publicos'],
    sortOrder: 50,
  },
  'Concierto Disney en JJJVV El Conquistador 2024': {
    summary:
      'Concierto comunitario realizado junto a la Junta de Vecinos El Conquistador para acercar repertorios familiares y experiencia escenica al barrio.',
    tags: ['EduCultura', 'musica', 'barrio'],
    sortOrder: 20,
  },
  'Concierto Disney en Villa El Conquistador 2024': {
    title: 'Concierto Disney en Villa El Conquistador',
    summary:
      'Concierto comunitario realizado junto a Villa El Conquistador para acercar repertorios familiares y experiencia escenica al barrio.',
    tags: ['EduCultura', 'musica', 'barrio'],
    sortOrder: 20,
  },
  'Cultura vive en tu barrio 2024': {
    title: 'Cultura Vive en tu Barrio',
    summary:
      'Proyecto territorial con talleres, diagnosticos, mediacion y programacion cultural desplegado en barrios de Nuble.',
    tags: ['FormArte', 'EduCultura', 'InvestigAccion'],
    sortOrder: 40,
  },
  "'Desde mi celular' - Festival de cortos escolares 2025": {
    title: 'Desde mi Celular',
    summary:
      'Festival de cortos escolares que impulsa la creacion audiovisual desde la experiencia de ninas, ninos y jovenes.',
    tags: ['FormArte', 'audiovisual', 'escuelas'],
    sortOrder: 15,
  },
  'DÃ­a de Educultura 2025': {
    title: 'Dia de EduCultura',
    summary:
      'Jornada artistica de circulacion y encuentro que reunio musica y cine chileno en una programacion abierta a la comunidad.',
    tags: ['EduCultura', 'musica', 'cine'],
    sortOrder: 60,
  },
  'DÃ­a de los patrimonios 2025': {
    title: 'Dia de los Patrimonios',
    summary:
      'Activacion comunitaria en torno al patrimonio, la memoria local y el encuentro intergeneracional.',
    tags: ['patrimonio', 'memoria', 'comunidad'],
    sortOrder: 70,
  },
  'Encuentro de dos mundos 2023': {
    title: 'Encuentro de Dos Mundos',
    summary:
      'Serie documental desarrollada en tres comunas de Nuble que pone en encuentro a payadores y freestylers, dialogando desde sus artes de improvisacion.',
    tags: ['documental', 'improvisacion', 'territorio'],
    sortOrder: 20,
  },
  'Expo Arte y Vida - muestra de talleres a fin de aÃ±o 2025': {
    title: 'Expo Arte y Vida',
    summary:
      'Muestra de cierre de ano que reune procesos y resultados de los talleres FormArte en un formato expositivo abierto a la comunidad.',
    tags: ['FormArte', 'muestra', 'talleres'],
    sortOrder: 30,
  },
  'FICC 2023': {
    summary:
      'Programacion cultural con talleres, mural participativo, concierto y actividades de mediacion orientadas al trabajo comunitario.',
    tags: ['festival', 'talleres', 'comunidad'],
    sortOrder: 10,
  },
  'Fotos para Proyectos medioambientales/2023': {
    title: 'Proyectos medioambientales',
    summary:
      'Registros de acciones medioambientales y mediacion en torno a la flora nativa desarrolladas durante 2023.',
    tags: ['medioambiente', 'territorio', 'educacion ambiental'],
    sortOrder: 40,
  },
  'Fotos para Proyectos medioambientales/2024': {
    title: 'Proyectos medioambientales',
    summary:
      'Programa territorial de educacion ambiental y activacion comunitaria que reune plantacion de flora nativa, mediacion escolar y acciones de cuidado del entorno en distintos sectores de Nuble.',
    tags: ['medioambiente', 'territorio', 'educacion ambiental'],
    sortOrder: 45,
  },
  'Fotos para Proyectos medioambientales/2025': {
    title: 'Proyectos medioambientales',
    summary:
      'Continuidad del trabajo medioambiental con foco en flora nativa, participacion y cuidado del territorio durante 2025.',
    tags: ['medioambiente', 'territorio', 'continuidad'],
    sortOrder: 80,
  },
  'Jornadas de Talleres Express en Verano 2026': {
    title: 'Talleres Express en Verano',
    summary:
      'Ciclo intensivo de talleres creativos y experiencias de verano para activar la participacion artistica en vacaciones.',
    tags: ['FormArte', 'verano', 'talleres'],
    sortOrder: 20,
  },
  'Orquesta Arte y Vida 2025': {
    summary:
      'Proceso musical colectivo que fortalece el trabajo colaborativo, la formacion instrumental y la circulacion artistica.',
    tags: ['musica', 'formacion', 'orquesta'],
    sortOrder: 40,
  },
  'PresentaciÃ³n Elenco teatral Arte y Vida 2025': {
    title: 'Elenco Teatral Arte y Vida',
    summary:
      'Presentacion escenica del elenco teatral de la corporacion como parte de los procesos de formacion y circulacion artistica.',
    tags: ['teatro', 'FormArte', 'circulacion'],
    sortOrder: 50,
  },
  'Reactivemos el teatro 2026': {
    title: 'Reactivemos el Teatro',
    summary:
      'Programacion artistica gratuita y sostenida en el Teatro Municipal de Coelemu, con teatro, cine, danza, charlas, conciertos y otras experiencias de encuentro cultural.',
    tags: ['EduCultura', 'teatro', 'programacion'],
    sortOrder: 10,
  },
  'Tumbe Canela en Liceo Domingo OrtÃ­z de Rozas 2025': {
    title: 'Tumbe Canela en Liceo DOR',
    summary:
      'Presentacion musical en contexto escolar que acerca nuevas sonoridades y experiencias de escena a estudiantes y comunidad educativa.',
    tags: ['EduCultura', 'musica', 'escuela'],
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
    description: 'Proyectos, diagnosticos, encuentros y acciones territoriales desarrolladas durante 2024.',
  },
  2025: {
    title: 'Archivo 2025',
    description: 'Programacion, circulacion artistica y procesos formativos impulsados por Arte y Vida durante 2025.',
  },
  2026: {
    title: 'Archivo 2026',
    description: 'Nuevas programaciones, talleres y activaciones culturales desplegadas durante 2026.',
  },
};

const AGGREGATED_PROJECTS: Record<string, AggregateRule> = {
  'Fotos para Proyectos medioambientales/2024': {
    title: 'Proyectos medioambientales',
    directoryLabel: 'Fotos para Proyectos medioambientales/2024',
  },
};

let projectCache: ArchiveProject[] | null = null;

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"`Â´]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function encodePublicPath(relativePath: string) {
  return `/${relativePath.split(path.sep).map((segment) => encodeURIComponent(segment)).join('/')}`;
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleDeterministically(values: string[], seed: string) {
  return [...values].sort((left, right) => {
    const leftHash = hashString(`${seed}:${left}`);
    const rightHash = hashString(`${seed}:${right}`);

    if (leftHash === rightHash) return collator.compare(left, right);
    return leftHash - rightHash;
  });
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
  if (haystack.includes('orquesta') || haystack.includes('concierto') || haystack.includes('bigband') || haystack.includes('tumbe')) tags.add('musica');
  if (haystack.includes('diagnost')) tags.add('diagnostico');
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
  const shuffledFiles = shuffleDeterministically(options.files, options.key);
  const images = shuffledFiles.map((filePath, index) => {
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
      const aggregateRule = AGGREGATED_PROJECTS[`${directory.name}/${yearDirectory.name}`];

      if (aggregateRule) {
        const aggregateFiles = listImagesRecursive(yearPath);
        if (!aggregateFiles.length) continue;

        projects.push(
          buildProject({
            key: `${directory.name}/${yearDirectory.name}`,
            title: aggregateRule.title,
            year,
            directoryLabel: aggregateRule.directoryLabel,
            files: aggregateFiles,
          }),
        );

        continue;
      }

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
