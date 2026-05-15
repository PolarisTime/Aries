import { ArrowLeftOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from '@tanstack/react-router'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Descriptions from 'antd/es/descriptions'
import Flex from 'antd/es/flex'
import Spin from 'antd/es/spin'
import Table, { type ColumnsType } from 'antd/es/table'
import Tabs from 'antd/es/tabs'
import Typography from 'antd/es/typography'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { http } from '@/api/http'

const { Title } = Typography
const { Text } = Typography

interface ProjectArDetailRow {
  sourceDocumentNo: string
  documentType: string
  businessDate: string
  customerCode: string
  customerName: string
  amount: number
  writtenOffAmount: number
  unwrittenOffAmount: number
  reconciliationStatus: string
  receiptStatus: string
  operatorName: string
  remark: string
}

interface ProjectArSummary {
  projectId: number
  customerCode: string
  customerName: string
  projectName: string
  projectNameAbbr: string
  projectManager: string
  projectAddress?: string
  projectStatus?: string
  completedSalesAmount: number
  prepaymentBalance: number
  unreceivedAmount: number
  netUnreceivedAmount: number
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  currentPage: number
  pageSize: number
}

function formatAmount(value: number | undefined | null): string {
  if (value == null) return '-'
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value: string | undefined | null): string {
  if (!value) return '-'
  return value
}

const detailColumns: ColumnsType<ProjectArDetailRow> = [
  { title: '来源单据号', dataIndex: 'sourceDocumentNo', width: 160 },
  { title: '单据类型', dataIndex: 'documentType', width: 100 },
  {
    title: '业务日期',
    dataIndex: 'businessDate',
    width: 120,
    render: (v: string) => formatDate(v),
  },
  { title: '客户编码', dataIndex: 'customerCode', width: 110 },
  { title: '客户名称', dataIndex: 'customerName', width: 140 },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 120,
    align: 'right',
    render: (v: number) => formatAmount(v),
  },
  {
    title: '已核销金额',
    dataIndex: 'writtenOffAmount',
    width: 120,
    align: 'right',
    render: (v: number) => formatAmount(v),
  },
  {
    title: '未核销金额',
    dataIndex: 'unwrittenOffAmount',
    width: 120,
    align: 'right',
    render: (v: number) => formatAmount(v),
  },
  { title: '对账状态', dataIndex: 'reconciliationStatus', width: 120 },
  { title: '收款状态', dataIndex: 'receiptStatus', width: 100 },
  { title: '经办人', dataIndex: 'operatorName', width: 100 },
  { title: '备注', dataIndex: 'remark', width: 150 },
]

export function ProjectArDetailPage(): React.JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ProjectArSummary | null>(null)
  const [activeTab, setActiveTab] = useState('unreconciled')
  const [unreconciledData, setUnreconciledData] = useState<
    ProjectArDetailRow[]
  >([])
  const [reconciledData, setReconciledData] = useState<ProjectArDetailRow[]>([])
  const [unreconciledTotal, setUnreconciledTotal] = useState(0)
  const [reconciledTotal, setReconciledTotal] = useState(0)
  const [tabLoading, setTabLoading] = useState(false)

  const projectId: string = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean)
    return segments[segments.length - 1] || ''
  }, [location.pathname])

  const fetchSummary = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await http.get<{
        code: number
        data: PageResponse<ProjectArSummary>
      }>(`/project-ar/summary?projectId=${projectId}&page=0&size=1`)
      if (res.code === 0 && res.data?.content?.length > 0) {
        setSummary(res.data.content[0])
      }
    } catch {
      // ignore
    }
  }, [projectId])

  const fetchTabData = useCallback(
    async (tab: string) => {
      if (!projectId) return
      setTabLoading(true)
      try {
        const res = await http.get<{
          code: number
          data: PageResponse<ProjectArDetailRow>
        }>(`/project-ar/${projectId}/${tab}?page=0&size=100`)
        if (res.code === 0 && res.data) {
          if (tab === 'unreconciled') {
            setUnreconciledData(res.data.content)
            setUnreconciledTotal(res.data.totalElements)
          } else {
            setReconciledData(res.data.content)
            setReconciledTotal(res.data.totalElements)
          }
        }
      } catch {
        // ignore
      } finally {
        setTabLoading(false)
      }
    },
    [projectId],
  )

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    Promise.all([
      fetchSummary(),
      fetchTabData('unreconciled'),
      fetchTabData('reconciled'),
    ]).finally(() => setLoading(false))
  }, [projectId, fetchSummary, fetchTabData])

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    fetchTabData(key)
  }

  const handleBack = () => {
    navigate({ to: '/project-ar' as '/' })
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" className="min-h-[400px]">
        <Spin size="large" />
      </Flex>
    )
  }

  return (
    <Flex vertical gap="middle" className="pb-6">
      <Flex align="center" gap="small">
        <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
          返回
        </Button>
        <Title level={4} className="!mb-0">
          项目应收明细
        </Title>
      </Flex>

      {summary && (
        <Card title="项目总览" size="small">
          <Descriptions column={4} size="small" bordered>
            <Descriptions.Item label="项目名称">
              {summary.projectName}
            </Descriptions.Item>
            <Descriptions.Item label="项目简称">
              {summary.projectNameAbbr || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="客户编码">
              {summary.customerCode}
            </Descriptions.Item>
            <Descriptions.Item label="客户名称">
              {summary.customerName}
            </Descriptions.Item>
            <Descriptions.Item label="项目地址">
              {summary.projectAddress || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="项目状态">
              {summary.projectStatus || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="项目负责人">
              {summary.projectManager || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="联系人">{'-'}</Descriptions.Item>
            <Descriptions.Item label="完成销售总额">
              <Text strong className="text-base">
                {formatAmount(summary.completedSalesAmount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="项目预收余额">
              <Text className="text-base">
                {formatAmount(summary.prepaymentBalance)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="应收未收金额">
              <Text type="danger" className="text-base">
                {formatAmount(summary.unreceivedAmount)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="净未收敞口">
              <Text type="danger" strong className="text-base">
                {formatAmount(summary.netUnreceivedAmount)}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'unreconciled',
            label: `未对账单据 (${unreconciledTotal})`,
            children: (
              <Table
                rowKey="sourceDocumentNo"
                columns={detailColumns}
                dataSource={unreconciledData}
                loading={tabLoading}
                pagination={false}
                size="small"
                scroll={{ x: 1600 }}
              />
            ),
          },
          {
            key: 'reconciled',
            label: `已对账单据 (${reconciledTotal})`,
            children: (
              <Table
                rowKey="sourceDocumentNo"
                columns={detailColumns}
                dataSource={reconciledData}
                loading={tabLoading}
                pagination={false}
                size="small"
                scroll={{ x: 1600 }}
              />
            ),
          },
        ]}
      />
    </Flex>
  )
}
