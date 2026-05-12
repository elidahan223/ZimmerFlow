interface Props {
  onGoHome: () => void
}

export default function NotFound({ onGoHome }: Props) {
  return (
    <div dir="rtl" className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-accent-italic text-muted text-sm tracking-[0.2em] mb-4" dir="ltr">
          page not found
        </p>
        <h1 className="font-editorial text-charcoal text-6xl mb-4 leading-none">
          404
        </h1>
        <p className="text-charcoal-soft/70 text-base font-light leading-relaxed mb-8">
          הדף שחיפשת לא קיים, או שהקישור שגוי.
          חזור לדף הבית כדי לראות את המתחמים.
        </p>
        <button
          onClick={onGoHome}
          className="px-6 py-3 bg-charcoal text-bone text-sm font-medium hover:bg-charcoal-soft transition-colors"
        >
          חזרה לדף הבית
        </button>
      </div>
    </div>
  )
}
