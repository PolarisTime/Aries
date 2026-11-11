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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import { isEditorFieldDisabledForModule } from '@/module-system/adapter/module-adapter-editor'
import { usesSnowflakeBusinessNo } from '@/module-system/core/business-no-policy'
import {
  groupFieldsByRow,
  moveDocumentNoFieldsToSectionEnd,
} from '@/module-system/presentation/module-field-layout'
import { isModuleFormFieldVisible } from '@/module-system/presentation/module-form-field-visibility'
import type {
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import { EditorFooterActions } from './EditorFooterActions'
import { FormFieldRenderer } from './FormFieldRenderer'

interface Props {
  config: ModulePageConfig
  moduleKey: string
  auditLabel?: string
  actions: {
    canSave: boolean
    canAudit: boolean
    saving: boolean
    visible: boolean
    onCancel: () => void
    onSave: (audit: boolean) => void
  }
  editorState: {
    isEdit: boolean
    lineItemsLocked: boolean
  }
  lockedLineItemsNotice: string
  authoritativePrimaryNo?: string
  layoutVariant?: 'default' | 'finance'
  projectOptions?: readonly ProjectOption[]
  settlementAccountOptions?: readonly {
    label: string
    value: string | number | boolean
  }[]
}

const EMPTY_PROJECT_OPTIONS: readonly ProjectOption[] = []
const EMPTY_SETTLEMENT_ACCOUNT_OPTIONS: readonly {
  label: string
  value: string | number | boolean
}[] = []

function getFieldSpan(
  field: ModuleFormFieldDefinition,
  layoutVariant: 'default' | 'finance',
) {
  if (typeof field.colSpan === 'number' && Number.isFinite(field.colSpan)) {
    const span = Math.max(6, Math.min(24, Math.trunc(field.colSpan)))
    return layoutVariant === 'finance' && span === 6 ? 8 : span
  }
  if (field.fullRow || field.type === 'textarea') {
    return 24
  }
  return layoutVariant === 'finance' ? 12 : 6
}

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

export function ModuleEditorFormSection({
  config,
  moduleKey,
  auditLabel,
  actions,
  editorState,
  lockedLineItemsNotice,
  authoritativePrimaryNo,
  layoutVariant = 'default',
  projectOptions = EMPTY_PROJECT_OPTIONS,
  settlementAccountOptions = EMPTY_SETTLEMENT_ACCOUNT_OPTIONS,
}: Props) {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const visibleFields = (config.formFields || []).filter(
    (field) =>
      isModuleFormFieldVisible(field, formValues) &&
      !(
        !editorState.isEdit &&
        !config.showGeneratedPrimaryNoOnCreate &&
        field.key === config.primaryNoKey &&
        usesSnowflakeBusinessNo(moduleKey, config.primaryNoKey)
      ),
  )
  /*
   * 多步录入向导：只有页面声明了 `formSteps` 才启用（收款单 / 付款单）。
   * 未声明的模块走原来的单页表单，DOM 与行为完全不变。
   *
   * <p>分步用**条件渲染**而不是 CSS 隐藏：未挂载的字段 antd 默认 `preserve` 仍保留其值，
   * 因此在任意一步保存时 `validateFields()` 依旧能校验到全部步骤；而 DOM 里只留当前步，
   * 屏幕阅读器与 Tab 键不会跑进看不见的字段。</p>
   */
  const steps = config.formSteps ?? []
  const isWizard = steps.length > 0
  const [currentStep, setCurrentStep] = useState(0)
  const isLastStep = currentStep === steps.length - 1
  /* 当前步实际挂载的字段（visibleFields 已按 visibleWhen / 自动单号规则过滤过）。 */
  const stepFields = isWizard
    ? visibleFields.filter((field) => field.formStep === currentStep + 1)
    : visibleFields
  /* 「下一步」只校验本步：不提前报后面步骤的错误。 */
  const goNext = async () => {
    try {
      await form.validateFields(stepFields.map((field) => field.key))
      setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
    } catch {
      /* 校验失败时 antd 已在字段下方给出提示，这里不再重复 toast */
    }
  }

  if (!visibleFields.length) {
    return null
  }
  // 抬头统一口径：客户/供应商（公司）、项目等业务对象在前，主单号与来源单号排到同一 section 段末尾。
  const documentNoKeys = [
    config.primaryNoKey,
    config.parentImport?.parentFieldKey,
    ...(config.sourceNoKeys ?? []),
  ].filter((key): key is string => Boolean(key))
  const formFieldGroups = groupFieldsBySection(
    moveDocumentNoFieldsToSectionEnd(stepFields, documentNoKeys),
  )
  /*
   * 向导模式下按 colSpan 重新打包每行：`groupFieldsByRow` 依赖字段声明的 `row`，
   * 而 `row` 是**单页**表单里的行号 —— 拆成三步后同一步里的 row 会不连续
   * （如 step 1 只有 row 1、2、4），继续按 row 分组会把三个字段竖向堆在左列、
   * 右列空着。这里在每一步内部按 24 栅格重新打包，保证两列铺满。
   */
  const packFieldRows = (fields: ModuleFormFieldDefinition[]) => {
    const rows: ModuleFormFieldDefinition[][] = []
    let current: ModuleFormFieldDefinition[] = []
    let spanSum = 0
    for (const field of fields) {
      const span = getFieldSpan(field, layoutVariant)
      if (current.length > 0 && spanSum + span > 24) {
        rows.push(current)
        current = []
        spanSum = 0
      }
      current.push(field)
      spanSum += span
      if (spanSum >= 24) {
        rows.push(current)
        current = []
        spanSum = 0
      }
    }
    if (current.length > 0) rows.push(current)
    return rows
  }

  return (
    <>
      {lockedLineItemsNotice ? (
        <Alert
          type="warning"
          showIcon
          title={lockedLineItemsNotice}
          className="mb-12"
        />
      ) : null}
      <div className="editor-form-head">
        <div className="editor-form-title-block">
          <Typography.Title level={5} className="m-0">
            {t('modules.editorForm.documentInfo')}
          </Typography.Title>
        </div>
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
      {isWizard ? (
        /*
         * antd 官方多步导航（type="navigation"）：已完成步骤可点回跳，
         * 未完成的步骤不可越过校验 —— onChange 里只允许往小走。
         */
        <Steps
          className="editor-form-wizard-steps"
          current={currentStep}
          items={steps.map((step) => ({
            title: step.title,
            ...(step.subTitle ? { subTitle: step.subTitle } : {}),
          }))}
          onChange={(next) => {
            if (next <= currentStep) setCurrentStep(next)
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
          {group.section ? (
            <Divider
              className="master-section-divider"
              plain
              titlePlacement="start"
            >
              {group.section}
            </Divider>
          ) : null}
          {(isWizard
            ? packFieldRows(group.fields)
            : groupFieldsByRow(group.fields)
          ).map((fieldRow) => (
            <Row
              key={fieldRow.map((field) => field.key).join('-')}
              /* 纵向 8px：字段栅格沿用主数据弹层的 [16, 8] 节奏（AGENTS.md《间距》）。 */
              gutter={[16, 8]}
              className="editor-form-row"
            >
              {fieldRow.map((field: ModuleFormFieldDefinition) => (
                <Col key={field.key} span={getFieldSpan(field, layoutVariant)}>
                  <FormFieldRenderer
                    field={field}
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
      {isWizard ? (
        <Flex
          align="center"
          className="editor-form-wizard-nav"
          gap={12}
          justify="space-between"
        >
          <Typography.Text type="secondary">
            {t('modules.editorForm.wizard.progress', {
              current: currentStep + 1,
              total: steps.length,
            })}
          </Typography.Text>
          <Space size={8}>
            <Button
              disabled={currentStep === 0}
              icon={<LeftOutlined />}
              onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            >
              {t('modules.editorForm.wizard.previous')}
            </Button>
            {isLastStep ? null : (
              <Button
                icon={<RightOutlined />}
                iconPlacement="end"
                onClick={() => void goNext()}
                type="primary"
              >
                {t('modules.editorForm.wizard.next')}
              </Button>
            )}
          </Space>
        </Flex>
      ) : null}
    </>
  )
}
