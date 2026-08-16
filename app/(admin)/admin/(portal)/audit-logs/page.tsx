import Link from "next/link"
import { getAuditLogs, getAuditActionTypes } from "@/lib/admin/audit"

export const metadata = { title: "Admin — Audit Logs" }

interface Props {
  searchParams: Promise<{ page?: string; targetType?: string }>
}

export default async function AdminAuditLogsPage({ searchParams }: Props) {
  const { page: pageStr, targetType: targetTypeParam } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? "1", 10))
  const targetType = targetTypeParam ?? null

  const [{ logs, total, pageSize }, targetTypes] = await Promise.all([
    getAuditLogs(page, null, targetType),
    getAuditActionTypes(),
  ])
  const totalPages = Math.ceil(total / pageSize)

  function buildHref(overrides: { targetType?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const t = "targetType" in overrides ? overrides.targetType : targetType
    const p = overrides.page ?? page
    if (t) params.set("targetType", t)
    if (p > 1) params.set("page", String(p))
    return `/admin/audit-logs${params.toString() ? `?${params}` : ""}`
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-text-primary">Audit Logs</h1>

      <div className="flex gap-1 border-b border-border-default overflow-x-auto">
        <Link
          href={buildHref({ targetType: null, page: 1 })}
          className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
            targetType === null ? "border-brand-600 text-brand-600 font-medium" : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          All
        </Link>
        {targetTypes.map((t) => (
          <Link
            key={t}
            href={buildHref({ targetType: t, page: 1 })}
            className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
              targetType === t ? "border-brand-600 text-brand-600 font-medium" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-lg border border-border-default p-12 text-center">
          <p className="text-text-secondary text-sm">No audit log entries found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-border-default overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-bg-page">
              <tr>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Timestamp</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Actor</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Action</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Target</th>
                <th className="text-left px-4 py-3 text-text-secondary font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-brand-50 transition-colors">
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-PH")}
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    {log.actor.name}
                    <span className="block text-xs text-text-secondary">{log.actor.email}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-text-primary">{log.action}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {log.targetType}
                    {log.targetId && <span className="block text-xs font-mono">{log.targetId.slice(0, 10)}…</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary max-w-[280px] truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
              <p className="text-xs text-text-secondary">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildHref({ page: page - 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildHref({ page: page + 1 })} className="text-xs px-3 py-1 rounded border border-border-default hover:bg-brand-50">
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
