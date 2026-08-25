import type { ReactNode } from "react"

export interface ReportTableColumn<T> {
  key: string
  label: string
  align?: "left" | "right"
  render: (row: T) => ReactNode
}

interface Props<T> {
  columns: ReportTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyMessage: string
}

export function ReportTable<T>({ columns, rows, rowKey, emptyMessage }: Props<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-secondary p-5">{emptyMessage}</p>
  }

  return (
    <table className="w-full text-sm mt-3">
      <thead className="border-y border-border-default bg-bg-page">
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className={`px-4 py-3 text-text-secondary font-medium ${
                col.align === "right" ? "text-right" : "text-left"
              }`}
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border-default">
        {rows.map((row) => (
          <tr key={rowKey(row)} className="hover:bg-brand-50 transition-colors">
            {columns.map((col) => (
              <td
                key={col.key}
                className={`px-4 py-3 ${col.align === "right" ? "text-right text-text-primary" : ""}`}
              >
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
