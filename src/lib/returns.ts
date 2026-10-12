/** Average of per-property returns, weighted by the amount invested in each.
 * Properties with no return entered are left out; if every weight is zero it
 * falls back to a plain average. Null when no property has a return. */
export function weightedReturn(items: { weight: number; ret: number | null | undefined }[]): number | null {
  const withReturn = items.filter((i): i is { weight: number; ret: number } => i.ret != null)
  if (withReturn.length === 0) return null
  const totalWeight = withReturn.reduce((s, i) => s + i.weight, 0)
  if (totalWeight <= 0) return withReturn.reduce((s, i) => s + i.ret, 0) / withReturn.length
  return withReturn.reduce((s, i) => s + i.weight * i.ret, 0) / totalWeight
}
