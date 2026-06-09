import { EyeOutlined, PrinterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import Button from 'antd/es/button'
import Empty from 'antd/es/empty'
import Modal from 'antd/es/modal'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import { useTranslation } from 'react-i18next'
import { listPrintTemplates } from '@/api/print-template'
import { printTemplateTargetMap } from '@/config/print-template-targets'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PrintActionMode, PrintTemplateRecord } from '@/types/print-template'

interface Props {
  moduleKey: string
  disabled: boolean
  loading: boolean
  onPrint: (mode: PrintActionMode, template?: PrintTemplateRecord) => void
}

export function PrintTemplateDropdown({
  moduleKey,
  disabled,
  loading,
  onPrint,
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>()
  const supportsPrintTemplate = moduleKey in printTemplateTargetMap
  const { data: templates = [] } = useQuery<PrintTemplateRecord[]>({
    queryKey: QUERY_KEYS.printableTemplates(moduleKey),
    queryFn: async () => {
      const response = await listPrintTemplates(moduleKey)
      const data = (response as { data?: PrintTemplateRecord[] })?.data
      return Array.isArray(data) ? data : []
    },
    staleTime: 5 * 60 * 1000,
    enabled: supportsPrintTemplate,
  })
  const activeTemplates = useMemo(
    () =>
      templates.filter((tpl) => tpl.status == null || tpl.status === 'ACTIVE'),
    [templates],
  )
  const printableTemplates = useMemo(
    () =>
      activeTemplates.filter(
        (tpl) => tpl.templateType === 'COORD' || tpl.templateType === 'PDF_FORM',
      ),
    [activeTemplates],
  )

  const effectiveSelectedTemplateId = useMemo(() => {
    if (
      selectedTemplateId &&
      printableTemplates.some((tpl) => tpl.id === selectedTemplateId)
    ) {
      return selectedTemplateId
    }
    return open ? printableTemplates[0]?.id : selectedTemplateId
  }, [open, printableTemplates, selectedTemplateId])

  const selectedTemplate = useMemo(
    () => printableTemplates.find((tpl) => tpl.id === effectiveSelectedTemplateId),
    [effectiveSelectedTemplateId, printableTemplates],
  )

  const templateOptions = useMemo(
    () =>
      printableTemplates.map((tpl) => ({
        label: (
          <Space size={8}>
            <span>{tpl.templateName}</span>
            <Tag>{tpl.templateType || 'COORD'}</Tag>
          </Space>
        ),
        value: tpl.id,
      })),
    [printableTemplates],
  )

  const handlePrint = (mode: PrintActionMode, template: PrintTemplateRecord) => {
    setOpen(false)
    onPrint(mode, template)
  }

  const handleSelectedPrint = (mode: PrintActionMode) => {
    if (!selectedTemplate) return
    handlePrint(mode, selectedTemplate)
  }

  return (
    <>
      <Button
        disabled={disabled}
        icon={<PrinterOutlined />}
        loading={loading}
        onClick={() => setOpen(true)}
      >
        {t('modules.print.print')}
      </Button>
      <Modal
        footer={null}
        onCancel={() => setOpen(false)}
        open={open}
        title={t('modules.print.print')}
        width={680}
      >
        {printableTemplates.length ? (
          <div className="flex flex-wrap items-center gap-3">
            <Select
              className="min-w-80 flex-1"
              onChange={setSelectedTemplateId}
              options={templateOptions}
              value={effectiveSelectedTemplateId}
            />
            <Space wrap>
              <Button
                disabled={!selectedTemplate}
                icon={<EyeOutlined />}
                onClick={() => handleSelectedPrint('preview')}
                type="primary"
              >
                {t('modules.print.preview')}
              </Button>
              <Button
                disabled={!selectedTemplate}
                icon={<PrinterOutlined />}
                onClick={() => handleSelectedPrint('print')}
              >
                {t('modules.print.directPrint')}
              </Button>
            </Space>
          </div>
        ) : (
          <Empty description={t('modules.print.noTemplate')} />
        )}
      </Modal>
    </>
  )
}
