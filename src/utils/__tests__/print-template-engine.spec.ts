import { describe, expect, it } from 'vitest'
import { renderPrintTemplate } from '@/utils/print-template-engine'

describe('renderPrintTemplate', () => {
  it('renders header fields and legacy detail loop placeholders', () => {
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

  it('supports nested paths, conditionals and current-row resolution in each blocks', () => {
    const rendered = renderPrintTemplate(
      `<div>{{customer.name}}</div>
      {{#if remark}}<span>{{remark}}</span>{{/if}}
      <table>{{#each details}}<tr><td>{{_index}}</td><td>{{material.code}}</td><td>{{../customer.name}}</td></tr>{{/each}}</table>`,
      {
        customer: { name: '华东建设集团' },
        remark: '需加急',
      },
      [
        { material: { code: 'HRB400E-18' } },
        { material: { code: 'Q235B-20' } },
      ],
    )

    expect(rendered).toContain('<div>华东建设集团</div>')
    expect(rendered).toContain('<span>需加急</span>')
    expect(rendered).toContain(
      '<td>1</td><td>HRB400E-18</td><td>华东建设集团</td>',
    )
    expect(rendered).toContain(
      '<td>2</td><td>Q235B-20</td><td>华东建设集团</td>',
    )
  })

  it('supports unless blocks and detail-dot syntax in each blocks', () => {
    const rendered = renderPrintTemplate(
      `{{#unless settled}}<div>未结算</div>{{/unless}}
      {{#each details}}<p>{{_index}}-{{detail.batch.no}}</p>{{/each}}`,
      { settled: false },
      [{ batch: { no: 'BATCH-01' } }, { batch: { no: 'BATCH-02' } }],
    )

    expect(rendered).toContain('<div>未结算</div>')
    expect(rendered).toContain('<p>1-BATCH-01</p>')
    expect(rendered).toContain('<p>2-BATCH-02</p>')
  })

  it('escapes html by default and supports triple braces for trusted raw output', () => {
    const rendered = renderPrintTemplate(
      `<div>{{remark}}</div><section>{{{remark}}}</section>`,
      {
        remark: `<img src=x onerror="alert(1)"><strong>ok</strong>`,
      },
      [],
    )

    expect(rendered).toContain(
      '<div>&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&lt;strong&gt;ok&lt;/strong&gt;</div>',
    )
    expect(rendered).toContain(
      '<section><img src=x onerror="alert(1)"><strong>ok</strong></section>',
    )
  })
})
