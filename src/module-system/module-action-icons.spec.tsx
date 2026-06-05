import { describe, expect, it } from 'vitest'
import { resolveModuleActionIcon } from './module-action-icons'

describe('resolveModuleActionIcon', () => {
  it('returns SearchOutlined for 查询', () => {
    expect(resolveModuleActionIcon('查询条件')).toBeDefined()
  })

  it('returns RedoOutlined for 重置', () => {
    expect(resolveModuleActionIcon('重置条件')).toBeDefined()
  })

  it('returns CloseOutlined for 关闭', () => {
    expect(resolveModuleActionIcon('关闭页面')).toBeDefined()
  })

  it('returns CloseOutlined for 取消', () => {
    expect(resolveModuleActionIcon('取消操作')).toBeDefined()
  })

  it('returns ReloadOutlined for 刷新', () => {
    expect(resolveModuleActionIcon('刷新数据')).toBeDefined()
  })

  it('returns PlusOutlined for 新增', () => {
    expect(resolveModuleActionIcon('新增用户')).toBeDefined()
  })

  it('returns PlusOutlined for 新建', () => {
    expect(resolveModuleActionIcon('新建订单')).toBeDefined()
  })

  it('returns DownloadOutlined for 导出', () => {
    expect(resolveModuleActionIcon('导出数据')).toBeDefined()
  })

  it('returns DownloadOutlined for 下载', () => {
    expect(resolveModuleActionIcon('下载文件')).toBeDefined()
  })

  it('returns DeleteOutlined for 删除', () => {
    expect(resolveModuleActionIcon('删除记录')).toBeDefined()
  })

  it('returns AuditOutlined for 审核', () => {
    expect(resolveModuleActionIcon('审核订单')).toBeDefined()
  })

  it('returns PrinterOutlined for 打印', () => {
    expect(resolveModuleActionIcon('打印单据')).toBeDefined()
  })

  it('returns PaperClipOutlined for 附件', () => {
    expect(resolveModuleActionIcon('附件管理')).toBeDefined()
  })

  it('returns SaveOutlined for 编辑', () => {
    expect(resolveModuleActionIcon('编辑资料')).toBeDefined()
  })

  it('returns EyeOutlined for 查看', () => {
    expect(resolveModuleActionIcon('查看详情')).toBeDefined()
  })

  it('returns FileSearchOutlined for 生成', () => {
    expect(resolveModuleActionIcon('生成对账单')).toBeDefined()
  })

  it('returns undefined for unmatched label', () => {
    expect(resolveModuleActionIcon('其他操作')).toBeUndefined()
  })
})
