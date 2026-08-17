"use client"

export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded transition-colors"
    >
      Print / Save as PDF
    </button>
  )
}
