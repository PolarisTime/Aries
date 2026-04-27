export const e2eBackendMode = process.env.E2E_BACKEND_MODE === 'mock' ? 'mock' : 'real'

export const isRealBackendMode = e2eBackendMode === 'real'
export const isMockBackendMode = e2eBackendMode === 'mock'
