import {
  clearRouteLoadRecoveryMarker,
  isRecoverableRouteLoadError,
} from '@/router/route-load-recovery'

describe('route-load-recovery', () => {
  it('detects stale lazy route chunk failures', () => {
    expect(isRecoverableRouteLoadError(new Error('Failed to fetch dynamically imported module: /assets/BusinessGridView.js'))).toBe(true)
    expect(isRecoverableRouteLoadError(new Error('Loading chunk 17 failed'))).toBe(true)
    expect(isRecoverableRouteLoadError(new Error('Unable to preload CSS for /assets/index.css'))).toBe(true)
  })

  it('ignores normal application errors', () => {
    expect(isRecoverableRouteLoadError(new Error('Request failed with status code 500'))).toBe(false)
    expect(isRecoverableRouteLoadError(new Error('登录状态已失效，请重新登录'))).toBe(false)
  })

  it('can clear the recovery marker without throwing', () => {
    window.sessionStorage.setItem('aries-route-load-recovery-attempted', '1')

    clearRouteLoadRecoveryMarker()

    expect(window.sessionStorage.getItem('aries-route-load-recovery-attempted')).toBeNull()
  })
})
