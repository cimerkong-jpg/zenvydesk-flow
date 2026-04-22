import type { ReactNode } from 'react'

export type Column<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
  width?: string
  align?: 'left' | 'right' | 'center'
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string | number
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  onRowClick?: (row: T) => void
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  emptyTitle = 'No data',
  emptyDescription,
  emptyAction,
  onRowClick,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="data-table-empty">
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">{emptyTitle}</h3>
          {emptyDescription && <p className="empty-state-description">{emptyDescription}</p>}
          {emptyAction}
        </div>
      </div>
    )
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width, textAlign: col.align ?? 'left' }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className={onRowClick ? 'clickable' : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
