// @vitest-environment jsdom

import i18next from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/constants/storage'

const getUserAccountSettingsMock = vi.hoisted(() => vi.fn())
const saveUserAccountSettingsMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/system/user-preferences', () => ({
  getUserAccountSettings: getUserAccountSettingsMock,
  saveUserAccountSettings: saveUserAccountSettingsMock,
}))
vi.mock('@/utils/antd-app', () => ({
  message: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))
vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

import { useLayoutTabsStore } from '@/stores/layoutTabsStore'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import {
  applyRemoteSupplierQuoteSection,
  readMaterialTabs,
  readSupplierTabs,
  supplierTabsKey,
  writeMaterialTabs,
  writeSupplierTabs,
} from '@/views/price-compare/supplier-quote-view-prefs'
import {
  applyLayoutTabsSection,
  applyUiSettingsSection,
  buildLayoutTabsSectionValue,
  installUserSettingsBindings,
  resetUserSettingsBindingsForTests,
  type UiSettingsSectionValue,
} from './user-settings-bindings'
import {
  activateUserSettingsSync,
  getUserSettingsSyncSnapshot,
  patchUserSection,
  readSection,
  resetUserSettingsSyncForTests,
} from './user-settings-sync'

const MIRROR_KEY = (userKey: string) =>
  `${STORAGE_KEYS.userSettingsPrefix}${userKey}`

function signIn(id = 'u1') {
  window.localStorage.setItem(
    STORAGE_KEYS.user,
    JSON.stringify({ id, loginName: id }),
  )
}

/** 模拟另一个标签页写入本地镜像（浏览器对其他标签页派发 storage 事件）。 */
function emitStorageMirror(userKey: string, sections: Record<string, unknown>) {
  const raw = JSON.stringify({ sections })
  window.localStorage.setItem(MIRROR_KEY(userKey), raw)
  window.dispatchEvent(
    new StorageEvent('storage', { key: MIRROR_KEY(userKey), newValue: raw }),
  )
}

describe('用户设置同步接线', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetUserSettingsSyncForTests()
    resetUserSettingsBindingsForTests()
    useUiSettingsStore.getState().clearSettings()
    useLayoutTabsStore.setState({
      tabs: useLayoutTabsStore.getState().tabs.slice(0, 1),
      activeTabId: null,
    })
    getUserAccountSettingsMock.mockReset()
    saveUserAccountSettingsMock.mockReset()
    getUserAccountSettingsMock.mockResolvedValue({
      version: 2,
      sections: {},
      pages: {},
    })
    saveUserAccountSettingsMock.mockResolvedValue({
      version: 2,
      sections: {},
      pages: {},
    })
    signIn()
    activateUserSettingsSync('u1')
    installUserSettingsBindings()
  })

  afterEach(() => {
    resetUserSettingsBindingsForTests()
    resetUserSettingsSyncForTests()
    void i18next.changeLanguage('zh-CN')
  })

  it('个人设置变更写入 ui 分片（含 locale / toursSeen）', () => {
    useUiSettingsStore
      .getState()
      .setSettings({ fontSize: 16, themeMode: 'dark', layoutMode: 'sider' })

    const ui = readSection<UiSettingsSectionValue>('ui')
    expect(ui).toMatchObject({
      fontSize: 16,
      themeMode: 'dark',
      layoutMode: 'sider',
      locale: 'zh-CN',
      toursSeen: [],
    })
  })

  it('远端 ui 分片落地到 store 并切换语言', () => {
    applyUiSettingsSection({
      fontSize: 18,
      themeMode: 'system',
      locale: 'en-US',
    })

    expect(useUiSettingsStore.getState().settings).toMatchObject({
      fontSize: 18,
      themeMode: 'system',
    })
    expect(i18next.language).toBe('en-US')
  })

  it('其它标签页的 ui 值经 storage 事件应用后不回写（防回环）', () => {
    emitStorageMirror('u1', {
      ui: {
        value: { fontSize: 20, themeMode: 'dark' },
        clientUpdatedAt: '2026-11-12T00:00:00Z',
      },
    })

    expect(useUiSettingsStore.getState().settings).toMatchObject({
      fontSize: 20,
      themeMode: 'dark',
    })
    // 绑定在 applyingRemote 期间跳过 patch：不应该把接收到的值又标成待上传
    expect(getUserSettingsSyncSnapshot().dirty).toEqual([])
  })

  it('远端页签按既有 sanitize 规则清洗（失效路径/重复/工作台置顶）', () => {
    applyLayoutTabsSection({
      tabs: [
        { id: 'a', pathname: '/sales-order', search: '?x=1' },
        { id: 'b', pathname: '/not-registered' },
        { id: 'c', pathname: '/sales-order' },
        { id: 'd', pathname: '/dashboard' },
      ],
      activeTabPath: '/sales-order',
    })

    const { tabs, activeTabId } = useLayoutTabsStore.getState()
    expect(tabs.map((tab) => tab.pathname)).toEqual([
      '/dashboard',
      '/sales-order',
    ])
    expect(tabs[0]?.pinned).toBe(true)
    expect(tabs.find((tab) => tab.id === activeTabId)?.pathname).toBe(
      '/sales-order',
    )
  })

  it('本地页签变化写入 layoutTabs 分片（激活页按 pathname 记录）', () => {
    useLayoutTabsStore.getState().openTab({ pathname: '/sales-order' })

    const section = readSection<{
      tabs?: Array<{ pathname: string }>
      activeTabPath?: string
    }>('layoutTabs')
    expect(section?.tabs?.map((tab) => tab.pathname)).toContain('/sales-order')
    expect(section?.activeTabPath).toBe('/sales-order')
  })

  it('buildLayoutTabsSectionValue 只带可持久化字段', () => {
    const dashboard = useLayoutTabsStore
      .getState()
      .tabs.find((tab) => tab.pathname === '/dashboard')
    if (dashboard) useLayoutTabsStore.getState().activateTab(dashboard.id)

    const section = buildLayoutTabsSectionValue()
    expect(section.tabs?.[0]).toEqual({
      id: expect.any(String),
      pathname: '/dashboard',
      search: '',
      pinned: true,
      userPinned: false,
      protectedFromEviction: false,
    })
    expect(section.activeTabPath).toBe('/dashboard')
  })

  it('供应商页签与材质 tab 写入 supplierQuote 分片，materialTabs 按 supplierId 合并', () => {
    writeSupplierTabs({
      openSupplierIds: ['s1', 's2'],
      activeSupplierId: 's2',
    })
    writeMaterialTabs('s1', { 直条: 'HRB400' })
    writeMaterialTabs('s2', { 直条: 'HRB400E' })

    const section = readSection<{
      openSupplierIds?: string[]
      activeSupplierId?: string
      materialTabs?: Record<string, unknown>
    }>('supplierQuote')
    expect(section?.openSupplierIds).toEqual(['s1', 's2'])
    expect(section?.activeSupplierId).toBe('s2')
    expect(section?.materialTabs).toEqual({
      s1: { 直条: 'HRB400' },
      s2: { 直条: 'HRB400E' },
    })
  })

  it('远端 supplierQuote 落地到本地键，且不修改分片（避免回写）', () => {
    patchUserSection('supplierQuote', {
      openSupplierIds: ['local'],
      materialTabs: { s1: { 直条: 'HRB400' } },
    })
    const before = readSection('supplierQuote')

    applyRemoteSupplierQuoteSection({
      openSupplierIds: ['s9'],
      activeSupplierId: 's9',
      materialTabs: { s9: { 盘螺: 'HRB400E' } },
    })

    expect(readSupplierTabs()).toEqual({
      openSupplierIds: ['s9'],
      activeSupplierId: 's9',
    })
    expect(readMaterialTabs('s9')).toEqual({ 盘螺: 'HRB400E' })
    // 本地已写入（读得到）
    expect(window.localStorage.getItem(`${supplierTabsKey}:u1`)).not.toBeNull()
    expect(readSection('supplierQuote')).toEqual(before)
  })
})
