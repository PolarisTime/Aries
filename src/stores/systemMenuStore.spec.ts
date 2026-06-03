import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useSystemMenuStore } from './systemMenuStore'

vi.mock('@/api/system-menus', () => ({
  listSystemMenus: vi.fn(),
}))

describe('systemMenuStore', () => {
  beforeEach(() => {
    useSystemMenuStore.setState({ menus: [], loaded: false })
    useSystemMenuStore.getState().clearMenus()
  })

  it('setMenus sets menus and loaded flag', () => {
    useSystemMenuStore.getState().setMenus([{ key: 'home', label: '首页' }] as any)
    const state = useSystemMenuStore.getState()
    expect(state.menus).toHaveLength(1)
    expect(state.loaded).toBe(true)
  })

  it('loadMenus fetches and caches menus', async () => {
    const { listSystemMenus } = await import('@/api/system-menus')
    vi.mocked(listSystemMenus).mockResolvedValue([
      { key: 'home', label: '首页' },
    ] as any)

    const menus = await useSystemMenuStore.getState().loadMenus()
    expect(menus).toHaveLength(1)
    expect(useSystemMenuStore.getState().loaded).toBe(true)
  })

  it('loadMenus returns cached menus when loaded', async () => {
    const { listSystemMenus } = await import('@/api/system-menus')
    useSystemMenuStore.getState().setMenus([{ key: 'cached' }] as any)
    vi.mocked(listSystemMenus).mockClear()

    const menus = await useSystemMenuStore.getState().loadMenus()
    expect(menus).toEqual([{ key: 'cached' }])
    expect(listSystemMenus).not.toHaveBeenCalled()
  })

  it('reuses pending promise for concurrent calls', async () => {
    const { listSystemMenus } = await import('@/api/system-menus')
    let resolvePromise!: (menus: any[]) => void
    vi.mocked(listSystemMenus).mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve }),
    )

    const p1 = useSystemMenuStore.getState().loadMenus()
    const p2 = useSystemMenuStore.getState().loadMenus()

    resolvePromise([{ key: 'test' }] as any)
    const [menus1, menus2] = await Promise.all([p1, p2])
    expect(menus1).toEqual([{ key: 'test' }])
    expect(menus2).toEqual([{ key: 'test' }])
  })

  it('clearMenus resets state', () => {
    useSystemMenuStore.getState().setMenus([{ key: 'test' }] as any)
    useSystemMenuStore.getState().clearMenus()
    const state = useSystemMenuStore.getState()
    expect(state.menus).toEqual([])
    expect(state.loaded).toBe(false)
  })
})
