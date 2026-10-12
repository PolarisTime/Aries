import { Button, Space } from 'antd'
import { useTranslation } from 'react-i18next'

/**
 * 向导类弹层的底部操作条（上一步 / 下一步 / 保存 / 取消）。
 *
 * <p>角色向导与用户配置向导的这段结构原本各写一份（react-doctor 报
 * `duplicate-jsx-subtree`），两处唯一差异是「上一步 / 下一步」的 i18n key，
 * 因此用 props 传入已翻译文案，其余按钮语义与样式只维护一份。</p>
 */
export interface WizardFooterActionsProps {
  current: number
  saving: boolean
  previousLabel: string
  nextLabel: string
  onPrevious: () => void
  onNext: () => void
  onSubmit: () => void
  onClose: () => void
}

export function WizardFooterActions({
  current,
  saving,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onSubmit,
  onClose,
}: WizardFooterActionsProps) {
  const { t } = useTranslation()
  return (
    <div style={{ marginTop: 16, textAlign: 'right' }}>
      <Space>
        {current === 1 ? (
          <Button onClick={onPrevious}>{previousLabel}</Button>
        ) : null}
        {current === 0 ? (
          <Button type="primary" onClick={onNext}>
            {nextLabel}
          </Button>
        ) : (
          <Button type="primary" loading={saving} onClick={onSubmit}>
            {t('common.save')}
          </Button>
        )}
        <Button onClick={onClose}>{t('common.cancel')}</Button>
      </Space>
    </div>
  )
}
