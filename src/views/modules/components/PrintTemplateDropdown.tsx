import { PrinterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import Button from 'antd/es/button'
import Dropdown from 'antd/es/dropdown'
import type { MenuProps } from 'antd/es/menu'
import { useCallback, useMemo } from 'react'
import { listPrintTemplates } from '@/api/print-template'

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
  const { data: templates = [] } = useQuery<PrintTemplate[]>({
    queryKey: ['print-templates', moduleKey],
    queryFn: async () => {
      const response = await listPrintTemplates(moduleKey)
      const data = (response as { data?: PrintTemplate[] })?.data
      return Array.isArray(data) ? data : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const menuItems = useMemo<MenuProps['items']>(() => {
    if (!templates.length) {
      return [{ key: 'no-template', label: '无可用模板', disabled: true }]
    }
    return templates.flatMap((tpl) => [
      { type: 'group' as const, label: tpl.templateName, children: [
        { key: `preview:${tpl.id}`, label: '打印预览', icon: <PrinterOutlined /> },
        { key: `direct:${tpl.id}`, label: '直接打印', icon: <PrinterOutlined /> },
      ]},
    ])
  }, [templates])

  const handleClick = useCallback(
    ({ key }: { key: string }) => {
      const [mode, templateId] = key.split(':')
      onPrint(mode === 'preview', templateId || undefined)
    },
    [onPrint],
  )

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: handleClick }}
      disabled={disabled}
      trigger={['click']}
    >
      <Button icon={<PrinterOutlined />} loading={loading}>
        打印
      </Button>
    </Dropdown>
  )
}
