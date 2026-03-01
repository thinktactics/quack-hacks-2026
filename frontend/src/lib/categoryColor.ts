// export const CATEGORY_COLORS: Record<string, string> = {
//   museum: '#B48EAE',
//   historic: '#B48EAE',
//   shop: '#6369D1',
//   attraction: '#FFA630',
//   leisure: '#FFA630',
//   park: '#69995D',
//   natural: '#69995D',
//   cafe: '#DE541E',
//   restaurant: '#DE541E',
// }

export const CATEGORY_COLORS: Record<string, string> = {
  museum: '#C97BC4',
  historic: '#C97BC4',
  shop: '#4A52F5',
  attraction: '#FFB020',
  leisure: '#FFB020',
  park: '#4DB33D',
  natural: '#4DB33D',
  cafe: '#FF5A1F',
  restaurant: '#FF5A1F',
}

export function categoryColor(
  category: string | null,
  visited: boolean,
  isRoot: boolean,
): string {
  if (isRoot) return document.documentElement.classList.contains('dark') ? '#5aacdf' : '#034078'
  if (visited) return '#9ca3af'
  return category ? (CATEGORY_COLORS[category] ?? '#DEDEE0') : '#DEDEE0'
}
