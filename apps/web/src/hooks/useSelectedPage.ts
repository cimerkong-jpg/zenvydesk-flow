import { useSelectedPageContext } from '../context/SelectedPageContext'

export function useSelectedPage() {
  return useSelectedPageContext()
}
