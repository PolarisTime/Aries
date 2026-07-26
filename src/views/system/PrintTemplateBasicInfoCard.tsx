import { FileTextOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Card, Col, Form, Input, InputNumber, Row, Select, Space } from 'antd'
import type { SettlementCompanyOption } from '@/api/system/company-settings'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import {
  defaultEngineForTemplateType,
  findSettlementCompanyOption,
  type PrintTemplateEditorFormValues,
} from '@/views/system/print-template-editor-utils'

interface PrintTemplateBasicInfoCardProps {
  form: FormInstance<PrintTemplateEditorFormValues>
  settlementCompanyOptions: SettlementCompanyOption[]
  t: (key: string) => string
}

export function PrintTemplateBasicInfoCard({
  form,
  settlementCompanyOptions,
  t,
}: PrintTemplateBasicInfoCardProps) {
  return (
    <Card
      size="small"
      title={
        <Space>
          <FileTextOutlined />
          <span>{t('system.printTemplateEditor.basicInfo')}</span>
        </Space>
      }
    >
      <Row gutter={[16, 0]}>
        <Col span={12}>
          <Form.Item
            name="billType"
            label={t('system.printTemplateEditor.billType')}
            rules={[{ required: true }]}
          >
            <Select options={printTemplateTargetOptions} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="templateName"
            label={t('system.printTemplateEditor.templateName')}
            rules={[{ required: true, whitespace: true }, { max: 64 }]}
          >
            <Input
              placeholder={t(
                'system.printTemplateEditor.templateNamePlaceholder',
              )}
              maxLength={64}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="templateCode"
            label={t('system.printTemplateEditor.templateCode')}
            rules={[{ max: 96 }]}
          >
            <Input
              placeholder={t(
                'system.printTemplateEditor.templateCodePlaceholder',
              )}
              maxLength={96}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="templateType"
            label={t('system.printTemplateEditor.templateType')}
            rules={[{ required: true }]}
          >
            <Select
              onChange={(value) =>
                form.setFieldValue(
                  'engine',
                  defaultEngineForTemplateType(value),
                )
              }
              options={[
                {
                  value: 'COORD',
                  label: t('system.printTemplateEditor.templateTypeCoord'),
                },
                {
                  value: 'PDF_FORM',
                  label: t('system.printTemplateEditor.templateTypePdfForm'),
                },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="engine"
            label={t('system.printTemplateEditor.engine')}
            rules={[{ required: true }]}
          >
            <Select
              disabled
              options={[
                {
                  value: 'LODOP',
                  label: t('system.printTemplateEditor.engineLodop'),
                },
                {
                  value: 'PDF_FORM',
                  label: t('system.printTemplateEditor.enginePdfForm'),
                },
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="assetRef"
            label={t('system.printTemplateEditor.assetRef')}
            rules={[{ max: 255 }]}
          >
            <Input
              placeholder={t('system.printTemplateEditor.assetRefPlaceholder')}
              maxLength={255}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="settlementCompanyId"
            label={t('system.printTemplateEditor.settlementCompany')}
          >
            <Select
              allowClear
              options={settlementCompanyOptions}
              placeholder={t(
                'system.printTemplateEditor.settlementCompanyPlaceholder',
              )}
              showSearch={{ optionFilterProp: 'label' }}
              onChange={(value) => {
                const matched = findSettlementCompanyOption(
                  settlementCompanyOptions,
                  value,
                )
                form.setFieldValue(
                  'settlementCompanyId',
                  matched?.value ?? undefined,
                )
                form.setFieldValue(
                  'settlementCompanyName',
                  matched?.companyName || '',
                )
              }}
            />
          </Form.Item>
          <Form.Item name="settlementCompanyName" hidden>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="versionNo"
            label={t('system.printTemplateEditor.versionNo')}
            rules={[{ type: 'integer', min: 1 }]}
          >
            <InputNumber min={1} precision={0} className="w-full" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="status"
            label={t('system.printTemplateEditor.status')}
            rules={[{ required: true }]}
          >
            <Select
              options={[
                {
                  value: 'ACTIVE',
                  label: t('system.printTemplateEditor.statusActive'),
                },
                {
                  value: 'DISABLED',
                  label: t('system.printTemplateEditor.statusDisabled'),
                },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  )
}
