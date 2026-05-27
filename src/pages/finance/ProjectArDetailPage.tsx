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
import { useTranslation } from 'react-i18next'
import { assertApiSuccess, http } from '@/api/client'

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

function formatAmount(value: number | undefined | null, locale: string): string {
  if (value == null) return '-'
  return value.toLocaleString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(value: string | undefined | null): string {
  if (!value) return '-'
  return value
}

function useDetailColumns(locale: string): ColumnsType<ProjectArDetailRow> {
  const { t } = useTranslation()
  return useMemo(() => [
    { title: t('finance.projectArDetail.sourceDocumentNo'), dataIndex: 'sourceDocumentNo', width: 160 },
    { title: t('finance.projectArDetail.documentType'), dataIndex: 'documentType', width: 100 },
    {
      title: t('finance.projectArDetail.businessDate'),
      dataIndex: 'businessDate',
      width: 120,
      render: (v: string) => formatDate(v),
    },
    { title: t('finance.projectArDetail.customerCode'), dataIndex: 'customerCode', width: 110 },
    { title: t('finance.projectArDetail.customerName'), dataIndex: 'customerName', width: 140 },
    {
      title: t('finance.projectArDetail.amount'),
      dataIndex: 'amount',
      width: 120,
      align: 'right',
      render: (v: number) => formatAmount(v, locale),
    },
    {
      title: t('finance.projectArDetail.writtenOffAmount'),
      dataIndex: 'writtenOffAmount',
      width: 120,
      align: 'right',
      render: (v: number) => formatAmount(v, locale),
    },
    {
      title: t('finance.projectArDetail.unwrittenOffAmount'),
      dataIndex: 'unwrittenOffAmount',
      width: 120,
      align: 'right',
      render: (v: number) => formatAmount(v, locale),
    },
    { title: t('finance.projectArDetail.reconciliationStatus'), dataIndex: 'reconciliationStatus', width: 120 },
    { title: t('finance.projectArDetail.receiptStatus'), dataIndex: 'receiptStatus', width: 100 },
    { title: t('finance.projectArDetail.operatorName'), dataIndex: 'operatorName', width: 100 },
    { title: t('common.remark'), dataIndex: 'remark', width: 150 },
  ], [t, locale])
}

export function ProjectArDetailPage(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const detailColumns = useDetailColumns(locale)
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
  }, [location])

  const fetchSummary = useCallback(async () => {
    if (!projectId) return
    try {
      const res = await http.get<{
        code: number
        data: PageResponse<ProjectArSummary>
      }>(`/project-ar/summary?projectId=${projectId}&page=0&size=1`)
      assertApiSuccess(res)
      if (res.data?.content?.length > 0) {
        setSummary(res.data.content[0])
      }
    } catch (e) {
      console.error('[ProjectArDetailPage] fetchSummary failed:', e)
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
        assertApiSuccess(res)
        if (tab === 'unreconciled') {
          setUnreconciledData(res.data.content)
          setUnreconciledTotal(res.data.totalElements)
        } else {
          setReconciledData(res.data.content)
          setReconciledTotal(res.data.totalElements)
        }
      } catch (e) {
        console.error(`[ProjectArDetailPage] fetchTabData(${tab}) failed:`, e)
      } finally {
        setTabLoading(false)
      }
    },
    [projectId],
  )

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    void Promise.all([
      fetchSummary(),
      fetchTabData('unreconciled'),
      fetchTabData('reconciled'),
    ]).finally(() => setLoading(false))
  }, [projectId, fetchSummary, fetchTabData])

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    void fetchTabData(key)
  }

  const handleBack = () => {
    void navigate({ to: '/project-ar' as '/' })
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
          {t('common.back')}
        </Button>
        <Title level={4} className="!mb-0">
          {t('finance.projectArDetail.title')}
        </Title>
      </Flex>

      {summary && (
        <Card title={t('finance.projectArDetail.projectOverview')} size="small">
          <Descriptions column={4} size="small" bordered>
            <Descriptions.Item label={t('finance.projectArDetail.projectName')}>
              {summary.projectName}
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.projectNameAbbr')}>
              {summary.projectNameAbbr || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.customerCode')}>
              {summary.customerCode}
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.customerName')}>
              {summary.customerName}
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.projectAddress')}>
              {summary.projectAddress || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.projectStatus')}>
              {summary.projectStatus || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.projectManager')}>
              {summary.projectManager || '-'}
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.contactPerson')}>{'-'}</Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.completedSalesAmount')}>
              <Text strong className="text-base">
                {formatAmount(summary.completedSalesAmount, locale)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.prepaymentBalance')}>
              <Text className="text-base">
                {formatAmount(summary.prepaymentBalance, locale)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.unreceivedAmount')}>
              <Text color="danger" className="text-base">
                {formatAmount(summary.unreceivedAmount, locale)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label={t('finance.projectArDetail.netUnreceivedAmount')}>
              <Text color="danger" strong className="text-base">
                {formatAmount(summary.netUnreceivedAmount, locale)}
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
            label: t('finance.projectArDetail.unreconciledTab', { count: unreconciledTotal }),
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
            label: t('finance.projectArDetail.reconciledTab', { count: reconciledTotal }),
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
