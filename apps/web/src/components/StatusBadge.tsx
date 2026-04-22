type Variant = 'success' | 'error' | 'warning' | 'neutral' | 'info'

const VARIANT_MAP: Record<string, Variant> = {
  // Draft status
  draft: 'neutral',
  scheduled: 'info',
  posted: 'success',
  failed: 'error',
  // Post history status
  success: 'success',
  error: 'error',
  // Automation run
  draft_created: 'info',
  generation_failed: 'error',
  // Generic
  active: 'success',
  inactive: 'neutral',
  pending: 'warning',
}

type Props = {
  status: string
  variant?: Variant
}

export function StatusBadge({ status, variant }: Props) {
  const resolved = variant ?? VARIANT_MAP[status.toLowerCase()] ?? 'neutral'
  const label = status.replace(/_/g, ' ')
  return <span className={`badge badge-${resolved} badge-status`}>{label}</span>
}
