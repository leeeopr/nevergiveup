export type GroupRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface GroupSettings {
  currency?: string;
  defaultMonthlyBudget?: number;
  tags?: string[];
  themeAccent?: string;
}

export interface ManagementGroup {
  id: string;
  name: string;
  description?: string | null;
  color: string; // HEX color, e.g. '#6366f1'
  owner_id: string;
  status: 'active' | 'archived';
  settings?: GroupSettings;
  created_at: string;
  updated_at: string;
  // Role of the current user in this group
  current_user_role?: GroupRole;
  // Aggregate metadata
  members_count?: number;
  movements_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  email?: string;
  full_name?: string;
  created_at: string;
}

export interface PresetGroupColor {
  hex: string;
  name: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const PRESET_GROUP_COLORS: PresetGroupColor[] = [
  { hex: '#6366f1', name: 'Índigo Pessoal', bgClass: 'bg-indigo-500/10', borderClass: 'border-indigo-500/30', textClass: 'text-indigo-400' },
  { hex: '#10b981', name: 'Esmeralda Chácara', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/30', textClass: 'text-emerald-400' },
  { hex: '#f59e0b', name: 'Âmbar Avós', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30', textClass: 'text-amber-400' },
  { hex: '#3b82f6', name: 'Azul Corporativo', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/30', textClass: 'text-blue-400' },
  { hex: '#8b5cf6', name: 'Púrpura Investimentos', bgClass: 'bg-purple-500/10', borderClass: 'border-purple-500/30', textClass: 'text-purple-400' },
  { hex: '#ec4899', name: 'Rosa Família', bgClass: 'bg-pink-500/10', borderClass: 'border-pink-500/30', textClass: 'text-pink-400' },
  { hex: '#06b6d4', name: 'Ciano Projetos', bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/30', textClass: 'text-cyan-400' },
  { hex: '#14b8a6', name: 'Teal Imobiliário', bgClass: 'bg-teal-500/10', borderClass: 'border-teal-500/30', textClass: 'text-teal-400' },
  { hex: '#f97316', name: 'Laranja Comércio', bgClass: 'bg-orange-500/10', borderClass: 'border-orange-500/30', textClass: 'text-orange-400' },
  { hex: '#64748b', name: 'Ardósia Reserva', bgClass: 'bg-slate-500/10', borderClass: 'border-slate-500/30', textClass: 'text-slate-400' },
];

/**
 * Maps a HEX color string to the closest Google Calendar Event colorId (1-11).
 * Calendar color palette:
 * 1: Lavender (#7986cb)
 * 2: Sage (#33b679)
 * 3: Grape (#8e24aa)
 * 4: Flamingo (#e67c73)
 * 5: Banana (#f6bf26)
 * 6: Tangerine (#f4511e)
 * 7: Peacock (#039be5)
 * 8: Graphite (#616161)
 * 9: Blueberry (#3f51b5)
 * 10: Basil (#0b8043)
 * 11: Tomato (#d50000)
 */
export function getClosestGoogleCalendarColorId(hexColor: string): string {
  if (!hexColor) return '7'; // Peacock default

  const cleanHex = hexColor.replace('#', '').trim();
  const r1 = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g1 = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b1 = parseInt(cleanHex.substring(4, 6), 16) || 0;

  const calendarColors: { id: string; rgb: [number, number, number] }[] = [
    { id: '1', rgb: [121, 134, 203] }, // Lavender
    { id: '2', rgb: [51, 182, 121] },  // Sage
    { id: '3', rgb: [142, 36, 170] },  // Grape
    { id: '4', rgb: [230, 124, 115] }, // Flamingo
    { id: '5', rgb: [246, 191, 38] },  // Banana
    { id: '6', rgb: [244, 81, 30] },   // Tangerine
    { id: '7', rgb: [3, 155, 229] },   // Peacock
    { id: '8', rgb: [97, 97, 97] },    // Graphite
    { id: '9', rgb: [63, 81, 181] },   // Blueberry
    { id: '10', rgb: [11, 128, 67] },  // Basil
    { id: '11', rgb: [213, 0, 0] },    // Tomato
  ];

  let minDistance = Infinity;
  let bestId = '7';

  for (const c of calendarColors) {
    // Euclidean distance in RGB
    const dr = r1 - c.rgb[0];
    const dg = g1 - c.rgb[1];
    const db = b1 - c.rgb[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < minDistance) {
      minDistance = dist;
      bestId = c.id;
    }
  }

  return bestId;
}
