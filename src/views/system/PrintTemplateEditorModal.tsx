import type { FormInstance } from 'antd'
import Col from 'antd/es/col'
import Form from 'antd/es/form'
import Input from 'antd/es/input'
import { FormModal } from '@/components/FormModal'
import Row from 'antd/es/row'
import Select from 'antd/es/select'
import Typography from 'antd/es/typography'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'

interface Props {
  open: boolean
  editing: boolean
  form: FormInstance
  templateHtml: string
  saving: boolean
  onTemplateHtmlChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}

export function PrintTemplateEditorModal({
  open,
  editing,
  form,
  templateHtml,
  saving,
  onTemplateHtmlChange,
  onSave,
  onClose,
}: Props) {
  const templateHtmlId = buildFormControlId(
    'print-template-editor',
    'template-html',
  )

  return (
    <FormModal
      title={editing ? '编辑模板' : '新建模板'}
      open={open}
      onClose={onClose}
      onSave={onSave}
      confirmLoading={saving}
      width={900}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="billType" label="单据类型" required>
              <Select options={printTemplateTargetOptions} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="templateName" label="模板名称" required>
              <Input placeholder="请输入模板名称" maxLength={64} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="isDefault" label="默认模板">
              <Select
                options={[
                  { label: '是', value: true },
                  { label: '否', value: false },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          {...buildLabeledFormItemProps({
            label: '模板内容',
            htmlFor: templateHtmlId,
          })}
          required
        >
          <Input.TextArea
            id={templateHtmlId}
            name="template-html"
            value={templateHtml}
            onChange={(event) => onTemplateHtmlChange(event.target.value)}
            rows={16}
            placeholder="请输入 HTML 模板内容"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </Form.Item>
        <Typography.Text type="secondary">
          支持 HTML 模板和 LODOP 指令。使用 {'{{字段名}}'} 语法插入动态数据。
        </Typography.Text>
      </Form>
    </FormModal>
  )
}
