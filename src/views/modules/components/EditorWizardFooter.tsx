import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { EditorFooterActions } from './EditorFooterActions'

interface Props {
  currentStep: number
  totalSteps: number
  isEdit: boolean
  canSave: boolean
  canAudit: boolean
  auditLabel?: string
  saving: boolean
  onPrevious: () => void
  onNext: () => void
  onCancel: () => void
  onSave: (audit: boolean) => void
}

/**
 * 多步录入向导的统一固定底栏（渲染在 `WorkspaceOverlay` 的 `footer` 槽）。
 *
 * <p>左侧展示步骤进度（第 X / N 步），右侧统一排布「取消 / 上一步 / 下一步 / 保存（及保存并审核）」，
 * 并严格保证任意状态下同一底栏至多只有一个 `primary` 主按钮：</p>
 * <ul>
 *   <li>新建态非末步（或只读非末步）：「下一步」为主按钮，「保存 / 保存并审核」降为默认样式；</li>
 *   <li>编辑态或末步：「保存 / 保存并审核」为主按钮，「下一步」为默认样式（末步隐藏「下一步」）。</li>
 * </ul>
 */
export function EditorWizardFooter({
  currentStep,
  totalSteps,
  isEdit,
  canSave,
  canAudit,
  auditLabel,
  saving,
  onPrevious,
  onNext,
  onCancel,
  onSave,
}: Props) {
  const { t } = useTranslation()
  const isFirstStep = currentStep <= 0
  const isLastStep = currentStep >= totalSteps - 1
  const hasSubmitAction = canSave || canAudit
  const nextIsPrimary = !isLastStep && (!isEdit || !hasSubmitAction)

  return (
    <Flex
      align="center"
      className="editor-wizard-footer"
      gap={12}
      justify="space-between"
    >
      <Typography.Text type="secondary">
        {t('modules.editorForm.wizard.progress', {
          current: currentStep + 1,
          total: totalSteps,
        })}
      </Typography.Text>
      <EditorFooterActions
        auditLabel={auditLabel}
        beforeSaveActions={
          <>
            <Button
              className="overlay-action-button"
              disabled={isFirstStep || saving}
              icon={<LeftOutlined />}
              onClick={onPrevious}
            >
              {t('modules.editorForm.wizard.previous')}
            </Button>
            {isLastStep ? null : (
              <Button
                className="overlay-action-button"
                disabled={saving}
                icon={<RightOutlined />}
                iconPlacement="end"
                onClick={onNext}
                type={nextIsPrimary ? 'primary' : 'default'}
              >
                {t('modules.editorForm.wizard.next')}
              </Button>
            )}
          </>
        }
        canAudit={canAudit}
        canSave={canSave}
        onCancel={onCancel}
        onSave={onSave}
        primaryAction={!nextIsPrimary}
        saving={saving}
      />
    </Flex>
  )
}
