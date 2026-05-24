import Alert from 'antd/es/alert'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Row from 'antd/es/row'
import Typography from 'antd/es/typography'
import type {
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import { isEditorFieldDisabledForModule } from '@/module-system/module-adapter-editor'
import { groupFieldsByRow } from '@/module-system/module-field-layout'
import { EditorFooterActions } from './EditorFooterActions'
import { FormFieldRenderer } from './FormFieldRenderer'

interface Props {
  config: ModulePageConfig
  moduleKey: string
  canSave: boolean
  canAudit: boolean
  saving: boolean
  showActions: boolean
  lineItemsLocked: boolean
  lockedLineItemsNotice: string
  onCancel: () => void
  onSave: (audit: boolean) => void
}

export function ModuleEditorFormSection({
  config,
  moduleKey,
  canSave,
  canAudit,
  saving,
  showActions,
  lineItemsLocked,
  lockedLineItemsNotice,
  onCancel,
  onSave,
}: Props) {
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const formFieldRows = groupFieldsByRow(config.formFields || [])

  if (!formFieldRows.length) {
    return null
  }

  const getFieldSpan = (field: ModuleFormFieldDefinition) => {
    if (typeof field.colSpan === 'number' && Number.isFinite(field.colSpan)) {
      return Math.max(6, Math.min(24, Math.trunc(field.colSpan)))
    }
    if (field.fullRow || field.type === 'textarea') {
      return 24
    }
    return 6
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
      <Form.Item name="_preallocatedId" hidden>
        <input />
      </Form.Item>
      <div className="editor-form-head">
        <div className="editor-form-title-block">
          <Typography.Title level={5} className="m-0">
            单据信息
          </Typography.Title>
        </div>
        {showActions ? (
          <div className="editor-form-actions">
            <EditorFooterActions
              canSave={canSave}
              canAudit={canAudit}
              saving={saving}
              onCancel={onCancel}
              onSave={onSave}
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
            <Col key={field.key} xs={24} sm={12} lg={getFieldSpan(field)}>
              <FormFieldRenderer
                field={field}
                disabled={isEditorFieldDisabledForModule(
                  moduleKey,
                  field.key,
                  Boolean(field.disabled),
                  canSave,
                  lineItemsLocked,
                  config.primaryNoKey,
                  config.parentImport?.parentFieldKey,
                  formValues,
                )}
              />
            </Col>
          ))}
        </Row>
      ))}
    </>
  )
}
