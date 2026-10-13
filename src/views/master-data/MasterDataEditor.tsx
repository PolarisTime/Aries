import type { FormInstance } from 'antd'
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from 'antd'
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
        showSearch={{ optionFilterProp: 'label' }}
        mode={field.multiple ? 'multiple' : undefined}
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
  // 按声明顺序分区: section 相同且相邻的字段归为一组; 未声明 section 的字段不渲染区块标题,
  // 这样材料资料等尚未分区的模块保持原样(平铺), 不影响本次改动的范围。
  const groups: Array<{ section?: string; fields: MasterFormFieldSpec[] }> = []
  for (const field of visibleFields) {
    const last = groups.at(-1)
    if (last && last.section === field.section) {
      last.fields.push(field)
    } else {
      groups.push({ section: field.section, fields: [field] })
    }
  }
  return (
    /*
      与项目资料编辑页同一套排版: 居中对话框(--form-dialog, 尺寸在 workspace-overlay.css)、
      表单节奏 master-form(横向 16 纵向 8)、按钮走 footer 槽固定在面板底部。
    */
    <WorkspaceOverlay
      open={open}
      title={title}
      className="workspace-overlay-panel--form-dialog"
      footer={
        <Space>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="primary" loading={saving} onClick={onSave}>
            {t('common.save')}
          </Button>
        </Space>
      }
      onClose={onClose}
    >
      <Form
        className="master-form"
        form={form}
        layout="vertical"
        disabled={saving}
        onValuesChange={(_, allValues) => onValuesChange(allValues)}
      >
        {groups.map((group, index) => (
          <section
            key={group.section ?? `ungrouped-${index}`}
            className="master-form-section"
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
            <Row gutter={[16, 8]}>
              {group.fields.map((field) => (
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
          </section>
        ))}
      </Form>
    </WorkspaceOverlay>
  )
}
