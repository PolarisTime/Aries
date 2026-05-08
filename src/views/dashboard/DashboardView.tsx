import type { ComponentType } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Card,
  Col,
  Descriptions,
  Row,
  Spin,
  Statistic,
} from 'antd'
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
import { getDashboardSummary } from '@/api/dashboard'

interface WorkflowNode {
  key: string
  title: string
  path: string
  icon: ComponentType
  tone: string
  hint: string
  metric?: string
}

interface WorkflowSection {
  key: string
  title: string
  description: string
  accent: string
  nodes: WorkflowNode[]
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '—'
  }
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

export function DashboardView() {
  const navigate = useNavigate()
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 120000,
  })

  const summary = summaryQuery.data
  const [animatedServerTime, setAnimatedServerTime] = useState('—')

  useEffect(() => {
    const value = summary?.serverTime
    if (!value) {
      setAnimatedServerTime('—')
      return
    }

    const parsed = dayjs(value)
    if (!parsed.isValid()) {
      setAnimatedServerTime(value)
      return
    }

    const base = parsed.valueOf()
    const syncedAt = Date.now()
    const update = () => {
      setAnimatedServerTime(
        dayjs(base + (Date.now() - syncedAt)).format('YYYY-MM-DD HH:mm:ss'),
      )
    }

    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [summary?.serverTime])

  const workflowSections = useMemo<WorkflowSection[]>(
    () => [
      {
        key: 'master',
        title: '基础建档',
        description: '先维护业务主数据，后续单据可直接关联带出。',
        accent: '#0f766e',
        nodes: [
          {
            key: 'materials',
            title: '商品资料',
            path: '/materials',
            icon: DatabaseOutlined,
            tone: '#1677ff',
            hint: '维护品名、规格、品牌',
            metric: `${summary?.materialCount ?? 0} 项`,
          },
          {
            key: 'suppliers',
            title: '供应商资料',
            path: '/suppliers',
            icon: ShopOutlined,
            tone: '#52c41a',
            hint: '采购往来主体建档',
            metric: `${summary?.supplierCount ?? 0} 家`,
          },
          {
            key: 'customers',
            title: '客户资料',
            path: '/customers',
            icon: TeamOutlined,
            tone: '#fa8c16',
            hint: '销售往来主体建档',
            metric: `${summary?.customerCount ?? 0} 家`,
          },
          {
            key: 'warehouses',
            title: '仓库资料',
            path: '/warehouses',
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
            key: 'purchase-contracts',
            title: '采购合同',
            path: '/purchase-contracts',
            icon: ProfileOutlined,
            tone: '#2563eb',
            hint: '锁定采购条款',
          },
          {
            key: 'purchase-orders',
            title: '采购订单',
            path: '/purchase-orders',
            icon: ProfileOutlined,
            tone: '#1677ff',
            hint: '生成采购执行单',
          },
          {
            key: 'purchase-inbounds',
            title: '采购入库',
            path: '/purchase-inbounds',
            icon: InboxOutlined,
            tone: '#2f54eb',
            hint: '确认入库数量重量',
          },
          {
            key: 'supplier-statements',
            title: '供应商对账单',
            path: '/supplier-statements',
            icon: FileSearchOutlined,
            tone: '#1d39c4',
            hint: '汇总采购应付',
          },
          {
            key: 'payments',
            title: '付款单',
            path: '/payments',
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
            key: 'sales-contracts',
            title: '销售合同',
            path: '/sales-contracts',
            icon: FileDoneOutlined,
            tone: '#fa8c16',
            hint: '锁定销售条款',
          },
          {
            key: 'sales-orders',
            title: '销售订单',
            path: '/sales-orders',
            icon: FileDoneOutlined,
            tone: '#faad14',
            hint: '下达客户订单',
          },
          {
            key: 'sales-outbounds',
            title: '销售出库',
            path: '/sales-outbounds',
            icon: SwapOutlined,
            tone: '#d48806',
            hint: '确认发货与出库',
          },
          {
            key: 'customer-statements',
            title: '客户对账单',
            path: '/customer-statements',
            icon: FileTextOutlined,
            tone: '#ad6800',
            hint: '汇总销售应收',
          },
          {
            key: 'receipts',
            title: '收款单',
            path: '/receipts',
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
            key: 'carriers',
            title: '物流方资料',
            path: '/carriers',
            icon: CarOutlined,
            tone: '#722ed1',
            hint: '维护承运主体',
          },
          {
            key: 'freight-bills',
            title: '物流单',
            path: '/freight-bills',
            icon: CarOutlined,
            tone: '#9254de',
            hint: '记录运输过程',
          },
          {
            key: 'freight-statements',
            title: '物流对账单',
            path: '/freight-statements',
            icon: FileSearchOutlined,
            tone: '#531dab',
            hint: '汇总运费结算',
          },
        ],
      },
    ],
    [summary?.customerCount, summary?.materialCount, summary?.supplierCount],
  )

  const infoItems = useMemo(
    () => [
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
    ],
    [
      summary?.companyName,
      summary?.lastLoginAt,
      summary?.loginName,
      summary?.roleName,
      summary?.totpEnabled,
      summary?.userName,
    ],
  )

  return (
    <div className="page-stack dashboard-root">
      <Spin spinning={summaryQuery.isPending}>
        <div className="dashboard-hero">
          <div className="dashboard-hero-left">
            <h1 className="dashboard-hero-title">
              {summary?.companyName || '钢贸业务中台'}
            </h1>
            <p className="dashboard-hero-desc">
              服务器时间 {animatedServerTime}
            </p>
          </div>
          <div className="dashboard-hero-right">
            <Avatar size={48} style={{ backgroundColor: '#1677ff' }}>
              <UserOutlined />
            </Avatar>
            <div className="dashboard-hero-user">
              <strong>{summary?.userName || '—'}</strong>
              <span>{summary?.roleName || '—'}</span>
            </div>
          </div>
        </div>

        {summaryQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message="工作台数据加载失败，请刷新页面重试"
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Card title="业务流程总览" className="dashboard-flow-card">
          <div className="dashboard-flow-grid">
            {workflowSections.map((section) => (
              <section
                key={section.key}
                className="dashboard-flow-section"
                style={{ ['--flow-accent' as string]: section.accent }}
              >
                <div className="dashboard-flow-section-head">
                  <div className="dashboard-flow-section-title">
                    {section.title}
                  </div>
                  <div className="dashboard-flow-section-desc">
                    {section.description}
                  </div>
                </div>

                <div className="dashboard-flow-chain">
                  {section.nodes.map((node, index) => {
                    const Icon = node.icon
                    return (
                      <div
                        key={node.key}
                        className="dashboard-flow-chain-item"
                      >
                        <button
                          type="button"
                          className="dashboard-flow-node"
                          onClick={() =>
                            navigate({ to: node.path as '/' })
                          }
                        >
                          <span
                            className="dashboard-flow-node-icon"
                            style={{ background: node.tone }}
                          >
                            <Icon />
                          </span>
                          <span className="dashboard-flow-node-copy">
                            <strong>{node.title}</strong>
                            <small>{node.hint}</small>
                            {node.metric ? <em>{node.metric}</em> : null}
                          </span>
                        </button>
                        {index < section.nodes.length - 1 ? (
                          <span className="dashboard-flow-arrow">→</span>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Card title="账户信息" className="dashboard-panel">
              <Descriptions
                column={1}
                size="small"
                className="dashboard-descriptions"
                items={infoItems.map((item) => {
                  const Icon = item.icon
                  return {
                    key: item.key,
                    label: item.label,
                    children: (
                      <>
                        <Icon style={{ marginRight: 6, opacity: 0.45 }} />
                        {item.value}
                      </>
                    ),
                  }
                })}
              />
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="系统概况" className="dashboard-panel">
              <Statistic
                title="活跃会话"
                value={summary?.activeSessionCount ?? 0}
                style={{ marginBottom: 16 }}
              />
              <Statistic
                title="可见菜单"
                value={summary?.visibleMenuCount ?? 0}
                style={{ marginBottom: 16 }}
              />
              <Statistic
                title="操作权限项"
                value={summary?.actionCount ?? 0}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  )
}
