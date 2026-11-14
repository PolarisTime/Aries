/**
 * 供应商报价页实时协作的开关。
 *
 * <p>两级开关，**运行时优先于构建期**：</p>
 * <ul>
 *   <li>构建期 `VITE_COLLAB_ENABLED=true`：随包下发，默认关闭；</li>
 *   <li>运行时 `window._CONFIG.collabEnabled`：运维在部署环境里改配置即可临时关闭，
 *       不必重新发版。灰度期「关掉开关 → 前端回退 REST 自动保存」靠它。</li>
 * </ul>
 *
 * <p>开关只管「要不要尝试协作」；真正进入协作模式还要求拿到 `collab-session` 票据
 * （见 {@link import('./collab-session-api').requestCollabSession}）。任何一步不满足都
 * 静默回退到现有的 REST 自动保存，用户无感。</p>
 */

/** 运行时配置里承载开关的键名（与 `window._CONFIG` 同层）。 */
export const COLLAB_RUNTIME_FLAG_KEY = 'collabEnabled'

/** 读取构建期开关；`import.meta.env` 在 `src/env.d.ts` 里是严格类型的，这里只读一个可选键。 */
function readBuildFlag() {
  const env = import.meta.env as unknown as Record<string, string | undefined>
  return env.VITE_COLLAB_ENABLED === 'true'
}

/** 读取运行时开关；未配置返回 undefined（表示「沿用构建期开关」）。 */
function readRuntimeFlag(): boolean | undefined {
  if (typeof window === 'undefined') return undefined
  const config = window._CONFIG
  if (!config) return undefined
  const value = config[COLLAB_RUNTIME_FLAG_KEY]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return undefined
}

/** 协作功能是否开启（运行时优先）。 */
export function isCollabFeatureEnabled(): boolean {
  const runtime = readRuntimeFlag()
  return runtime ?? readBuildFlag()
}

/**
 * 光标上报节流窗口（毫秒）。
 *
 * <p>设计文档 §9.3 的口径是 80ms：打字时每敲一个字符都上报光标会淹没 awareness 通道，
 * 而超过 100ms 又会让对方觉得光标"粘住了"。这个常量是**唯一**出口，不要在别处再写一个数。</p>
 */
export const COLLAB_CURSOR_THROTTLE_MS = 80

/**
 * 同格冲突提示窗口（毫秒）。
 *
 * <p>只有「自己刚改过这一格、紧接着收到远端对同一格的改动」才算冲突（设计文档 §8）。
 * 时间窗之外的远端改动是正常协作，不应打扰用户。</p>
 */
export const COLLAB_CONFLICT_WINDOW_MS = 2_000

/** 远端的「不报价」与「还没同步」必须分开：前者是 null，后者是 undefined。 */
export type CollabPriceValue = number | null | undefined
