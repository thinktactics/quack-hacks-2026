export const CATEGORY_COLORS: Record<string, string> = {
  museum: '#B48EAE',
  restaurant: '#DE541E',
  shop: '#6369D1',
  attraction: '#FFA630',
  park: '#69995D',
  cafe: '#DE541E',
}

export function categoryColor(
  category: string | null,
  visited: boolean,
  isRoot: boolean,
): string {
  if (isRoot) return '#034078'
  if (visited) return '#9ca3af'
  return category ? (CATEGORY_COLORS[category] ?? '#DEDEE0') : '#DEDEE0'
}
