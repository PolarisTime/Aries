import {
  ArrowLeftOutlined,
  CodeOutlined,
  FileTextOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import type { FormInstance } from 'antd'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useTranslation } from 'react-i18next'
import type { SettlementCompanyOption } from '@/api/company-settings'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'

interface Props {
  open: boolean
  editing: boolean
  form: FormInstance
  templateHtml: string
  settlementCompanyOptions: SettlementCompanyOption[]
  saving: boolean
  onTemplateHtmlChange: (value: string) => void
  onSave: () => void
  onClose: () => void
}

const commonFields = [
  'billNo',
  'orderNo',
  'outboundNo',
  'statementNo',
  'customerName',
  'supplierName',
  'carrierName',
  'projectName',
  'projectAddress',
  'vehiclePlate',
  'deliveryDate',
  'outboundDate',
  'orderDate',
  'inboundDate',
  'billTime',
  'startDate',
  'endDate',
  'totalQuantity',
  'totalWeight',
  'totalAmount',
  'totalFreight',
  'remark',
]

const detailFields = [
  'index',
  'sourceNo',
  'billTime',
  'category',
  'brand',
  'materialName',
  'material',
  'spec',
  'length',
  'quantity',
  'pieceWeightTon',
  'weightTon',
  'unitPrice',
  'amount',
  'warehouseName',
  'batchNo',
  'remark',
]

const layoutFields = [
  'printDate',
  'printTime',
  'dateYear',
  'dateMonth',
  'dateDay',
  'rowTop',
  'sumTop',
  'sumTop2',
  'emptyRowTop',
  'hasEmptyRows',
  'isSeparator',
  'groupName',
  'needsNewPage',
  'needsSeparator',
  'footerTop',
  'footerLineTop',
  'footerDateTop',
]

function defaultEngineForTemplateType(templateType: string) {
  if (templateType === 'COORD') return 'LODOP'
  if (templateType === 'PDF_FORM') return 'PDF_FORM'
  return 'LODOP'
}

function findSettlementCompanyOption(
  options: SettlementCompanyOption[],
  value: unknown,
) {
  const normalizedValue = value == null ? '' : String(value).trim()
  if (!normalizedValue) return undefined
  return (
    options.find((option) => String(option.value).trim() === normalizedValue) ??
    (typeof value === 'number'
      ? options.find((option) => Number(option.value) === value)
      : undefined)
  )
}

function FieldTags({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div>
      <Typography.Text strong>{title}</Typography.Text>
      <div className="mt-8">
        {fields.map((field) => (
          <Tag key={field} className="mb-4 font-mono">
            {field}
          </Tag>
        ))}
      </div>
    </div>
  )
}

export function PrintTemplateEditorModal({
  open,
  editing,
  form,
  templateHtml,
  settlementCompanyOptions,
  saving,
  onTemplateHtmlChange,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const templateHtmlId = buildFormControlId(
    'print-template-editor',
    'template-html',
  )

  if (!open) return null

  return (
    <div className="page-stack">
      <Card
        title={
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={onClose}>
              {t('common.back')}
            </Button>
            <Divider orientation="vertical" />
            <span>
              {editing
                ? t('system.printTemplateEditor.editTitle')
                : t('system.printTemplateEditor.createTitle')}
            </span>
          </Space>
        }
        extra={
          <Space>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={onSave}
            >
              {t('common.save')}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Row gutter={[16, 0]}>
            <Col xs={24} lg={16}>
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
                            label: t(
                              'system.printTemplateEditor.templateTypeCoord',
                            ),
                          },
                          {
                            value: 'PDF_FORM',
                            label: t(
                              'system.printTemplateEditor.templateTypePdfForm',
                            ),
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
                            label: t(
                              'system.printTemplateEditor.enginePdfForm',
                            ),
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
                        placeholder={t(
                          'system.printTemplateEditor.assetRefPlaceholder',
                        )}
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
                            label: t(
                              'system.printTemplateEditor.statusDisabled',
                            ),
                          },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card
                size="small"
                className="mt-16"
                title={
                  <Space>
                    <CodeOutlined />
                    <span>
                      {t('system.printTemplateEditor.templateContent')}
                    </span>
                  </Space>
                }
              >
                <Form.Item
                  {...buildLabeledFormItemProps({
                    label: t('system.printTemplateEditor.templateContent'),
                    htmlFor: templateHtmlId,
                  })}
                  required
                  className="mb-8"
                >
                  <Input.TextArea
                    id={templateHtmlId}
                    name="template-html"
                    value={templateHtml}
                    onChange={(event) =>
                      onTemplateHtmlChange(event.target.value)
                    }
                    rows={22}
                    placeholder={t(
                      'system.printTemplateEditor.templateContentPlaceholder',
                    )}
                    className="text-xs font-mono"
                  />
                </Form.Item>
                <Typography.Text type="secondary">
                  {t('system.printTemplateEditor.templateHint')}
                </Typography.Text>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Alert
                type="info"
                showIcon
                title={t('system.printTemplateEditor.helpTitle')}
                description={
                  <div className="space-y-3">
                    <Typography.Paragraph className="mb-0">
                      {t('system.printTemplateEditor.unifiedPrintApi')}
                    </Typography.Paragraph>
                    <Typography.Paragraph className="mb-0">
                      {t('system.printTemplateEditor.syntaxHint')}
                    </Typography.Paragraph>
                  </div>
                }
              />
              <Card
                size="small"
                className="mt-16"
                title={t('system.printTemplateEditor.availableFields')}
              >
                <Space orientation="vertical" size={16} className="w-full">
                  <FieldTags
                    title={t('system.printTemplateEditor.commonFields')}
                    fields={commonFields}
                  />
                  <FieldTags
                    title={t('system.printTemplateEditor.detailFields')}
                    fields={detailFields}
                  />
                  <FieldTags
                    title={t('system.printTemplateEditor.layoutFields')}
                    fields={layoutFields}
                  />
                </Space>
              </Card>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  )
}
