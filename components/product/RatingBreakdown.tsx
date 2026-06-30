interface RatingBreakdownProps {
  overallRating: number
  totalCount: number
  ratingCounts: Record<number, number>
}

export function RatingBreakdown({ overallRating, totalCount, ratingCounts }: RatingBreakdownProps) {
  return (
    <div className="flex gap-6 items-center">
      <div className="text-center">
        <p className="text-5xl font-bold text-reward">{overallRating.toFixed(1)}</p>
        <p className="text-sm text-text-secondary mt-1">
          {totalCount} review{totalCount !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingCounts[star] ?? 0
          const pct = totalCount > 0 ? (count / totalCount) * 100 : 0
          return (
            <div key={star} className="flex items-center gap-2 text-xs text-text-secondary">
              <span className="w-4 text-right">{star}</span>
              <span className="text-reward">★</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-reward h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
