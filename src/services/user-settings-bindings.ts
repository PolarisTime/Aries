/**
 * 用户设置同步的业务接线（docs/client-state-sync.md §6）。
 *
 * <p>引擎（`user-settings-sync.ts`）只认 section 名与 JSON，不认识 ui / 页签 / 供应商报价。
 * 「哪个 store 对应哪个分片、远端值怎么落到本地」全部收在这里，避免同一件事在引擎与
 * 各 store 之间各写一遍。</p>
 *
 * <p>防回环：远端值落地的过程中会触发 store 订阅，如果不加标记就会立刻再
 * `patchUserSection` 一次，把「接收」变成「回写」。所有 apply 都用 {@link applyingRemote}
 * 包住。</p>
 */

import i18next from 'i18next'
import {
  patchUserSection,
  readSection,
  subscribeUserSection,
} from '@/services/user-settings-sync'
import { type PersistedTab, useLayoutTabsStore } from '@/stores/layoutTabsStore'
import {
  normalizePersonalSettings,
  type PersonalSettings,
  useUiSettingsStore,
} from '@/stores/uiSettingsStore'
import { applyRemoteSupplierQuoteSection } from '@/views/price-compare/supplier-quote-view-prefs'

/** 与 `src/i18n/index.ts` 的存储键一致（那里未导出常量，避免服务层依赖 i18n 初始化副作用）。 */
const LOCALE_STORAGE_KEY = 'leo-locale'

/** 同步分片名（与后端 / 文档 §4.3 对齐，不要改名）。 */
const UI_SECTION = 'ui'
const LAYOUT_TABS_SECTION = 'layoutTabs'
const SUPPLIER_QUOTE_SECTION = 'supplierQuote'

/** `ui` 分片：个人设置 + 语言 + 引导已看。 */
export interface UiSettingsSectionValue extends PersonalSettings {
  locale?: string
  toursSeen?: string[]
}

/** `layoutTabs` 分片：页签清单 + 当前激活页路径。 */
export interface LayoutTabsSectionValue {
  tabs?: PersistedTab[]
  activeTabPath?: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 归一化语言标识：只同步 i18n 真正支持的两套，其它值忽略。 */
function normalizeLocale(value: unknown): 'zh-CN' | 'en-US' | null {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  if (raw.toLowerCase().startsWith('zh')) return 'zh-CN'
  if (raw.toLowerCase().startsWith('en')) return 'en-US'
  return null
}

function currentLocale(): string | undefined {
  const language = String(i18next.language ?? '')
  return normalizeLocale(language) ?? undefined
}

/** 读本地已知的 toursSeen：本分片自己维护，patch 时原样带上，避免被整体覆盖掉。 */
function readToursSeen(): string[] {
  const current = readSection<UiSettingsSectionValue>(UI_SECTION)
  return Array.isArray(current?.toursSeen)
    ? current.toursSeen.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.length > 0,
      )
    : []
}

/** 由个人设置 store 组装 `ui` 分片值（locale / toursSeen 一并带上）。 */
export function buildUiSettingsSectionValue(
  settings: PersonalSettings | null | undefined,
): UiSettingsSectionValue {
  return {
    ...(settings ?? {}),
    ...(currentLocale() ? { locale: currentLocale() } : {}),
    toursSeen: readToursSeen(),
  }
}

/** 远端 `ui` 分片落地：写回 store，并切换语言（含本地语言存储）。 */
export function applyUiSettingsSection(value: unknown): void {
  if (!isPlainObject(value)) return
  const normalized = normalizePersonalSettings(value)
  useUiSettingsStore.getState().setSettings(normalized ?? {})

  const locale = normalizeLocale(value.locale)
  if (!locale) return
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // 存储不可用：语言仍在本次会话内生效
  }
  if (i18next.language !== locale) {
    void i18next.changeLanguage(locale)
  }
}

/** 由页签 store 组装 `layoutTabs` 分片值（只带可持久化字段，与本地持久化口径一致）。 */
export function buildLayoutTabsSectionValue(): LayoutTabsSectionValue {
  const { tabs, activeTabId } = useLayoutTabsStore.getState()
  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  return {
    tabs: tabs.map(
      ({
        id,
        pathname,
        search,
        pinned,
        userPinned,
        protectedFromEviction,
      }) => ({
        id,
        pathname,
        search,
        pinned,
        userPinned,
        protectedFromEviction,
      }),
    ),
    ...(activeTab ? { activeTabPath: activeTab.pathname } : {}),
  }
}

/** 远端 `layoutTabs` 分片落地：交给 store 按既有 sanitize 规则清洗后恢复。 */
export function applyLayoutTabsSection(value: unknown): void {
  useLayoutTabsStore.getState().applySyncedTabs(value)
}

let installed = false
let applyingRemote = false
const teardowns: Array<() => void> = []

function trackTeardown(teardown: (() => void) | undefined): void {
  if (typeof teardown === 'function') teardowns.push(teardown)
}

const handleLanguageChanged = () => {
  if (applyingRemote) return
  patchUserSection(
    UI_SECTION,
    buildUiSettingsSectionValue(useUiSettingsStore.getState().settings),
  )
}

/** 把三个分片接到同步引擎上（幂等，应用启动时装一次）。 */
export function installUserSettingsBindings(): void {
  if (installed) return
  installed = true

  // ── ui：本地 store 变更 → 分片；远端分片 → store ──
  trackTeardown(
    useUiSettingsStore.subscribe((state, previous) => {
      if (state.settings === previous.settings || applyingRemote) return
      patchUserSection(UI_SECTION, buildUiSettingsSectionValue(state.settings))
    }),
  )
  trackTeardown(
    subscribeUserSection(UI_SECTION, (value) => {
      applyingRemote = true
      try {
        applyUiSettingsSection(value)
      } finally {
        applyingRemote = false
      }
    }),
  )
  i18next.on('languageChanged', handleLanguageChanged)
  trackTeardown(() => i18next.off('languageChanged', handleLanguageChanged))

  // ── layoutTabs：本地页签变更 → 分片；远端分片 → sanitize 后恢复 ──
  trackTeardown(
    useLayoutTabsStore.subscribe((state, previous) => {
      if (
        (state.tabs === previous.tabs &&
          state.activeTabId === previous.activeTabId) ||
        applyingRemote
      ) {
        return
      }
      patchUserSection(LAYOUT_TABS_SECTION, buildLayoutTabsSectionValue())
    }),
  )
  trackTeardown(
    subscribeUserSection(LAYOUT_TABS_SECTION, (value) => {
      applyingRemote = true
      try {
        applyLayoutTabsSection(value)
      } finally {
        applyingRemote = false
      }
    }),
  )

  // ── supplierQuote：远端分片落地到本地键（页面下次挂载即读到） ──
  trackTeardown(
    subscribeUserSection(SUPPLIER_QUOTE_SECTION, (value) => {
      applyRemoteSupplierQuoteSection(value)
    }),
  )
}

/** 仅供测试：卸载接线与订阅（生产代码不要调用）。 */
export function resetUserSettingsBindingsForTests(): void {
  installed = false
  applyingRemote = false
  while (teardowns.length > 0) {
    teardowns.pop()?.()
  }
}
