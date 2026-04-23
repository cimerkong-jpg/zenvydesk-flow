import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchPages, selectFacebookPage, type PageResponse } from '../lib/api'
import { useAuth } from './AuthContext'

const SELECTED_PAGE_KEY = 'zenvydesk_selected_page'

type SelectedPageContextValue = {
  pages: PageResponse[]
  selectedPage: PageResponse | null
  loading: boolean
  error: string | null
  setSelectedPage: (page: PageResponse) => Promise<void>
  refresh: () => Promise<void>
}

const SelectedPageContext = createContext<SelectedPageContextValue | null>(null)

export function SelectedPageProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [pages, setPages] = useState<PageResponse[]>([])
  const [selectedPage, setSelectedPageState] = useState<PageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const syncPages = async () => {
    setLoading(true)
    setError(null)
    try {
      const pagesResult = await fetchPages()
      const pagesData = pagesResult.pages
      setPages(pagesData)

      const serverSelected = pagesData.find((page) => page.is_selected) ?? null
      const savedId = localStorage.getItem(SELECTED_PAGE_KEY)
      const savedPage = savedId
        ? pagesData.find((page) => page.facebook_page_id === savedId) ?? null
        : null
      const fallbackPage = serverSelected ?? savedPage ?? pagesData[0] ?? null

      setSelectedPageState(fallbackPage)
      if (fallbackPage) {
        localStorage.setItem(SELECTED_PAGE_KEY, fallbackPage.facebook_page_id)
        if (
          !serverSelected ||
          serverSelected.facebook_page_id !== fallbackPage.facebook_page_id
        ) {
          const persisted = await selectFacebookPage(fallbackPage.facebook_page_id)
          setPages((current) =>
            current.map((page) => ({
              ...page,
              is_selected: page.facebook_page_id === persisted.facebook_page_id,
            })),
          )
          setSelectedPageState(persisted)
        }
      } else {
        localStorage.removeItem(SELECTED_PAGE_KEY)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) {
      return
    }
    if (!user) {
      setPages([])
      setSelectedPageState(null)
      setLoading(false)
      setError(null)
      return
    }
    void syncPages()
  }, [authLoading, user])

  const setSelectedPage = async (page: PageResponse) => {
    const persisted = await selectFacebookPage(page.facebook_page_id)
    setPages((current) =>
      current.map((item) => ({
        ...item,
        is_selected: item.facebook_page_id === persisted.facebook_page_id,
      })),
    )
    setSelectedPageState(persisted)
    localStorage.setItem(SELECTED_PAGE_KEY, persisted.facebook_page_id)
  }

  const value = useMemo(
    () => ({
      pages,
      selectedPage,
      loading,
      error,
      setSelectedPage,
      refresh: syncPages,
    }),
    [pages, selectedPage, loading, error],
  )

  return (
    <SelectedPageContext.Provider value={value}>
      {children}
    </SelectedPageContext.Provider>
  )
}

export function useSelectedPageContext() {
  const context = useContext(SelectedPageContext)
  if (!context) {
    throw new Error('useSelectedPage must be used within SelectedPageProvider')
  }
  return context
}
