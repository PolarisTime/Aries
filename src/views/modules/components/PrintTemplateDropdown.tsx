import { PrinterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Dropdown from 'antd/es/dropdown'
import type { MenuProps } from 'antd/es/menu'
import { useTranslation } from 'react-i18next'
import { listPrintTemplates } from '@/api/print-template'
import { printTemplateTargetMap } from '@/config/print-template-targets'

interface Props {
  moduleKey: string
  disabled: boolean
  loading: boolean
  onPrint: (preview: boolean, templateId?: string) => void
}

interface PrintTemplate {
  id: string
  templateName: string
  billType: string
}

export function PrintTemplateDropdown({ moduleKey, disabled, loading, onPrint }: Props) {
  const { t } = useTranslation()
  const supportsPrintTemplate = moduleKey in printTemplateTargetMap
  const { data: templates = [] } = useQuery<PrintTemplate[]>({
    queryKey: ['print-templates', moduleKey],
    queryFn: async () => {
      const response = await listPrintTemplates(moduleKey)
      const data = (response as { data?: PrintTemplate[] })?.data
      return Array.isArray(data) ? data : []
    },
    staleTime: 5 * 60 * 1000,
    enabled: supportsPrintTemplate,
  })

  const menuItems: MenuProps['items'] = (() => {
    if (!templates.length) {
      return [{ key: 'no-template', label: t('modules.print.noTemplate'), disabled: true }]
    }
    return templates.flatMap((tpl) => [
      { type: 'group' as const, label: tpl.templateName, children: [
        { key: `preview:${tpl.id}`, label: t('modules.print.preview'), icon: <PrinterOutlined /> },
        { key: `direct:${tpl.id}`, label: t('modules.print.directPrint'), icon: <PrinterOutlined /> },
      ]},
    ])
  })()

  const handleClick = ({ key }: { key: string }) => {
    const [mode, templateId] = key.split(':')
    onPrint(mode === 'preview', templateId || undefined)
  }

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: handleClick }}
      disabled={disabled}
      trigger={['click']}
    >
      <Button icon={<PrinterOutlined />} loading={loading}>
        {t('modules.print.print')}
      </Button>
    </Dropdown>
  )
}
