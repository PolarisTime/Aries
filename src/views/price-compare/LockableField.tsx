import type { InputRef } from 'antd'
import { Button, Input, Space, Tooltip } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  /** 字段标签 */
  label: string
  /** 项目级已保存值 */
  value: string
  placeholder?: string
  width?: number
  /** 确认(回车/失焦)后回调, 用于按项目持久化 */
  onConfirm: (value: string) => void
}

/**
 * 可锁定文本输入: 回车或失焦确认后变只读, 需「解锁」再次编辑,
 * 「清除」可清空; 锁状态仅本地维护, 值由父级按项目存取。
 */
export function LockableField({
  label,
  value,
  placeholder,
  width = 160,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value)
  const [locked, setLocked] = useState(() => Boolean(value.trim()))
  const lockedRef = useRef(locked)
  const draftRef = useRef(value)
  const inputRef = useRef<InputRef | null>(null)

  useEffect(() => {
    lockedRef.current = locked
  }, [locked])

  useEffect(() => {
    setDraft(value)
    draftRef.current = value
    setLocked(Boolean(value.trim()))
  }, [value])

  useEffect(() => {
    if (!locked) inputRef.current?.focus()
  }, [locked])

  const commit = (raw?: string) => {
    if (lockedRef.current) return
    const next = raw ?? draftRef.current
    // 空值不锁定：避免因失焦（如另一字段挂载抢焦点）把未输入的字段锁死。
    if (next.trim() === '') return
    lockedRef.current = true
    draftRef.current = next
    setDraft(next)
    setLocked(true)
    if (next !== value) onConfirm(next)
  }

  const unlock = () => {
    lockedRef.current = false
    setLocked(false)
  }

  const clear = () => {
    lockedRef.current = false
    draftRef.current = ''
    setDraft('')
    setLocked(false)
    onConfirm('')
  }

  return (
    <Space size="small" align="center" className="price-compare-meta-field">
      <span className="price-compare-sub">{label}</span>
      <Tooltip title={locked ? t('priceCompare.sheet.lock') : undefined}>
        <Input
          ref={inputRef}
          size="small"
          style={{ width }}
          className="price-compare-meta-input"
          value={draft}
          readOnly={locked}
          placeholder={placeholder}
          aria-label={label}
          onChange={(event) => {
            draftRef.current = event.target.value
            setDraft(event.target.value)
          }}
          onPressEnter={(event) =>
            commit((event.target as HTMLInputElement).value)
          }
          onBlur={(event) => commit((event.target as HTMLInputElement).value)}
        />
      </Tooltip>
      {locked ? (
        <>
          <Button size="small" type="link" onClick={unlock}>
            {t('priceCompare.sheet.unlock')}
          </Button>
          {draft ? (
            <Button size="small" type="link" onClick={clear}>
              {t('priceCompare.sheet.clear')}
            </Button>
          ) : null}
        </>
      ) : null}
    </Space>
  )
}
