export const categories = [
  { value: '', label: 'All places' },
  { value: 'academic', label: 'Academic' },
  { value: 'food', label: 'Food' },
  { value: 'hostel', label: 'Hostels' },
  { value: 'sports', label: 'Sports' },
  { value: 'parking', label: 'Parking' },
  { value: 'office', label: 'Offices' },
  { value: 'facility', label: 'Facilities' },
  { value: 'gate', label: 'Gates' },
] as const;

const categoryLabels: Record<string, string> = {
  academic: 'Academic',
  building: 'Building',
  facility: 'Facility',
  food: 'Food',
  gate: 'Gate',
  hostel: 'Hostel',
  office: 'Office',
  other: 'Campus place',
  parking: 'Parking',
  sports: 'Sports',
};

const categoryGlyphs: Record<string, string> = {
  academic: 'A', building: 'B', facility: '•', food: 'F', gate: 'G', hostel: 'H', office: 'O', parking: 'P', sports: 'S',
};

export const categoryLabel = (category: string) => categoryLabels[category] || 'Campus place';
export const categoryGlyph = (category: string) => categoryGlyphs[category] || '•';
export const formatSubtype = (value: string | null) => value
  ? value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
  : null;
