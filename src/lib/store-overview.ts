export function formatTupleSummary(sampledCount: number, hasContinuation: boolean): string {
  const countLabel = hasContinuation ? `${sampledCount}+` : String(sampledCount)
  const noun = sampledCount === 1 && !hasContinuation ? 'tuple' : 'tuples'
  return `${countLabel} ${noun} (sampled)`
}
