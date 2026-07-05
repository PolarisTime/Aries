import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Button, Card, Col, Divider, Form, Row, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import type { SettlementCompanyOption } from '@/api/company-settings'
import { buildFormControlId } from '@/utils/form-control-id'
import { PrintTemplateBasicInfoCard } from '@/views/system/PrintTemplateBasicInfoCard'
import { PrintTemplateContentCard } from '@/views/system/PrintTemplateContentCard'
import { PrintTemplateHelpPanel } from '@/views/system/PrintTemplateHelpPanel'

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
              <PrintTemplateBasicInfoCard
                form={form}
                settlementCompanyOptions={settlementCompanyOptions}
                t={t}
              />
              <PrintTemplateContentCard
                templateHtml={templateHtml}
                templateHtmlId={templateHtmlId}
                onTemplateHtmlChange={onTemplateHtmlChange}
                t={t}
              />
            </Col>
            <Col xs={24} lg={8}>
              <PrintTemplateHelpPanel t={t} />
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  )
}
