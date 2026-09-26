import { onCLS, onINP, onLCP } from 'web-vitals'

type Metric = { name: string; value: number; rating: string; id: string }

function report(metric: Metric) {
  const { name, value, rating, id } = metric
  const label = `[Web Vitals] ${name}`

  // 性能指标并非运行时错误: 一律以 info/warn 记录, 不用 error(避免污染错误监控与控制台红色告警)。
  if (rating === 'good') {
    console.info(label, `${value.toFixed(1)}ms`, { id, rating })
  } else {
    console.warn(label, `${value.toFixed(1)}ms`, { id, rating })
  }
}

export function initWebVitals() {
  onLCP(report, { reportAllChanges: false })
  onCLS(report, { reportAllChanges: false })
  onINP(report, { reportAllChanges: false })
}
