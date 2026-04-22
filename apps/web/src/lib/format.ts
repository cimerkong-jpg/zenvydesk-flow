export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso ?? '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso ?? '—'
  const diffMs = date.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const minutes = Math.round(absMs / 60_000)
  const hours = Math.round(absMs / 3_600_000)
  const days = Math.round(absMs / 86_400_000)

  const past = diffMs < 0
  if (minutes < 1) return 'just now'
  if (minutes < 60) return past ? `${minutes}m ago` : `in ${minutes}m`
  if (hours < 24) return past ? `${hours}h ago` : `in ${hours}h`
  if (days < 7) return past ? `${days}d ago` : `in ${days}d`
  return formatDateTime(iso)
}

export function truncate(text: string, max = 140): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

export function fromDateTimeLocalValue(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}
