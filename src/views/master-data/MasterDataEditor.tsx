import type { FormInstance } from 'antd'
import { Button, Col, Form, Input, InputNumber, Row, Select, Space } from 'antd'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { WorkspaceOverlay } from '@/views/modules/components/WorkspaceOverlay'
import type { MasterFormFieldSpec, MasterFormValues } from './master-data-types'

interface Props {
  open: boolean
  title: string
  form: FormInstance<MasterFormValues>
  formFields: MasterFormFieldSpec[]
  formValues: MasterFormValues
  saving: boolean
  onValuesChange: (values: MasterFormValues) => void
  onClose: () => void
  onSave: () => void
}

function renderFieldControl(field: MasterFormFieldSpec): ReactNode {
  if (field.type === 'select') {
    return (
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        placeholder={field.placeholder}
        options={field.options}
      />
    )
  }
  if (field.type === 'number') {
    return (
      <InputNumber
        style={{ width: '100%' }}
        min={field.min}
        precision={field.precision}
      />
    )
  }
  if (field.type === 'textarea') {
    return <Input.TextArea rows={3} />
  }
  return (
    <Input
      disabled={field.disabled}
      placeholder={field.placeholder}
      maxLength={field.maxLength}
    />
  )
}

export function MasterDataEditor({
  open,
  title,
  form,
  formFields,
  formValues,
  saving,
  onValuesChange,
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation()
  const visibleFields = formFields.flatMap((field) =>
    !field.visibleWhen || field.visibleWhen(formValues) ? [field] : [],
  )
  return (
    <WorkspaceOverlay open={open} title={title} onClose={onClose}>
      <Form
        form={form}
        layout="vertical"
        disabled={saving}
        onValuesChange={(_, allValues) => onValuesChange(allValues)}
      >
        <Row gutter={[12, 12]}>
          {visibleFields.map((field) => (
            <Col key={field.key} span={field.fullRow ? 24 : 6}>
              <Form.Item
                name={field.key}
                label={field.label}
                initialValue={field.defaultValue}
                rules={
                  field.required
                    ? [
                        {
                          required: true,
                          message: t('modules.formField.inputRequired', {
                            label: field.label,
                          }),
                        },
                      ]
                    : undefined
                }
              >
                {renderFieldControl(field)}
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
      <div className="workspace-overlay-footer">
        <Space>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" loading={saving} onClick={onSave}>
            {t('common.save')}
          </Button>
        </Space>
      </div>
    </WorkspaceOverlay>
  )
}
