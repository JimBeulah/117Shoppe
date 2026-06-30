"use client"

const LABELS = ["", "Terrible", "Fair", "Good", "Very Good", "Excellent"]

interface StarPickerProps {
  value: number
  onChange: (value: number) => void
}

export function StarPicker({ value, onChange }: StarPickerProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="text-3xl leading-none focus:outline-none transition-colors"
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
          >
            <span className={star <= value ? "text-reward" : "text-gray-300"}>★</span>
          </button>
        ))}
      </div>
      {value > 0 && (
        <p className="text-sm text-text-secondary">{LABELS[value]}</p>
      )}
    </div>
  )
}
