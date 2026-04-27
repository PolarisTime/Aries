import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useLayoutMenuSupport } from '@/layouts/use-layout-menu-support'

describe('useLayoutMenuSupport', () => {
  it('clears backend menus when there is no logged-in user', async () => {
    const user = ref(null)
    const permissionStore = {
      canAccessMenuKey: vi.fn(() => true),
      syncFromAuth: vi.fn(),
    }
    const systemMenuStore = {
      clearMenus: vi.fn(),
      loadMenus: vi.fn(),
    }

    useLayoutMenuSupport({
      user,
      systemMenuTree: ref([]),
      permissionStore,
      systemMenuStore,
      isKnownIconKey: (iconKey): iconKey is 'AppstoreOutlined' =>
        iconKey === 'AppstoreOutlined',
    })

    await nextTick()

    expect(permissionStore.syncFromAuth).toHaveBeenCalledTimes(1)
    expect(systemMenuStore.clearMenus).toHaveBeenCalledTimes(1)
    expect(systemMenuStore.loadMenus).not.toHaveBeenCalled()
  })

  it('loads backend menus when auth state becomes available', async () => {
    const user = ref<unknown>(null)
    const permissionStore = {
      canAccessMenuKey: vi.fn(() => true),
      syncFromAuth: vi.fn(),
    }
    const systemMenuStore = {
      clearMenus: vi.fn(),
      loadMenus: vi.fn(async () => []),
    }

    useLayoutMenuSupport({
      user,
      systemMenuTree: ref([]),
      permissionStore,
      systemMenuStore,
      isKnownIconKey: (iconKey): iconKey is 'AppstoreOutlined' =>
        iconKey === 'AppstoreOutlined',
    })

    user.value = { id: 1 }
    await nextTick()

    expect(permissionStore.syncFromAuth).toHaveBeenCalledTimes(2)
    expect(systemMenuStore.loadMenus).toHaveBeenCalledTimes(1)
  })
})
