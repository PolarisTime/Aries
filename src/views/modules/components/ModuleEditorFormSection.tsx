import { Alert, Col, Divider, Form, Row, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { ProjectOption } from '@/api/master/project-options'
import { isEditorFieldDisabledForModule } from '@/module-system/adapter/module-adapter-editor'
import { usesSnowflakeBusinessNo } from '@/module-system/core/business-no-policy'
import { groupFieldsByRow } from '@/module-system/presentation/module-field-layout'
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
  if (!visibleFields.length) {
    return null
  }
  const formFieldGroups = groupFieldsBySection(visibleFields)

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
          {groupFieldsByRow(group.fields).map((fieldRow) => (
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
    </>
  )
}
