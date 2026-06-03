import { describe, expect, it, vi } from 'vitest'

const mockQueryClient = vi.hoisted(() => {
  return vi.fn().mockImplementation(function (this: Record<string, unknown>, config: Record<string, unknown>) {
    this.config = config
    this.defaultOptions = config.defaultOptions
  })
})

vi.mock('@tanstack/react-query', () => ({
  QueryClient: mockQueryClient,
}))

describe('queryClient', () => {
  it('exports a QueryClient instance', async () => {
    const { queryClient } = await import('./query-client')
    expect(queryClient).toBeDefined()
    expect(mockQueryClient).toHaveBeenCalled()
  })

  it('configures default staleTime to 60 seconds', async () => {
    const { queryClient } = await import('./query-client')
    expect(queryClient.defaultOptions.queries.staleTime).toBe(60_000)
  })

  it('configures default gcTime to 10 minutes', async () => {
    const { queryClient } = await import('./query-client')
    expect(queryClient.defaultOptions.queries.gcTime).toBe(10 * 60_000)
  })

  it('disables refetchOnWindowFocus by default', async () => {
    const { queryClient } = await import('./query-client')
    expect(queryClient.defaultOptions.queries.refetchOnWindowFocus).toBe(false)
  })

  it('sets query retry to 1', async () => {
    const { queryClient } = await import('./query-client')
    expect(queryClient.defaultOptions.queries.retry).toBe(1)
  })

  it('sets mutation retry to 0', async () => {
    const { queryClient } = await import('./query-client')
    expect(queryClient.defaultOptions.mutations.retry).toBe(0)
  })

  it('passes correct configuration to QueryClient constructor', async () => {
    await import('./query-client')
    expect(mockQueryClient).toHaveBeenCalledWith({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          gcTime: 10 * 60_000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
        mutations: {
          retry: 0,
        },
      },
    })
  })
})