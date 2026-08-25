import { Alert, Col, Form, Row, Typography } from 'antd'
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
  settlementAccountOptions = [],
}: Props) {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const formFieldRows = groupFieldsByRow(
    (config.formFields || []).filter(
      (field) =>
        isModuleFormFieldVisible(field, formValues) &&
        !(
          !editorState.isEdit &&
          !config.showGeneratedPrimaryNoOnCreate &&
          field.key === config.primaryNoKey &&
          usesSnowflakeBusinessNo(moduleKey, config.primaryNoKey)
        ),
    ),
  )
  if (!formFieldRows.length) {
    return null
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
      {formFieldRows.map((fieldRow) => (
        <Row
          key={fieldRow.map((field) => field.key).join('-')}
          gutter={[16, 0]}
          className="editor-form-row"
        >
          {fieldRow.map((field: ModuleFormFieldDefinition) => (
            <Col key={field.key} span={getFieldSpan(field, layoutVariant)}>
              <FormFieldRenderer
                field={field}
                moduleKey={moduleKey}
                projectOptions={projectOptions}
                settlementAccountOptions={settlementAccountOptions}
                financeLayout={layoutVariant === 'finance'}
                disabled={isEditorFieldDisabledForModule(
                  moduleKey,
                  field.key,
                  Boolean(field.disabled || field.disabledWhen?.(formValues)),
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
    </>
  )
}
