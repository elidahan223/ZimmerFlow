import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this should report to Sentry/CloudWatch.
    // Don't log PII or full stack traces to stdout.
    console.error('UI crashed:', error.message, info.componentStack?.split('\n')[1]?.trim())
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div
        dir="rtl"
        className="min-h-screen bg-bone flex items-center justify-center px-6"
      >
        <div className="max-w-md text-center">
          <p className="font-accent-italic text-muted text-sm tracking-[0.2em] mb-4" dir="ltr">
            something broke
          </p>
          <h1 className="font-editorial text-charcoal text-4xl mb-4">
            אופס.
          </h1>
          <p className="text-charcoal-soft/70 text-base font-light leading-relaxed mb-8">
            משהו קרס באפליקציה. הצוות שלנו מודע ועובד על זה.
            תוכל לרענן את הדף או לחזור מאוחר יותר.
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 bg-charcoal text-bone text-sm font-medium hover:bg-charcoal-soft transition-colors"
          >
            רענן את הדף
          </button>
          <p className="mt-6 label-airy text-[10px] text-charcoal-soft/40">
            אם זה ממשיך, צור קשר עם בעל הבית
          </p>
        </div>
      </div>
    )
  }
}
