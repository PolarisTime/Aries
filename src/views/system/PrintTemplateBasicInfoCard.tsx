import { FileTextOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Card, Col, Form, Input, Row, Select, Space } from 'antd'
import type { SettlementCompanyOption } from '@/api/company-settings'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import {
  defaultEngineForTemplateType,
  findSettlementCompanyOption,
} from '@/views/system/print-template-editor-utils'

interface PrintTemplateBasicInfoCardProps {
  form: FormInstance
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
        <Col xs={24} md={12}>
          <Form.Item
            name="billType"
            label={t('system.printTemplateEditor.billType')}
            required
          >
            <Select options={printTemplateTargetOptions} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="templateName"
            label={t('system.printTemplateEditor.templateName')}
            required
          >
            <Input
              placeholder={t(
                'system.printTemplateEditor.templateNamePlaceholder',
              )}
              maxLength={64}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="templateCode"
            label={t('system.printTemplateEditor.templateCode')}
          >
            <Input
              placeholder={t(
                'system.printTemplateEditor.templateCodePlaceholder',
              )}
              maxLength={96}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="templateType"
            label={t('system.printTemplateEditor.templateType')}
            required
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
        <Col xs={24} md={12}>
          <Form.Item
            name="engine"
            label={t('system.printTemplateEditor.engine')}
            required
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
        <Col xs={24} md={12}>
          <Form.Item
            name="assetRef"
            label={t('system.printTemplateEditor.assetRef')}
          >
            <Input
              placeholder={t('system.printTemplateEditor.assetRefPlaceholder')}
              maxLength={255}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
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
        <Col xs={24} md={12}>
          <Form.Item
            name="versionNo"
            label={t('system.printTemplateEditor.versionNo')}
          >
            <Input type="number" min={1} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="status"
            label={t('system.printTemplateEditor.status')}
            required
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
