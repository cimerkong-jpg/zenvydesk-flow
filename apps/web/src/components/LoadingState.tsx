import { useTranslation } from 'react-i18next'

type Props = {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: Props) {
  const { t } = useTranslation()
  return (
    <div className="loading-state">
      <span className="spinner spinner-lg"></span>
      <p className="loading-state-message">{message === 'Loading...' ? t('common.loading') : message}</p>
    </div>
  )
}

type InlineProps = {
  message?: string
}

export function InlineLoader({ message }: InlineProps) {
  return (
    <span className="inline-loader">
      <span className="spinner"></span>
      {message && <span>{message}</span>}
    </span>
  )
}
