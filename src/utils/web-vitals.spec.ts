import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const mockOnLCP = vi.fn()
const mockOnCLS = vi.fn()
const mockOnINP = vi.fn()

vi.mock('web-vitals', () => ({
  onLCP: mockOnLCP,
  onCLS: mockOnCLS,
  onINP: mockOnINP,
}))

describe('web-vitals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initWebVitals', () => {
    it('registers LCP, CLS, and INP listeners', async () => {
      const { initWebVitals } = await import('./web-vitals')
      initWebVitals()
      expect(mockOnLCP).toHaveBeenCalledWith(expect.any(Function), { reportAllChanges: false })
      expect(mockOnCLS).toHaveBeenCalledWith(expect.any(Function), { reportAllChanges: false })
      expect(mockOnINP).toHaveBeenCalledWith(expect.any(Function), { reportAllChanges: false })
    })

    it('reports good metrics with console.info', async () => {
      const { initWebVitals } = await import('./web-vitals')
      initWebVitals()
      const reportFn = mockOnLCP.mock.calls[0][0]
      reportFn({ name: 'LCP', value: 1000, rating: 'good', id: 'test-id' })
      expect(console.info).toHaveBeenCalledWith(
        '[Web Vitals] LCP',
        '1000.0ms',
        { id: 'test-id', rating: 'good' }
      )
    })

    it('reports needs-improvement metrics with console.warn', async () => {
      const { initWebVitals } = await import('./web-vitals')
      initWebVitals()
      const reportFn = mockOnCLS.mock.calls[0][0]
      reportFn({ name: 'CLS', value: 0.2, rating: 'needs-improvement', id: 'test-id' })
      expect(console.warn).toHaveBeenCalledWith(
        '[Web Vitals] CLS',
        '0.2ms',
        { id: 'test-id', rating: 'needs-improvement' }
      )
    })

    it('reports poor metrics with console.error', async () => {
      const { initWebVitals } = await import('./web-vitals')
      initWebVitals()
      const reportFn = mockOnINP.mock.calls[0][0]
      reportFn({ name: 'INP', value: 500, rating: 'poor', id: 'test-id' })
      expect(console.error).toHaveBeenCalledWith(
        '[Web Vitals] INP',
        '500.0ms',
        { id: 'test-id', rating: 'poor' }
      )
    })
  })
})