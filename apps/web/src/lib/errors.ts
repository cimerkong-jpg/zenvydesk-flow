export const formatDisplayError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/^HTTP\s+\d+\s+[—-]\s*/u, '')
}
