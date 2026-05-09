import {
  AccountBookOutlined,
  ApartmentOutlined,
  BankOutlined,
  CarOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  InboxOutlined,
  ProfileOutlined,
  SafetyOutlined,
  ShopOutlined,
  SwapOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { DashboardSummary } from '@/api/dashboard'
import type {
  DashboardInfoItem,
  WorkflowSection,
} from '@/views/dashboard/dashboard-view-types'

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '—'
  }
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

export function buildWorkflowSections(
  summary?: DashboardSummary,
): WorkflowSection[] {
  return [
    {
      key: 'master',
      title: '基础建档',
      description: '先维护业务主数据，后续单据可直接关联带出。',
      accent: '#0f766e',
      nodes: [
        {
          key: 'material',
          title: '商品资料',
          path: '/material',
          icon: DatabaseOutlined,
          tone: '#1677ff',
          hint: '维护品名、规格、品牌',
          metric: `${summary?.materialCount ?? 0} 项`,
        },
        {
          key: 'supplier',
          title: '供应商资料',
          path: '/supplier',
          icon: ShopOutlined,
          tone: '#52c41a',
          hint: '采购往来主体建档',
          metric: `${summary?.supplierCount ?? 0} 家`,
        },
        {
          key: 'customer',
          title: '客户资料',
          path: '/customer',
          icon: TeamOutlined,
          tone: '#fa8c16',
          hint: '销售往来主体建档',
          metric: `${summary?.customerCount ?? 0} 家`,
        },
        {
          key: 'warehouse',
          title: '仓库资料',
          path: '/warehouse',
          icon: BankOutlined,
          tone: '#13c2c2',
          hint: '维护仓库与库位能力',
        },
      ],
    },
    {
      key: 'purchase',
      title: '采购链路',
      description: '从合同与订单开始，经过入库、对账，最终完成付款。',
      accent: '#2563eb',
      nodes: [
        {
          key: 'purchase-contract',
          title: '采购合同',
          path: '/purchase-contract',
          icon: ProfileOutlined,
          tone: '#2563eb',
          hint: '锁定采购条款',
        },
        {
          key: 'purchase-order',
          title: '采购订单',
          path: '/purchase-order',
          icon: ProfileOutlined,
          tone: '#1677ff',
          hint: '生成采购执行单',
        },
        {
          key: 'purchase-inbound',
          title: '采购入库',
          path: '/purchase-inbound',
          icon: InboxOutlined,
          tone: '#2f54eb',
          hint: '确认入库数量重量',
        },
        {
          key: 'supplier-statement',
          title: '供应商对账单',
          path: '/supplier-statement',
          icon: FileSearchOutlined,
          tone: '#1d39c4',
          hint: '汇总采购应付',
        },
        {
          key: 'payment',
          title: '付款单',
          path: '/payment',
          icon: AccountBookOutlined,
          tone: '#10239e',
          hint: '完成付款登记',
        },
      ],
    },
    {
      key: 'sales',
      title: '销售链路',
      description: '从销售合同与订单开始，经过出库、对账，最终形成收款闭环。',
      accent: '#d97706',
      nodes: [
        {
          key: 'sales-contract',
          title: '销售合同',
          path: '/sales-contract',
          icon: FileDoneOutlined,
          tone: '#fa8c16',
          hint: '锁定销售条款',
        },
        {
          key: 'sales-order',
          title: '销售订单',
          path: '/sales-order',
          icon: FileDoneOutlined,
          tone: '#faad14',
          hint: '下达客户订单',
        },
        {
          key: 'sales-outbound',
          title: '销售出库',
          path: '/sales-outbound',
          icon: SwapOutlined,
          tone: '#d48806',
          hint: '确认发货与出库',
        },
        {
          key: 'customer-statement',
          title: '客户对账单',
          path: '/customer-statement',
          icon: FileTextOutlined,
          tone: '#ad6800',
          hint: '汇总销售应收',
        },
        {
          key: 'receipt',
          title: '收款单',
          path: '/receipt',
          icon: AccountBookOutlined,
          tone: '#874d00',
          hint: '完成收款登记',
        },
      ],
    },
    {
      key: 'freight',
      title: '物流协同',
      description: '物流相关单据可独立流转，也能嵌入采购和销售业务链路。',
      accent: '#7c3aed',
      nodes: [
        {
          key: 'carrier',
          title: '物流方资料',
          path: '/carrier',
          icon: CarOutlined,
          tone: '#722ed1',
          hint: '维护承运主体',
        },
        {
          key: 'freight-bill',
          title: '物流单',
          path: '/freight-bill',
          icon: CarOutlined,
          tone: '#9254de',
          hint: '记录运输过程',
        },
        {
          key: 'freight-statement',
          title: '物流对账单',
          path: '/freight-statement',
          icon: FileSearchOutlined,
          tone: '#531dab',
          hint: '汇总运费结算',
        },
      ],
    },
  ]
}

export function buildDashboardInfoItems(
  summary?: DashboardSummary,
): DashboardInfoItem[] {
  return [
    {
      key: 'userName',
      label: '当前用户',
      value: summary?.userName || '—',
      icon: UserOutlined,
    },
    {
      key: 'loginName',
      label: '登录账号',
      value: summary?.loginName || '—',
      icon: SafetyOutlined,
    },
    {
      key: 'roleName',
      label: '所属角色',
      value: summary?.roleName || '未分配',
      icon: ApartmentOutlined,
    },
    {
      key: 'companyName',
      label: '所属公司',
      value: summary?.companyName || '未配置',
      icon: ShopOutlined,
    },
    {
      key: 'totpEnabled',
      label: 'MFA 状态',
      value: summary?.totpEnabled ? '已启用' : '未启用',
      icon: SafetyOutlined,
    },
    {
      key: 'lastLoginAt',
      label: '最近登录',
      value: formatDateTime(summary?.lastLoginAt),
      icon: ClockCircleOutlined,
    },
  ]
}
