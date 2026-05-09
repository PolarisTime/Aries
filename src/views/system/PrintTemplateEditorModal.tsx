import type { FormInstance } from 'antd'
import { Col, Form, Input, Modal, Row, Select, Typography } from 'antd'
import { printTemplateTargetOptions } from '@/config/print-template-targets'

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
  return (
    <Modal
      title={editing ? '编辑模板' : '新建模板'}
      open={open}
      onCancel={onClose}
      onOk={onSave}
      confirmLoading={saving}
      width={900}
      mask={{ closable: false }}
      forceRender
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
        <Form.Item label="模板内容" required>
          <Input.TextArea
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
    </Modal>
  )
}
