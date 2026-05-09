import type { ModulePageConfig } from '@/types/module-page'
import {
  escapePrintTemplateHtml,
  inferPrintTemplateAlign,
} from '@/utils/print-template-designer-samples'

export function buildPrintTemplateStarter(config: ModulePageConfig) {
  const summaryItems = config.detailFields
    .map(
      (field) => `
        <div class="sheet-summary-item">
          <span>${escapePrintTemplateHtml(field.label)}</span>
          <strong>{{${field.key}}}</strong>
        </div>`,
    )
    .join('')

  const detailHeader = (config.itemColumns || [])
    .map(
      (column) => `
            <th style="text-align:${inferPrintTemplateAlign(column)};">${escapePrintTemplateHtml(column.title)}</th>`,
    )
    .join('')

  const detailBody = (config.itemColumns || [])
    .map(
      (column) => `
            <td style="text-align:${inferPrintTemplateAlign(column)};">{{${column.dataIndex}}}</td>`,
    )
    .join('')

  const detailTable = config.itemColumns?.length
    ? `
      <table class="sheet-table">
        <thead>
          <tr>
            <th style="width: 56px; text-align:center;">序号</th>${detailHeader}
          </tr>
        </thead>
        <tbody>
{{#each details}}
          <tr>
            <td style="text-align:center;">{{_index}}</td>${detailBody}
          </tr>
{{/each}}
        </tbody>
      </table>`
    : '<div class="sheet-empty">当前单据没有明细表结构，可只使用主表字段排版。</div>'

  return `<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    color: #1f2329;
    font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
    font-size: 12px;
    background: #fff;
  }
  .print-sheet {
    width: 100%;
    padding: 12px 16px 18px;
  }
  .sheet-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    padding-bottom: 14px;
    border-bottom: 2px solid #1f2329;
  }
  .sheet-kicker {
    margin-bottom: 6px;
    color: #64748b;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .sheet-title {
    margin: 0;
    color: #0f172a;
    font-size: 28px;
    font-weight: 700;
  }
  .sheet-meta {
    min-width: 210px;
    color: #475569;
    font-size: 12px;
    line-height: 1.8;
    text-align: right;
  }
  .sheet-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
    margin-bottom: 18px;
  }
  @supports (display: grid) {
    .sheet-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .sheet-summary-item {
      flex: none;
    }
  }
  .sheet-summary-item {
    flex: 0 0 calc((100% - 20px) / 3);
    min-height: 78px;
    padding: 12px 14px;
    border: 1px solid #dbe4ee;
    border-radius: 10px;
    background: #f8fbff;
  }
  .sheet-summary-item span {
    display: block;
    margin-bottom: 8px;
    color: #64748b;
    font-size: 12px;
  }
  .sheet-summary-item strong {
    display: block;
    color: #0f172a;
    font-size: 15px;
    line-height: 1.45;
    word-break: break-all;
  }
  .sheet-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .sheet-table th,
  .sheet-table td {
    border: 1px solid #111827;
    padding: 7px 8px;
    vertical-align: middle;
    word-break: break-all;
  }
  .sheet-table thead th {
    background: #eff4f9;
    font-weight: 700;
  }
  .sheet-table tr {
    page-break-inside: avoid;
  }
  .sheet-remark {
    margin-top: 16px;
    padding: 12px 14px;
    border: 1px dashed #94a3b8;
    border-radius: 10px;
    background: #f8fafc;
    line-height: 1.7;
  }
  .sheet-remark-label {
    margin-bottom: 6px;
    color: #475569;
    font-weight: 600;
  }
  .sheet-empty {
    padding: 24px;
    border: 1px dashed #cbd5e1;
    border-radius: 12px;
    color: #64748b;
    text-align: center;
    background: #f8fafc;
  }
  .sheet-footer {
    margin-top: 14px;
    color: #64748b;
    font-size: 11px;
    text-align: right;
  }
</style>
<div class="print-sheet">
  <div class="sheet-header">
    <div>
      <div class="sheet-kicker">${escapePrintTemplateHtml(config.kicker)}</div>
      <h1 class="sheet-title">${escapePrintTemplateHtml(config.title)}打印单</h1>
    </div>
    <div class="sheet-meta">
      <div>打印日期：{{_printDate}}</div>
      <div>打印时间：{{_printTime}}</div>
    </div>
  </div>

  <div class="sheet-summary">
    ${summaryItems}
  </div>

  ${detailTable}

  {{#if remark}}
  <div class="sheet-remark">
    <div class="sheet-remark-label">备注</div>
    <div>{{remark}}</div>
  </div>
  {{/if}}

  <div class="sheet-footer">模板适用页面：${escapePrintTemplateHtml(config.title)}</div>
</div>`
}
