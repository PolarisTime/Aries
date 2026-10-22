// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { fetchCustomerOptions } from '@/api/master/customer-options'
import { fetchGeneratedMasterDataCode } from '@/api/master/master-data-codes'
import { fetchMaterialGrades } from '@/api/master/material-grades'
import { fetchSettlementCompanyOptions } from '@/api/system/company-settings'
import { getCustomerOptions } from '@/queries/master/customer-options'
import { getSettlementCompanyOptions } from '@/queries/system/company-settings'
import { bindAntdAppApi } from '@/utils/antd-app'
import { ProjectPage } from './ProjectPage'

vi.mock('@/api/business/business-listing', () => ({
  listBusinessModule: vi.fn(),
}))
vi.mock('@/api/business/business-crud', () => ({
  getBusinessModuleDetail: vi.fn(),
  saveBusinessModule: vi.fn(),
  deleteBusinessModule: vi.fn(),
}))
vi.mock('@/api/business/common-export', () => ({
  exportModuleData: vi.fn(),
}))
vi.mock('@/api/master/customer-options', () => ({
  fetchCustomerOptions: vi.fn(),
}))
vi.mock('@/api/master/material-grades', () => ({
  fetchMaterialGrades: vi.fn(),
}))
vi.mock('@/hooks/useMaterialBrands', () => ({
  useMaterialBrands: vi.fn(() => ['沙钢', '永钢', '宝钢']),
}))
vi.mock('@/api/master/master-data-codes', () => ({
  fetchGeneratedMasterDataCode: vi.fn(),
}))
vi.mock('@/queries/master/customer-options', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/queries/master/customer-options')>()
  return { ...actual, getCustomerOptions: vi.fn() }
})
vi.mock('@/api/system/company-settings', () => ({
  fetchSettlementCompanyOptions: vi.fn(),
}))
vi.mock('@/queries/system/company-settings', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/queries/system/company-settings')>()
  return { ...actual, getSettlementCompanyOptions: vi.fn() }
})
vi.mock('@/api/system/runtime-config', () => ({
  getRuntimeConfig: vi.fn(() =>
    Promise.resolve({
      ui: { defaultPageSize: 10 },
      business: {
        statement: { customerReceiptAmountZero: true },
        quoteRegions: ['杭州', '南京'],
      },
    }),
  ),
}))
vi.mock('@/views/modules/components/ModuleAttachmentModal', () => ({
  ModuleAttachmentModal: () => null,
}))

const customerOptions = [
  {
    id: '1001',
    value: '1001',
    label: '客户甲',
    customerCode: 'KH001',
    customerName: '客户甲',
  },
]

const settlementCompanyOptions = [
  {
    id: '2001',
    value: '2001',
    label: '结算主体甲',
    companyName: '结算主体甲',
  },
  {
    id: '2002',
    value: '2002',
    label: '结算主体乙',
    companyName: '结算主体乙',
  },
]

const projectRows = [
  {
    id: '9001',
    projectCode: 'XM001',
    projectName: '项目一',
    projectNameAbbr: '项一',
    customerId: '1001',
    customerCode: 'KH001',
    settlementCompanyId: '2001',
    settlementCompanyName: '结算主体甲',
    projectManager: '张三',
    projectAddress: '地址一',
    status: '正常',
    allowedBrands: ['沙钢'],
    allowedMaterials: ['HRB400'],
    allowedBrandSeverity: 'BLOCK',
    allowedMaterialSeverity: 'WARN',
    priceDateBasis: 'ORDER',
    priceDateOffsetDays: 7,
    priceClosedDayPrevSettle: true,
    pricePeriodPolicy: 'AUTO',
    pricePeriodFixed: null,
    remark: '备注一',
  },
  {
    id: '9002',
    projectCode: 'XM002',
    projectName: '项目二',
    customerId: '1001',
    customerCode: 'KH001',
    settlementCompanyId: '2001',
    settlementCompanyName: '结算主体甲',
    status: '禁用',
  },
]

describe('ProjectPage 主数据拆分试点', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    bindAntdAppApi({
      modal: {
        confirm: (config: { onOk?: () => unknown }) => {
          void config.onOk?.()
        },
      },
    } as unknown as Parameters<typeof bindAntdAppApi>[0])
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.mocked(listBusinessModule).mockResolvedValue({
      code: 0,
      data: { rows: projectRows, total: 21 },
    })
    vi.mocked(fetchCustomerOptions).mockResolvedValue(customerOptions)
    vi.mocked(getCustomerOptions).mockReturnValue(customerOptions)
    vi.mocked(fetchGeneratedMasterDataCode).mockResolvedValue(
      '7000000000000000002',
    )
    vi.mocked(fetchMaterialGrades).mockResolvedValue([
      { value: 'HRB400', label: 'HRB400' },
      { value: 'HRB400E', label: 'HRB400E' },
    ])
    vi.mocked(fetchSettlementCompanyOptions).mockResolvedValue(
      settlementCompanyOptions,
    )
    vi.mocked(getSettlementCompanyOptions).mockReturnValue(
      settlementCompanyOptions,
    )
  })

  afterEach(async () => {
    act(() => root.unmount())
    container.remove()
    // antd 关闭下拉后仍保留隐藏 DOM：断言/点击都按全局第一个选项取，
    // 跨用例残留会让后续用例误点到上一个用例的选项，这里一并清掉。
    document
      .querySelectorAll('.ant-dropdown, .ant-select-dropdown')
      .forEach((node) => {
        node.remove()
      })
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    await queryClient.cancelQueries()
    queryClient.clear()
  })

  const flushAsync = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const renderPage = () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(ProjectPage),
        ),
      )
    })
  }

  const setTextValue = (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )
    act(() => {
      input.focus()
      descriptor?.set?.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  const clickButton = async (label: string) => {
    const target = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.replace(/\s/g, '') === label,
    )
    expect(target, `按钮 ${label} 应存在`).toBeTruthy()
    await act(async () => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /**
   * 定位弹层内某个字段的下拉根节点。
   * <p>
   * 刻意不用 `.ant-select` 序号: 每新增一个字段序号就会整体位移, 断言会在无关改动上炸掉,
   * 且失败信息无法指出是哪个字段。Form.Item 会把字段名注入控件 id, 按 id 定位既稳定又可读。
   */
  const overlaySelect = (fieldName: string): HTMLElement => {
    const control = document.body.querySelector<HTMLElement>(
      `.workspace-overlay input#${fieldName}`,
    )
    expect(control, `字段 ${fieldName} 的下拉输入应存在`).toBeTruthy()
    const root = control?.closest<HTMLElement>('.ant-select')
    expect(root, `字段 ${fieldName} 应是下拉控件`).toBeTruthy()
    return root as HTMLElement
  }

  /** 打开字段对应的下拉。 */
  const openOverlaySelect = async (fieldName: string) => {
    const root = overlaySelect(fieldName)
    await act(async () => {
      root.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 只取当前可见下拉里的选项: antd 关闭后保留隐藏 DOM, 跨次打开会查到旧选项。 */
  const visibleSelectOption = (optionText: string) =>
    [
      ...document.body.querySelectorAll<HTMLElement>(
        '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
      ),
    ].find((node) => node.textContent?.trim() === optionText)

  const chooseOverlaySelectOption = async (fieldName: string) => {
    await openOverlaySelect(fieldName)
    const option =
      document.body.querySelector('.ant-select-item-option') ??
      document.body.querySelector('[role="option"]')
    expect(option, '下拉选项应渲染').toBeTruthy()
    await act(async () => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 按字段名与选项文本选中下拉项(单选/多选通用)。 */
  const chooseOverlaySelectOptionByText = async (
    fieldName: string,
    optionText: string,
  ) => {
    await openOverlaySelect(fieldName)
    const option = visibleSelectOption(optionText)
    expect(option, `字段 ${fieldName} 的选项 ${optionText} 应渲染`).toBeTruthy()
    await act(async () => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  /** 列头右键菜单触发器挂在列标题节点上, 事件必须从该节点冒泡上去。 */
  const openColumnMenu = async (columnTitle: string) => {
    const titleNode = [
      ...container.querySelectorAll<HTMLElement>(
        '.ant-table-thead .module-table-column-title',
      ),
    ].find((node) => node.textContent?.trim() === columnTitle)
    expect(titleNode, `应存在列头「${columnTitle}」`).toBeTruthy()
    await act(async () => {
      titleNode!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
  }

  /** 只取当前可见弹层里的菜单项: antd 关闭后保留隐藏 DOM, 跨次打开会查到旧项。 */
  const visibleMenuItems = () => [
    ...document.body.querySelectorAll<HTMLElement>(
      '.ant-dropdown:not(.ant-dropdown-hidden) .ant-dropdown-menu-item',
    ),
  ]

  const clickMenuItem = async (label: string) => {
    const item = visibleMenuItems().find(
      (node) => node.textContent?.trim() === label,
    )
    expect(item, `菜单项 ${label} 应存在`).toBeTruthy()
    await act(async () => {
      item!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 30))
    })
  }

  const headerTitles = () =>
    [
      ...container.querySelectorAll<HTMLElement>(
        '.ant-table-thead .module-table-column-title',
      ),
    ].map((node) => node.textContent?.trim())

  it('右键数据列头弹出「隐藏该列 / 列设置…」菜单', async () => {
    renderPage()
    await flushAsync()
    const columnTitle = i18n.t('modules.pages.project.projectName')

    await openColumnMenu(columnTitle)

    const menu = document.body.querySelector(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu [role="menu"]',
    )
    expect(menu?.getAttribute('aria-label')).toBe(
      `「${columnTitle}」列操作菜单`,
    )
    expect(visibleMenuItems().map((node) => node.textContent?.trim())).toEqual([
      '隐藏该列',
      '列设置…',
    ])
  })

  it('点击「隐藏该列」后该列头消失', async () => {
    renderPage()
    await flushAsync()
    const columnTitle = i18n.t('modules.pages.project.projectName')
    expect(headerTitles()).toContain(columnTitle)

    await openColumnMenu(columnTitle)
    await clickMenuItem('隐藏该列')

    expect(headerTitles()).not.toContain(columnTitle)
  })

  it('点击「列设置…」打开工具栏的列设置弹层', async () => {
    renderPage()
    await flushAsync()
    const columnTitle = i18n.t('modules.pages.project.projectName')

    await openColumnMenu(columnTitle)
    await clickMenuItem('列设置…')

    const items = visibleMenuItems().map((node) => node.textContent?.trim())
    expect(items).toContain(columnTitle)
    expect(items).toContain(i18n.t('modules.pages.project.projectCode'))
  })

  it('工具栏「列设置」按钮点击后打开弹层(受控开合并改为 click 触发)', async () => {
    renderPage()
    await flushAsync()

    // 列设置 Dropdown 由 hover 触发改为 click 触发: hover-only 的菜单键盘打不开(WCAG 2.1.1),
    // 且受控 open 会被悬停状态复位(列头菜单的「列设置…」项因此点不开)
    const trigger = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.replace(/\s/g, '') === '列设置',
    )
    expect(trigger, '工具栏「列设置」按钮应存在').toBeTruthy()
    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })

    const items = visibleMenuItems().map((node) => node.textContent?.trim())
    expect(items).toContain(i18n.t('modules.pages.project.projectName'))
  })

  it('渲染列表列、状态标签与默认隐藏列', async () => {
    renderPage()
    await flushAsync()

    expect(container.textContent).toContain('XM001')
    expect(container.textContent).toContain('项目一')
    expect(container.textContent).toContain('客户甲')
    const tableText = container.querySelector('.ant-table')?.textContent ?? ''
    expect(tableText).not.toContain('项一')
    expect(tableText).not.toContain('地址一')
    expect(container.querySelectorAll('.ant-table-cell')).not.toHaveLength(0)
    expect(listBusinessModule).toHaveBeenCalledWith(
      'project',
      {},
      { currentPage: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.anything() }),
    )
  })

  it('关键字筛选提交后按条件重新拉取列表', async () => {
    renderPage()
    await flushAsync()
    vi.mocked(listBusinessModule).mockClear()

    const keywordInput = container.querySelector(
      'input[aria-label="关键字"]',
    ) as HTMLInputElement
    setTextValue(keywordInput, '项目')
    await clickButton('搜索')

    expect(listBusinessModule).toHaveBeenCalledWith(
      'project',
      { keyword: '项目' },
      { currentPage: 1, pageSize: 10 },
      expect.anything(),
    )
  })

  it('翻页后拉取下一页数据', async () => {
    renderPage()
    await flushAsync()
    vi.mocked(listBusinessModule).mockClear()

    const pageItem = [
      ...document.body.querySelectorAll('.ant-pagination-item'),
    ].find((item) => item.textContent === '2')
    expect(pageItem, '应存在第 2 页').toBeTruthy()
    await act(async () => {
      pageItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(listBusinessModule).toHaveBeenCalledWith(
      'project',
      {},
      { currentPage: 2, pageSize: 10 },
      expect.anything(),
    )
  })

  it('展开行详情时拉取详情接口并渲染字段', async () => {
    vi.mocked(getBusinessModuleDetail).mockResolvedValue({
      ...projectRows[0],
      projectAddress: '详情地址',
    })
    renderPage()
    await flushAsync()

    const detailButton = container.querySelector(
      'button[aria-label="查看明细"]',
    ) as HTMLButtonElement
    await act(async () => {
      detailButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(getBusinessModuleDetail).toHaveBeenCalledWith(
      'project',
      '9001',
      expect.anything(),
    )
    expect(container.textContent).toContain('详情地址')
  })

  it('新建项目：选择客户不再带出默认结算主体（结算主体只由项目资料决定）', async () => {
    renderPage()
    await flushAsync()

    await clickButton('新增')
    await flushAsync()

    // 客户选项本身已不再携带结算主体字段（后端已下线该快照）
    expect(customerOptions[0]).not.toHaveProperty('defaultSettlementCompanyId')
    expect(customerOptions[0]).not.toHaveProperty(
      'defaultSettlementCompanyName',
    )

    await chooseOverlaySelectOption('customerId')

    const settlementSelect = overlaySelect('settlementCompanyId')
    const selectedText =
      settlementSelect
        .querySelector('.ant-select-selection-item')
        ?.textContent?.trim() ?? ''
    expect(selectedText).toBe('')
  })

  it('新建项目：填写表单保存时带上客户编码与结算主体快照', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9003' })
    renderPage()
    await flushAsync()

    await clickButton('新增')
    await flushAsync()
    const overlay = document.body.querySelector('.workspace-overlay')
    expect(overlay?.textContent).toContain('新建 — 项目资料')

    const nameInput = document.body.querySelector(
      '.workspace-overlay input#projectName',
    ) as HTMLInputElement
    setTextValue(nameInput, '项目三')
    await chooseOverlaySelectOption('customerId')
    // 选客户不再带出默认结算主体：必须显式选项目自己的结算主体
    await chooseOverlaySelectOptionByText('settlementCompanyId', '结算主体甲')

    await clickButtonInOverlay('保存')

    expect(fetchGeneratedMasterDataCode).toHaveBeenCalledWith('project')
    expect(saveBusinessModule).toHaveBeenCalledTimes(1)
    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect(draft).toMatchObject({
      projectCode: '7000000000000000002',
      projectName: '项目三',
      customerId: '1001',
      customerCode: 'KH001',
      settlementCompanyId: '2001',
      settlementCompanyName: '结算主体甲',
      status: '正常',
    })
    expect(String((draft as { id?: string }).id ?? '')).toBe('')
  })

  it('编辑已有项目：保存时保留原记录 id', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    await act(async () => {
      container
        .querySelector('.ant-table-row')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()
    expect(document.body.textContent).toContain('编辑 — 项目资料')

    await clickButtonInOverlay('保存')

    expect(saveBusinessModule).toHaveBeenCalledTimes(1)
    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect((draft as { id?: string }).id).toBe('9001')
    expect((draft as { projectName?: string }).projectName).toBe('项目一')
  })

  it('编辑项目资料：取价地区下拉使用后端 runtime-config 动态下发的地区', async () => {
    renderPage()
    await flushAsync()

    await act(async () => {
      container
        .querySelector('.ant-table-row')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()
    expect(document.body.textContent).toContain('编辑 — 项目资料')

    // 按字段名定位「取价地区」下拉, 不再依赖弹层内 select 的排列序号
    await openOverlaySelect('quoteRegion')

    const optionTexts = [
      ...document.body.querySelectorAll<HTMLElement>(
        '.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option',
      ),
    ].map((node) => node.textContent?.trim())
    // 后端下发 ['杭州','南京']: 应出现南京, 且不再使用前端兜底默认里的绍兴
    expect(optionTexts).toContain('南京')
    expect(optionTexts).not.toContain('绍兴')
  })

  it('编辑项目资料：回填并保留允许品牌/材质', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    await act(async () => {
      container
        .querySelector('.ant-table-row')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()

    // maxTagCount="responsive" 在 jsdom 里量不到宽度会把标签折叠成「+N ...」，
    // 因此不断言渲染标签，而是用「保存载荷保留已存值」证明回填链路成立。
    // 弹层内共 12 个 select: 客户 / 结算主体 / 状态 / 取价数据源 / 取价地区 /
    // 允许品牌 / 处理方式 / 允许材质 / 处理方式 / 取价基准 / 时段策略 / 固定时段。
    const overlay = document.body.querySelector('.workspace-overlay')
    const selectRoots = overlay!.querySelectorAll('.ant-select')
    expect(selectRoots).toHaveLength(12)

    await clickButtonInOverlay('保存')

    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect(draft).toMatchObject({
      allowedBrands: ['沙钢'],
      allowedMaterials: ['HRB400'],
      allowedBrandSeverity: 'BLOCK',
      allowedMaterialSeverity: 'WARN',
    })
  })

  it('编辑项目资料：处理方式可切换为阻断并随保存下发', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    await act(async () => {
      container
        .querySelector('.ant-table-row')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()

    await chooseOverlaySelectOptionByText(
      'allowedBrandSeverity',
      '阻断（不可保存）',
    )
    await clickButtonInOverlay('保存')

    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect(draft).toMatchObject({ allowedBrandSeverity: 'BLOCK' })
  })

  it('编辑项目资料：可从主数据多选允许品牌与材质', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    await act(async () => {
      container
        .querySelector('.ant-table-row')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()

    await chooseOverlaySelectOptionByText('allowedBrands', '永钢')
    await chooseOverlaySelectOptionByText('allowedMaterials', 'HRB400E')
    await clickButtonInOverlay('保存')

    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect(draft).toMatchObject({
      allowedBrands: ['沙钢', '永钢'],
      allowedMaterials: ['HRB400', 'HRB400E'],
    })
  })

  it('新建项目：取价基准与时段策略按默认档下发', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9003' })
    renderPage()
    await flushAsync()

    await clickButton('新增')
    await flushAsync()

    const nameInput = document.body.querySelector(
      '.workspace-overlay input#projectName',
    ) as HTMLInputElement
    setTextValue(nameInput, '项目三')
    await chooseOverlaySelectOption('customerId')
    // 选客户不再带出默认结算主体：必须显式选项目自己的结算主体
    await chooseOverlaySelectOptionByText('settlementCompanyId', '结算主体甲')

    await clickButtonInOverlay('保存')

    expect(saveBusinessModule).toHaveBeenCalledTimes(1)
    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    // 5 个字段必须始终出现在载荷里, 且条件字段按主字段口径复位
    expect(draft).toMatchObject({
      priceDateBasis: 'DELIVERY',
      priceDateOffsetDays: 0,
      priceClosedDayPrevSettle: false,
      pricePeriodPolicy: 'AUTO',
      pricePeriodFixed: null,
    })
  })

  it('编辑项目资料：切到非报单基准时顺延天数与休市开关被复位并禁用', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    await act(async () => {
      container
        .querySelector('.ant-table-row')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()

    const offsetInput = document.body.querySelector<HTMLInputElement>(
      '.workspace-overlay input#priceDateOffsetDays',
    )
    const prevSettleSwitch = document.body.querySelector<HTMLButtonElement>(
      '.workspace-overlay button#priceClosedDayPrevSettle',
    )
    // 记录里基准是「报单日期」: 两个条件字段可编辑且回填历史值
    expect(offsetInput?.disabled).toBe(false)
    expect(offsetInput?.value).toBe('7')
    expect(prevSettleSwitch?.disabled).toBe(false)
    expect(prevSettleSwitch?.getAttribute('aria-checked')).toBe('true')

    await chooseOverlaySelectOptionByText('priceDateBasis', '每次手工选择')

    expect(offsetInput?.value).toBe('0')
    expect(offsetInput?.disabled).toBe(true)
    expect(prevSettleSwitch?.getAttribute('aria-checked')).toBe('false')
    expect(prevSettleSwitch?.disabled).toBe(true)

    await clickButtonInOverlay('保存')

    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect(draft).toMatchObject({
      priceDateBasis: 'MANUAL',
      priceDateOffsetDays: 0,
      priceClosedDayPrevSettle: false,
      pricePeriodFixed: null,
    })
  })

  it('编辑项目资料：固定时段策略未选具体时段时阻止保存', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    await act(async () => {
      container
        .querySelector('.ant-table-row')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()

    // 记录里策略是「自动取当日最新时段」: 具体时段控件禁用, 不参与校验
    const fixedSelectInput =
      overlaySelect('pricePeriodFixed').querySelector('input')
    expect(fixedSelectInput?.disabled).toBe(true)

    await chooseOverlaySelectOptionByText('pricePeriodPolicy', '固定时段')
    expect(fixedSelectInput?.disabled).toBe(false)

    await clickButtonInOverlay('保存')
    await flushAsync()
    expect(saveBusinessModule).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain(
      i18n.t('modules.pages.project.pricePeriodFixedRequired'),
    )

    await chooseOverlaySelectOptionByText('pricePeriodFixed', '下午')
    await clickButtonInOverlay('保存')

    expect(saveBusinessModule).toHaveBeenCalledTimes(1)
    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect(draft).toMatchObject({
      pricePeriodPolicy: 'FIXED',
      pricePeriodFixed: '下午',
    })
  })

  it('勾选记录后执行批量删除', async () => {
    vi.mocked(deleteBusinessModule).mockResolvedValue(undefined)
    renderPage()
    await flushAsync()

    const firstRow = container.querySelector('.ant-table-row')
    await act(async () => {
      firstRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('删除')
    await flushAsync()

    expect(deleteBusinessModule).toHaveBeenCalledTimes(1)
    expect(deleteBusinessModule).toHaveBeenCalledWith('project', '9001')
  })
})

function clickButtonInOverlay(label: string) {
  const buttons = [...document.body.querySelectorAll('button')]
  const target = buttons.find(
    (button) =>
      button.textContent?.replace(/\s/g, '') === label.replace(/\s/g, ''),
  )
  expect(target, `浮层按钮 ${label} 应存在`).toBeTruthy()
  return act(async () => {
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
