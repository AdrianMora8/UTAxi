export interface Campus {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  lat: number;
  lng: number;
}

export const CAMPUSES: Campus[] = [
  {
    id: 'huachi',
    label: 'Campus Huachi',
    shortLabel: 'Huachi',
    description: 'Campus central — Av. Los Chasquis',
    lat: -1.2540,
    lng: -78.6197,
  },
  {
    id: 'querocochamba',
    label: 'Campus Querochamba',
    shortLabel: 'Querochamba',
    description: 'Fac. Ciencias Agropecuarias — Cevallos',
    lat: -1.3677,
    lng: -78.6126,
  },
  {
    id: 'ingahurco',
    label: 'Campus Ingahurco',
    shortLabel: 'Ingahurco',
    description: 'Fac. Jurisprudencia y Ciencias Sociales',
    lat: -1.2468,
    lng: -78.6274,
  },
];

export function findCampusById(id: string): Campus | undefined {
  return CAMPUSES.find((c) => c.id === id);
}

export function findCampusByLabel(label: string): Campus | undefined {
  return CAMPUSES.find((c) => c.label === label || c.shortLabel === label);
}
