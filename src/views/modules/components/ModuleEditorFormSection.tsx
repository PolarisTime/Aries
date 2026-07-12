import { ImportOutlined } from '@ant-design/icons'
import { Alert, Button, Col, Form, Row, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { isEditorFieldDisabledForModule } from '@/module-system/module-adapter-editor'
import { groupFieldsByRow } from '@/module-system/module-field-layout'
import { isModuleFormFieldVisible } from '@/module-system/module-form-field-visibility'
import type {
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
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
  parentImporting: boolean
  authoritativePrimaryNo?: string
  layoutVariant?: 'default' | 'finance'
  onCancel: () => void
  onOpenParentSelector: () => void
  onSave: (audit: boolean) => void
}

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
  return layoutVariant === 'finance' ? 8 : 6
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
  parentImporting,
  authoritativePrimaryNo,
  layoutVariant = 'default',
  onCancel,
  onOpenParentSelector,
  onSave,
}: Props) {
  const { t } = useTranslation()
  const form = Form.useFormInstance()
  const formValues = Form.useWatch([], form) || {}
  const formFieldRows = groupFieldsByRow(
    (config.formFields || []).filter((field) =>
      isModuleFormFieldVisible(field, formValues),
    ),
  )
  const parentImportVisible = Boolean(
    config.parentImport &&
      (config.parentImport.visibleWhen?.(formValues) ?? true),
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
      <Form.Item name="_preallocatedId" hidden initialValue="">
        <input aria-label="Preallocated ID" />
      </Form.Item>
      <div className="editor-form-head">
        <div className="editor-form-title-block">
          <Typography.Title level={5} className="m-0">
            {t('modules.editorForm.documentInfo')}
          </Typography.Title>
        </div>
        {showActions ? (
          <div className="editor-form-actions">
            {parentImportVisible ? (
              <Button
                htmlType="button"
                icon={<ImportOutlined />}
                loading={parentImporting}
                disabled={!canSave}
                onClick={onOpenParentSelector}
              >
                {config.parentImport?.buttonText ||
                  t('modules.itemsSection.importItems', {
                    label:
                      config.parentImport?.label ||
                      t('modules.itemsSection.parentDoc'),
                  })}
              </Button>
            ) : null}
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
            <Col
              key={field.key}
              xs={24}
              sm={12}
              lg={getFieldSpan(field, layoutVariant)}
            >
              <FormFieldRenderer
                field={field}
                disabled={isEditorFieldDisabledForModule(
                  moduleKey,
                  field.key,
                  Boolean(field.disabled || field.disabledWhen?.(formValues)),
                  canSave,
                  lineItemsLocked,
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
