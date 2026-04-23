import { describe, expect, it } from 'vitest'
import { buildModulePrintHtml } from '@/utils/module-print'

describe('buildModulePrintHtml', () => {
  it('renders title, fields and detail rows', () => {
    const html = buildModulePrintHtml({
      title: '销售出库打印单',
      subtitle: '2026CK000021',
      fields: [
        { label: '客户', value: '中建八局' },
        { label: '状态', value: '未审核' },
      ],
      columns: [
        { title: '商品编码' },
        { title: '吨位', align: 'right' },
      ],
      rows: [['RB400-18-12', '45.260']],
    })

    expect(html).toContain('销售出库打印单')
    expect(html).toContain('2026CK000021')
    expect(html).toContain('中建八局')
    expect(html).toContain('RB400-18-12')
    expect(html).toContain('45.260')
    expect(html).toContain('打印时间：')
  })
})
