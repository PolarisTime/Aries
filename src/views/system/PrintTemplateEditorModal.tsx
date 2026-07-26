import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Button, Col, Flex, Form, Row, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import type { SettlementCompanyOption } from '@/api/system/company-settings'
import { AppProPage } from '@/components/AppProPage'
import { buildFormControlId } from '@/utils/form-control-id'
import { PrintTemplateBasicInfoCard } from '@/views/system/PrintTemplateBasicInfoCard'
import { PrintTemplateContentCard } from '@/views/system/PrintTemplateContentCard'
import { PrintTemplateHelpPanel } from '@/views/system/PrintTemplateHelpPanel'
import type { PrintTemplateEditorFormValues } from '@/views/system/print-template-editor-utils'

interface Props {
  open: boolean
  editing: boolean
  form: FormInstance<PrintTemplateEditorFormValues>
  settlementCompanyOptions: SettlementCompanyOption[]
  saving: boolean
  onFormValuesChange: () => void
  onSave: () => void
  onClose: () => void
}

export function PrintTemplateEditorModal({
  open,
  editing,
  form,
  settlementCompanyOptions,
  saving,
  onFormValuesChange,
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
    <AppProPage
      title={
        editing
          ? t('system.printTemplateEditor.editTitle')
          : t('system.printTemplateEditor.createTitle')
      }
    >
      <div className="page-stack settings-standard-page">
        <Flex
          className="settings-page-header"
          align="center"
          justify="space-between"
          gap={16}
        >
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            disabled={saving}
            onClick={onClose}
          >
            {t('common.back')}
          </Button>
          <Space>
            <Button disabled={saving} onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={onSave}
            >
              {t('common.save')}
            </Button>
          </Space>
        </Flex>
        <Form
          form={form}
          layout="vertical"
          scrollToFirstError={{ focus: true }}
          onValuesChange={onFormValuesChange}
        >
          <Row gutter={[16, 0]}>
            <Col span={16}>
              <PrintTemplateBasicInfoCard
                form={form}
                settlementCompanyOptions={settlementCompanyOptions}
                t={t}
              />
              <PrintTemplateContentCard
                form={form}
                templateHtmlId={templateHtmlId}
                t={t}
              />
            </Col>
            <Col span={8}>
              <PrintTemplateHelpPanel t={t} />
            </Col>
          </Row>
        </Form>
      </div>
    </AppProPage>
  )
}
