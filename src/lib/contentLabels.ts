const categoryLabelOverrides: Record<string, string> = {
  'agenda-cultural': 'agenda cultural',
  'educacion-artistica': 'educación artística',
  'gestion-cultural': 'gestión cultural',
  musica: 'música',
  participacion: 'participación',
  'programacion-cultural': 'programación cultural',
};

export function formatCategoryLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  const override = categoryLabelOverrides[normalized];

  if (override) return override;
  if (!normalized.includes('-')) return value;

  return normalized
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}
