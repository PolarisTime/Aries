import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Col,
  Divider,
  Flex,
  Form,
  Row,
  Space,
  Steps,
  Typography,
} from 'antd'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import { isEditorFieldDisabledForModule } from '@/module-system/adapter/module-adapter-editor'
import {
  groupFieldsByRow,
  moveDocumentNoFieldsToSectionEnd,
} from '@/module-system/presentation/module-field-layout'
import type {
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import {
  type EditorWizardControl,
  getModuleFormFieldSpan,
  packWizardFieldRows,
  resolveVisibleModuleFormFields,
  resolveWizardStepTransition,
  scrollContainerToTop,
  shouldRenderWizardSectionDivider,
} from '@/views/modules/editor-wizard'
import { EditorFooterActions } from './EditorFooterActions'
import { FormFieldRenderer } from './FormFieldRenderer'

interface FormSectionActions {
  canSave: boolean
  canAudit: boolean
  saving: boolean
  visible: boolean
  onCancel: () => void
  onSave: (audit: boolean) => void
}

interface Props {
  config: ModulePageConfig
  moduleKey: string
  auditLabel?: string
  actions: FormSectionActions
  editorState: {
    isEdit: boolean
    lineItemsLocked: boolean
  }
  lockedLineItemsNotice: string
  authoritativePrimaryNo?: string
  /** 正在编辑的记录 ID（新建为空）。复合控件读写附属资源（如项目价格规定）时需要它。 */
  recordId?: string
  layoutVariant?: 'default' | 'finance'
  projectOptions?: readonly ProjectOption[]
  settlementAccountOptions?: readonly {
    label: string
    value: string | number | boolean
  }[]
  /**
   * 外部托管向导状态（由 `ModuleEditorOverlay` 传入，把进度与上/下一步收口到弹层固定底栏）。
   * 未传时组件保留非受控回退，独立渲染与既有单测不受影响。
   */
  wizard?: EditorWizardControl
}

const EMPTY_PROJECT_OPTIONS: readonly ProjectOption[] = []
const EMPTY_SETTLEMENT_ACCOUNT_OPTIONS: readonly {
  label: string
  value: string | number | boolean
}[] = []

/** 按声明顺序分区；section 相同且相邻的字段归为一组，未声明则平铺（不渲染区块标题）。 */
function groupFieldsBySection(
  fields: ModuleFormFieldDefinition[],
): Array<{ section?: string; fields: ModuleFormFieldDefinition[] }> {
  const groups: Array<{
    section?: string
    fields: ModuleFormFieldDefinition[]
  }> = []
  for (const field of fields) {
    const last = groups.at(-1)
    if (last && last.section === field.section) {
      last.fields.push(field)
    } else {
      groups.push({ section: field.section, fields: [field] })
    }
  }
  return groups
}

function EditorFormSectionHeader({
  isWizard,
  actions,
  auditLabel,
}: {
  isWizard: boolean
  actions: FormSectionActions
  auditLabel?: string
}) {
  const { t } = useTranslation()
  if (isWizard && !actions.visible) {
    return null
  }
  return (
    <div className="editor-form-head">
      {/*
       * 向导模式下不渲染「单据信息」标题：步骤条本身就是这一步的标题，
       * 而且基础资料（物流商 / 项目）不是单据，写「单据信息」是错的措辞。
       */}
      {isWizard ? null : (
        <div className="editor-form-title-block">
          <Typography.Title level={5} className="m-0">
            {t('modules.editorForm.documentInfo')}
          </Typography.Title>
        </div>
      )}
      {actions.visible ? (
        <div className="editor-form-actions">
          <EditorFooterActions
            canSave={actions.canSave}
            canAudit={actions.canAudit}
            auditLabel={auditLabel}
            saving={actions.saving}
            onCancel={actions.onCancel}
            onSave={actions.onSave}
          />
        </div>
      ) : null}
    </div>
  )
}

function WizardInlineNavigation({
  currentStep,
  totalSteps,
  onStepChange,
}: {
  currentStep: number
  totalSteps: number
  onStepChange: (nextStep: number) => void
}) {
  const { t } = useTranslation()
  const isLastStep = currentStep === totalSteps - 1
  return (
    <Flex
      align="center"
      className="editor-form-wizard-nav"
      gap={12}
      justify="space-between"
    >
      <Typography.Text type="secondary">
        {t('modules.editorForm.wizard.progress', {
          current: currentStep + 1,
          total: totalSteps,
        })}
      </Typography.Text>
      <Space size={8}>
        <Button
          disabled={currentStep === 0}
          icon={<LeftOutlined />}
          onClick={() => onStepChange(currentStep - 1)}
        >
          {t('modules.editorForm.wizard.previous')}
        </Button>
        {isLastStep ? null : (
          <Button
            icon={<RightOutlined />}
            iconPlacement="end"
            onClick={() => onStepChange(currentStep + 1)}
            type="primary"
          >
            {t('modules.editorForm.wizard.next')}
          </Button>
        )}
      </Space>
    </Flex>
  )
}

export function ModuleEditorFormSection({
  config,
  moduleKey,
  auditLabel,
  actions,
  editorState,
  lockedLineItemsNotice,
  authoritativePrimaryNo,
  recordId,
  layoutVariant = 'default',
  projectOptions = EMPTY_PROJECT_OPTIONS,
  settlementAccountOptions = EMPTY_SETTLEMENT_ACCOUNT_OPTIONS,
  wizard,
}: Props) {
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const rootAnchorRef = useRef<HTMLDivElement | null>(null)
  const visibleFields = resolveVisibleModuleFormFields({
    config,
    moduleKey,
    isEdit: editorState.isEdit,
    formValues,
  })
  const steps = config.formSteps ?? []
  const isWizard = steps.length > 0
  const [uncontrolledStep, setUncontrolledStep] = useState(0)
  const rawStep = wizard ? wizard.currentStep : uncontrolledStep
  const currentStep = isWizard
    ? Math.max(0, Math.min(rawStep, steps.length - 1))
    : 0
  const stepFields = isWizard
    ? visibleFields.filter((field) => field.formStep === currentStep + 1)
    : visibleFields

  const requestStepChange = async (rawNextStep: number) => {
    if (!isWizard) {
      return
    }
    if (wizard) {
      wizard.onStepChange(Math.max(0, Math.min(rawNextStep, steps.length - 1)))
      return
    }
    const outcome = await resolveWizardStepTransition({
      config,
      moduleKey,
      isEdit: editorState.isEdit,
      currentStep,
      rawNextStep,
      form,
    })
    if (outcome.kind === 'move') {
      setUncontrolledStep(outcome.stepIndex)
      scrollContainerToTop(
        rootAnchorRef.current?.closest<HTMLElement>(
          '.workspace-overlay-body',
        ) ?? null,
      )
    }
  }

  if (!visibleFields.length) {
    return null
  }

  // 抬头统一口径：业务对象在前，主单号与来源单号排到同段常规字段末尾（不跨过整行备注）。
  const documentNoKeys = [
    config.primaryNoKey,
    config.parentImport?.parentFieldKey,
    ...(config.sourceNoKeys ?? []),
  ].filter((key): key is string => Boolean(key))
  const formFieldGroups = groupFieldsBySection(
    moveDocumentNoFieldsToSectionEnd(stepFields, documentNoKeys),
  )

  return (
    <div ref={rootAnchorRef}>
      {lockedLineItemsNotice ? (
        <Alert
          type="warning"
          showIcon
          title={lockedLineItemsNotice}
          className="mb-12"
        />
      ) : null}
      <EditorFormSectionHeader
        isWizard={isWizard}
        actions={actions}
        auditLabel={auditLabel}
      />
      {isWizard ? (
        <Steps
          className="editor-form-wizard-steps"
          current={currentStep}
          items={steps.map((step) => ({
            title: step.title,
            ...(step.subTitle ? { subTitle: step.subTitle } : {}),
          }))}
          onChange={(next) => {
            void requestStepChange(next)
          }}
          type="navigation"
        />
      ) : null}
      {formFieldGroups.map((group) => (
        <section
          /* 未分区时不能用数组下标做 key：字段增删会让 React 错配 DOM 状态 */
          key={
            group.section ?? group.fields.map((field) => field.key).join('|')
          }
          className="editor-form-section"
        >
          {shouldRenderWizardSectionDivider({
            isWizard,
            steps,
            currentStep,
            groups: formFieldGroups,
            section: group.section,
          }) ? (
            <Divider
              className="master-section-divider"
              plain
              titlePlacement="start"
            >
              {group.section}
            </Divider>
          ) : null}
          {(isWizard
            ? packWizardFieldRows(group.fields, layoutVariant)
            : groupFieldsByRow(group.fields)
          ).map((fieldRow) => (
            <Row
              key={fieldRow.map((field) => field.key).join('-')}
              /* 纵向 8px：字段栅格沿用主数据弹层的 [16, 8] 节奏（AGENTS.md《间距》）。 */
              gutter={[16, 8]}
              className="editor-form-row"
            >
              {fieldRow.map((field: ModuleFormFieldDefinition) => (
                <Col
                  key={field.key}
                  span={getModuleFormFieldSpan(field, layoutVariant)}
                >
                  <FormFieldRenderer
                    field={field}
                    recordId={recordId}
                    projectOptions={projectOptions}
                    settlementAccountOptions={settlementAccountOptions}
                    disabled={isEditorFieldDisabledForModule(
                      moduleKey,
                      field.key,
                      Boolean(
                        field.disabled || field.disabledWhen?.(formValues),
                      ),
                      actions.canSave && !actions.saving,
                      editorState.lineItemsLocked,
                      config.primaryNoKey,
                      config.parentImport?.parentFieldKey,
                      formValues,
                      authoritativePrimaryNo,
                    )}
                  />
                </Col>
              ))}
            </Row>
          ))}
        </section>
      ))}
      {isWizard && !wizard?.hideInlineNav ? (
        <WizardInlineNavigation
          currentStep={currentStep}
          totalSteps={steps.length}
          onStepChange={(nextStep) => {
            void requestStepChange(nextStep)
          }}
        />
      ) : null}
    </div>
  )
}
