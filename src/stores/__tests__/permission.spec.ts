import { createPinia, setActivePinia } from 'pinia'
import { usePermissionStore } from '@/stores/permission'

describe('permission store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('requires read permission for menu access from login payload', () => {
    const permissionStore = usePermissionStore()
    permissionStore.setPermissions([{ resource: 'role', actions: ['manage_permissions'] }])

    expect(permissionStore.canAccessMenuKey('/role-action-editor')).toBe(false)

    permissionStore.setPermissions([{ resource: 'role', actions: ['read', 'manage_permissions'] }])

    expect(permissionStore.canAccessMenuKey('/role-action-editor')).toBe(true)
  })

  it('requires read permission for menu access from store state', () => {
    const permissionStore = usePermissionStore()
    permissionStore.setPermissions([{ resource: 'material', actions: ['update'] }])

    expect(permissionStore.canAccessMenuKey('materials')).toBe(false)

    permissionStore.setPermissions([{ resource: 'material', actions: ['read', 'update'] }])

    expect(permissionStore.canAccessMenuKey('materials')).toBe(true)
  })
})
