import { onCLS, onINP, onLCP } from 'web-vitals'

type Metric = { name: string; value: number; rating: string; id: string }

function report(metric: Metric) {
  const { name, value, rating, id } = metric
  const label = `[Web Vitals] ${name}`

  if (rating === 'good') {
    console.info(label, `${value.toFixed(1)}ms`, { id, rating })
  } else if (rating === 'needs-improvement') {
    console.warn(label, `${value.toFixed(1)}ms`, { id, rating })
  } else {
    console.error(label, `${value.toFixed(1)}ms`, { id, rating })
  }
}

export function initWebVitals() {
  onLCP(report, { reportAllChanges: false })
  onCLS(report, { reportAllChanges: false })
  onINP(report, { reportAllChanges: false })
}
