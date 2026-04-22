import { useEffect, useState } from 'react'
import { fetchPages, type PageResponse } from '../lib/api'

const SELECTED_PAGE_KEY = 'zenvydesk_selected_page'

type State = {
  pages: PageResponse[]
  selectedPage: PageResponse | null
  loading: boolean
  error: string | null
  setSelectedPage: (page: PageResponse) => void
  refresh: () => void
}

export function useSelectedPage(): State {
  const [pages, setPages] = useState<PageResponse[]>([])
  const [selectedPage, setSelected] = useState<PageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPages()
      .then((pagesData) => {
        if (cancelled) return
        setPages(pagesData)

        if (pagesData.length > 0) {
          const savedId = localStorage.getItem(SELECTED_PAGE_KEY)
          const saved = savedId ? pagesData.find((p) => p.page_id === savedId) : undefined
          const picked = saved ?? pagesData[0]
          setSelected(picked)
          localStorage.setItem(SELECTED_PAGE_KEY, picked.page_id)
        } else {
          setSelected(null)
        }
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  const setSelectedPage = (page: PageResponse) => {
    setSelected(page)
    localStorage.setItem(SELECTED_PAGE_KEY, page.page_id)
  }

  return {
    pages,
    selectedPage,
    loading,
    error,
    setSelectedPage,
    refresh: () => setTick((t) => t + 1),
  }
}
