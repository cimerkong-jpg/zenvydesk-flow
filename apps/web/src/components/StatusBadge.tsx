import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const resolved = variant ?? VARIANT_MAP[status.toLowerCase()] ?? 'neutral'
  const statusKeyMap: Record<string, string> = {
    draft: 'common.status.draft',
    scheduled: 'common.status.scheduled',
    posted: 'common.status.posted',
    failed: 'common.status.failed',
    success: 'common.status.success',
    error: 'common.status.error',
    active: 'common.status.active',
    inactive: 'common.status.inactive',
    pending: 'common.status.pending',
    draft_created: 'common.status.draftCreated',
    generation_failed: 'common.status.generationFailed',
  }
  const key = statusKeyMap[status.toLowerCase()]
  const label = key ? t(key) : status.replace(/_/g, ' ')
  return <span className={`badge badge-${resolved} badge-status`}>{label}</span>
}
