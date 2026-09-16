export const SUBJECT_COLOR_PALETTE = [
  '#00c853', // Green
  '#2979ff', // Blue
  '#aa00ff', // Purple
  '#ff6d00', // Orange
  '#f50057', // Pink
  '#00bcd4', // Teal
  '#ffab00', // Amber
]

export function getSubjectColor(subjectName: string = '', index: number = 0): string {
  const normalized = subjectName.trim().toLowerCase()
  if (normalized.includes('bio')) return '#00c853'
  if (normalized.includes('chem')) return '#2979ff'
  if (normalized.includes('phys')) return '#aa00ff'
  if (normalized.includes('math') || normalized.includes('calc') || normalized.includes('algebra')) return '#ff6d00'
  if (normalized.includes('eng') || normalized.includes('lit')) return '#f50057'
  
  return SUBJECT_COLOR_PALETTE[index % SUBJECT_COLOR_PALETTE.length]
}

export function getAcademicLevelColor(level: string = ''): string {
  const normalized = level.trim().toUpperCase()
  if (normalized.includes('A2') || normalized.includes('A LEVEL') || normalized.includes('A-LEVEL') || normalized === 'A') return '#aa00ff'
  if (normalized.includes('AS')) return '#2979ff'
  if (normalized.includes('O LEVEL') || normalized.includes('O-LEVEL') || normalized.includes('IGCSE') || normalized === 'O') return '#00c853'
  if (normalized.includes('11') || normalized.includes('GRADE')) return '#ff6d00'
  return '#aa00ff'
}
