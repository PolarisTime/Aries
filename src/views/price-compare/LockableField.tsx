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

interface FieldState {
  /** 派生该草稿时的父级 value: 不一致说明父级换了值(切项目/回填), 当前本地编辑作废。 */
  base: string
  draft: string
  locked: boolean
}

const createFieldState = (value: string): FieldState => ({
  base: value,
  draft: value,
  locked: Boolean(value.trim()),
})

/**
 * 可锁定单元格字段: 回车或失焦确认后变只读, 需点「解锁」再次编辑,
 * 「清除」可清空; 锁状态仅本地维护, 值由父级按项目存取。
 *
 * <p>锁定层级中最内层(单元格级): 只冻结本字段, 与单据级「锁定规格和数量」、
 * 行级「锁定该行」作用域不重叠, 因此不叠加、也互不覆盖。提示文案必须与实际
 * 交互一致 —— 锁定态提示"点「解锁」后可编辑", 而不是让用户去点只读输入框。</p>
 *
 * <p>草稿以父级 value 为基线在渲染期派生: 父级换值(切项目/回填)时自动回到新基线,
 * 不需要用 effect 同步 setState 再触发一次渲染。</p>
 */
export function LockableField({
  label,
  value,
  placeholder,
  width = 160,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  const [field, setField] = useState<FieldState>(() => createFieldState(value))
  // value 变化即视为新基线, 本地未提交的编辑随之作废(与原实现一致)
  const current = field.base === value ? field : createFieldState(value)
  const { draft, locked } = current
  const lockedRef = useRef(locked)
  const draftRef = useRef(draft)
  const inputRef = useRef<InputRef | null>(null)

  // ref 只服务事件回调读取最新值(回调可能晚于渲染触发), 不参与渲染
  useEffect(() => {
    lockedRef.current = locked
  }, [locked])

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    if (!locked) inputRef.current?.focus()
  }, [locked])

  const patchField = (patch: Partial<FieldState>) => {
    setField({ ...current, base: value, ...patch })
  }

  const commit = (raw?: string) => {
    if (lockedRef.current) return
    const next = raw ?? draftRef.current
    // 空值不锁定：避免因失焦（如另一字段挂载抢焦点）把未输入的字段锁死。
    if (next.trim() === '') return
    lockedRef.current = true
    draftRef.current = next
    patchField({ draft: next, locked: true })
    if (next !== value) onConfirm(next)
  }

  const unlock = () => {
    lockedRef.current = false
    patchField({ locked: false })
  }

  const clear = () => {
    lockedRef.current = false
    draftRef.current = ''
    patchField({ draft: '', locked: false })
    onConfirm('')
  }

  return (
    <Space size="small" align="center" className="price-compare-meta-field">
      <span className="price-compare-sub">{label}</span>
      <Tooltip
        title={locked ? t('priceCompare.sheet.cellLockedHint') : undefined}
      >
        <Input
          ref={inputRef}
          size="small"
          style={{ width }}
          className="price-compare-meta-input"
          value={draft}
          readOnly={locked}
          // readOnly 的输入框在既有实现里只读但仍会获得焦点: 语义上标明只读,
          // 让读屏用户知道不是"没反应", 而是被锁定。
          aria-readonly={locked || undefined}
          placeholder={placeholder}
          aria-label={label}
          onChange={(event) => {
            draftRef.current = event.target.value
            patchField({ draft: event.target.value })
          }}
          onPressEnter={(event) =>
            commit((event.target as HTMLInputElement).value)
          }
          onBlur={(event) => commit(event.currentTarget.value)}
        />
      </Tooltip>
      {locked ? (
        <>
          <Button
            size="small"
            type="link"
            aria-label={t('priceCompare.sheet.unlockField', { label })}
            onClick={unlock}
          >
            {t('priceCompare.sheet.unlock')}
          </Button>
          {draft ? (
            <Button
              size="small"
              type="link"
              aria-label={t('priceCompare.sheet.clearField', { label })}
              onClick={clear}
            >
              {t('priceCompare.sheet.clear')}
            </Button>
          ) : null}
        </>
      ) : null}
    </Space>
  )
}
