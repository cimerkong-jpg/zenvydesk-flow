import { useTranslation } from 'react-i18next'

export function LanguageSelector() {
  const { i18n, t } = useTranslation()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
  }

  return (
    <div className="language-selector">
      <select
        value={i18n.language.startsWith('vi') ? 'vi' : 'en'}
        onChange={(e) => changeLanguage(e.target.value)}
        className="language-select"
      >
        <option value="en">{t('language.english')}</option>
        <option value="vi">{t('language.vietnamese')}</option>
      </select>
    </div>
  )
}
