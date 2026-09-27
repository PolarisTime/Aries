// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'

const { messageSuccessMock, messageWarningMock } = vi.hoisted(() => ({
  messageSuccessMock: vi.fn(),
  messageWarningMock: vi.fn(),
}))

vi.mock('@/utils/antd-app', () => ({
  message: { success: messageSuccessMock, warning: messageWarningMock },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import {
  resolveRecordPrimaryNo,
  writeTextToClipboard,
} from '@/module-system/record/module-record-clipboard'

describe('resolveRecordPrimaryNo 主单号解析', () => {
  it('取 primaryNoKey 对应字段并去空白', () => {
    expect(
      resolveRecordPrimaryNo({ id: '9', docNo: '  XS-2024-001  ' }, 'docNo'),
    ).toBe('XS-2024-001')
  })

  it('未配置 primaryNoKey 或字段为空时返回空串（不回落到 id）', () => {
    expect(resolveRecordPrimaryNo({ id: '9', docNo: 'XS-1' }, undefined)).toBe(
      '',
    )
    expect(resolveRecordPrimaryNo({ id: '9' }, 'docNo')).toBe('')
    expect(resolveRecordPrimaryNo({ id: '9', docNo: '   ' }, 'docNo')).toBe('')
    expect(resolveRecordPrimaryNo(null, 'docNo')).toBe('')
  })

  it('19 位雪花单号按字符串原样返回，不经过 Number 丢精度', () => {
    expect(
      resolveRecordPrimaryNo(
        { id: '9', docNo: '1234567890123456789' },
        'docNo',
      ),
    ).toBe('1234567890123456789')
  })
})

describe('writeTextToClipboard 剪贴板写入', () => {
  it('优先使用 navigator.clipboard.writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await writeTextToClipboard(' XS-2024-001 ')

    expect(writeText).toHaveBeenCalledWith('XS-2024-001')
    vi.unstubAllGlobals()
  })

  it('navigator.clipboard 不可用时回落到 execCommand("copy")', async () => {
    vi.stubGlobal('navigator', {})
    const execCommand = vi.fn().mockReturnValue(true)
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

    await writeTextToClipboard('XS-2024-001')

    expect(execCommand).toHaveBeenCalledWith('copy')
    // 回落用的 textarea 必须被清理
    expect(document.querySelector('textarea')).toBeNull()
    vi.unstubAllGlobals()
  })

  it('execCommand 返回 false 时抛错，避免静默失败', async () => {
    vi.stubGlobal('navigator', {})
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    })

    await expect(writeTextToClipboard('XS-2024-001')).rejects.toThrow(
      'clipboard unavailable',
    )
    vi.unstubAllGlobals()
  })

  it('空文本直接拒绝，不触碰剪贴板', async () => {
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { clipboard: { writeText } })

    await expect(writeTextToClipboard('   ')).rejects.toThrow(
      'clipboard text is empty',
    )
    expect(writeText).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
