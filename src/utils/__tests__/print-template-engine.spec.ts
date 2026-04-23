import { describe, expect, it } from 'vitest'
import { renderPrintTemplate } from '@/utils/print-template-engine'

describe('renderPrintTemplate', () => {
  it('renders header fields and detail loop placeholders', () => {
    const rendered = renderPrintTemplate(
      `<h2>{{orderNo}}</h2>
      <!--DETAIL_ROW_START--><tr><td>{{_index}}</td><td>{{detail.materialCode}}</td></tr><!--DETAIL_ROW_END-->
      <div>{{_printDate}}</div>`,
      { orderNo: '2026CG000001' },
      [{ materialCode: 'RB400-18-12' }, { materialCode: 'PAN500-8' }],
    )

    expect(rendered).toContain('2026CG000001')
    expect(rendered).toContain('<td>1</td><td>RB400-18-12</td>')
    expect(rendered).toContain('<td>2</td><td>PAN500-8</td>')
    expect(rendered).toMatch(/\d{4}-\d{2}-\d{2}/)
  })
})
