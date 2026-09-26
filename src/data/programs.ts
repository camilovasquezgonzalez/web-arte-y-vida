export interface Program {
  name: string;
  description: string;
  color: string;
}

export const programs: Program[] = [
  { name: 'FormArte', description: 'Talleres y experiencias de formación artística abiertas a niñas, niños, jóvenes y personas adultas.', color: 'var(--color-brand-accent)' },
  { name: 'EduCultura', description: 'Programación cultural gratuita para acercar funciones, encuentros y actividades a la comunidad.', color: 'var(--color-brand-secondary)' },
  { name: 'InvestigAcción', description: 'Procesos de memoria, diagnóstico y participación para crear proyectos con sentido territorial.', color: 'var(--color-brand-primary)' },
  { name: 'Acción Futuro', description: 'Procesos vinculados al medioambiente, la sostenibilidad y la relación con el territorio.', color: 'var(--color-brand-muted)' },
];
