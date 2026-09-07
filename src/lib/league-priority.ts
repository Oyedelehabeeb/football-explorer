export const PRIORITY_LEAGUE_IDS = [39, 140, 135, 78, 61, 94, 88] as const

const priority = new Map<number, number>(PRIORITY_LEAGUE_IDS.map((id, index) => [id, index]))

export function compareLeaguePriority(a: number, b: number) {
  return (priority.get(a) ?? Number.MAX_SAFE_INTEGER) - (priority.get(b) ?? Number.MAX_SAFE_INTEGER)
}
