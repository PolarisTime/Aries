import { describe, expect, it } from 'vitest'
import { ENDPOINTS } from './endpoints'

describe('print endpoint contracts', () => {
  it('exposes resource endpoints for print export and preview items', () => {
    expect(ENDPOINTS.PRINT_EXPORTS).toBe('/print-exports')
    expect(ENDPOINTS.PRINT_EXPORT_FILES).toBe('/print-export-files')
    expect(ENDPOINTS.PRINT_PREVIEWS_ITEMS).toBe('/print-previews/items')
  })
})

describe('export request resource endpoint contracts', () => {
  it('附件上传是资源创建（POST /attachments）', () => {
    expect(ENDPOINTS.ATTACHMENTS).toBe('/attachments')
  })

  it('导出请求集合与内容端点成对出现（创建 → GET content）', () => {
    expect(ENDPOINTS.CASH_LEDGER_EXPORT_REQUESTS).toBe(
      '/cash-ledger-export-requests',
    )
    expect(ENDPOINTS.CASH_LEDGER_EXPORT_REQUEST_CONTENT('42')).toBe(
      '/cash-ledger-export-requests/42/content',
    )
    expect(ENDPOINTS.MODULE_EXPORT_REQUESTS).toBe('/module-export-requests')
    expect(ENDPOINTS.MODULE_EXPORT_REQUEST_CONTENT('42')).toBe(
      '/module-export-requests/42/content',
    )
    expect(ENDPOINTS.MATERIAL_EXPORT_REQUESTS).toBe('/material-export-requests')
    expect(ENDPOINTS.MATERIAL_EXPORT_REQUEST_CONTENT('42')).toBe(
      '/material-export-requests/42/content',
    )
    expect(ENDPOINTS.ATTACHMENT_MANIFEST_EXPORT_REQUESTS).toBe(
      '/attachment-manifest-export-requests',
    )
    expect(ENDPOINTS.ATTACHMENT_MANIFEST_EXPORT_REQUEST_CONTENT('42')).toBe(
      '/attachment-manifest-export-requests/42/content',
    )
    expect(ENDPOINTS.SALES_ORDER_XLSX_EXPORT_REQUESTS('42')).toBe(
      '/sales-orders/42/xlsx-export-requests',
    )
    expect(ENDPOINTS.SALES_ORDER_XLSX_EXPORT_REQUEST_CONTENT('42', '77')).toBe(
      '/sales-orders/42/xlsx-export-requests/77/content',
    )
  })

  it('雪花 id 路径段按字符串编码, 不做数值转换', () => {
    expect(
      ENDPOINTS.SALES_ORDER_XLSX_EXPORT_REQUEST_CONTENT(
        '123456789012345678',
        '123456789012345679',
      ),
    ).toBe(
      '/sales-orders/123456789012345678/xlsx-export-requests/123456789012345679/content',
    )
    expect(ENDPOINTS.MODULE_EXPORT_REQUEST_CONTENT('a/b')).toBe(
      '/module-export-requests/a%2Fb/content',
    )
  })
})

describe('role endpoint contracts (RBAC0)', () => {
  it('exposes role, permission and user-role resource paths', () => {
    expect(ENDPOINTS.ROLES).toBe('/roles')
    expect(ENDPOINTS.ROLE('42')).toBe('/roles/42')
    expect(ENDPOINTS.ROLE_STATUS('42')).toBe('/roles/42/status')
    expect(ENDPOINTS.ROLE_PERMISSIONS('42')).toBe('/roles/42/permissions')
    expect(ENDPOINTS.PERMISSIONS).toBe('/permissions')
    expect(ENDPOINTS.USER_ROLES('42')).toBe('/users/42/roles')
  })

  it('encodes id path segments', () => {
    expect(ENDPOINTS.ROLE('a/b')).toBe('/roles/a%2Fb')
  })
})
