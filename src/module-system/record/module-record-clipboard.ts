import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

/**
 * 取单据主单号：只认 <code>config.primaryNoKey</code> 对应字段，缺失/空白返回空串。
 *
 * <p>与 <code>getModuleRecordPrimaryNo</code> 的区别是不做「回落到 id」的兜底——
 * 「复制单号」在没有真实单号时必须不渲染，而不是把雪花 id 当作单号复制出去。</p>
 */
export function resolveRecordPrimaryNo(
  record: ModuleRecord | null | undefined,
  primaryNoKey?: string,
): string {
  if (!record || !primaryNoKey) return ''
  return asString(record[primaryNoKey]).trim()
}

/**
 * 写文本到剪贴板。
 *
 * <p>优先使用 <code>navigator.clipboard</code>（需要安全上下文）；不可用时回落到
 * 隐藏 textarea + <code>document.execCommand('copy')</code>，与
 * <code>use-parent-selector-detail</code> 原有实现保持一致。写入失败时抛错，
 * 由调用方决定提示文案。</p>
 */
export async function writeTextToClipboard(text: string): Promise<void> {
  const value = String(text ?? '').trim()
  if (!value) {
    throw new Error('clipboard text is empty')
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const input = document.createElement('textarea')
  input.value = value
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) {
    throw new Error('clipboard unavailable')
  }
}
