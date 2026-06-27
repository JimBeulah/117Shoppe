const COLOR: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
}

export default function ShopStatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COLOR[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  )
}
