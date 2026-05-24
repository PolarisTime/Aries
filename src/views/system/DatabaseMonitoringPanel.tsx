/** @file-dynamic-ref:route — PG 监控面板，由 DatabaseBackupView 内部引用 */
import { ReloadOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Progress from 'antd/es/progress'
import Row from 'antd/es/row'
import Table from 'antd/es/table'
import Typography from 'antd/es/typography'
import { useCallback, useEffect, useState } from 'react'
import { getPgMonitoring, type PgMonitoring } from '@/api/database-admin'

interface Props {
  visible: boolean
}

export function DatabaseMonitoringPanel({ visible }: Props) {
  const [data, setData] = useState<PgMonitoring | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getPgMonitoring())
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (visible && !data) void fetch()
  }, [visible, data, fetch])

  if (!visible) return null

  const bloatColor = (pct: number) =>
    pct > 20 ? '#ef4444' : pct > 10 ? '#f59e0b' : '#22c55e'

  return (
    <div className="bg-default rounded p-24 mb-16">
      <div className="flex justify-between mb-20">
        <Typography.Title level={5} className="m-0">
          PG 性能监控
        </Typography.Title>
        <Button
          size="small"
          loading={loading}
          icon={<ReloadOutlined />}
          onClick={() => void fetch()}
        >
          刷新
        </Button>
      </div>
      {data ? (
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small" title="缓存命中率">
              <Table
                rowKey="tableName"
                dataSource={data.cacheEfficiency}
                columns={[
                  {
                    dataIndex: 'tableName',
                    title: '表',
                    width: 200,
                    ellipsis: true,
                  },
                  {
                    dataIndex: 'heapCachePct',
                    title: '堆缓存',
                    width: 80,
                    align: 'right',
                    render: (v: number) => `${v}%`,
                  },
                  {
                    dataIndex: 'idxCachePct',
                    title: '索引缓存',
                    width: 80,
                    align: 'right',
                    render: (v: number) => `${v}%`,
                  },
                  {
                    dataIndex: 'hotUpdatePct',
                    title: 'HOT更新',
                    width: 80,
                    align: 'right',
                    render: (v: number) => `${v}%`,
                  },
                ]}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="表膨胀率">
              <Table
                rowKey="tableName"
                dataSource={data.tableBloat}
                columns={[
                  {
                    dataIndex: 'tableName',
                    title: '表',
                    width: 180,
                    ellipsis: true,
                  },
                  {
                    dataIndex: 'deadRows',
                    title: '死元组',
                    width: 60,
                    align: 'right',
                  },
                  {
                    dataIndex: 'deadPct',
                    title: '膨胀',
                    width: 100,
                    align: 'right',
                    render: (v: number) => (
                      <Progress
                        percent={v}
                        size="small"
                        strokeColor={bloatColor(v)}
                        format={() => `${v}%`}
                      />
                    ),
                  },
                ]}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="慢查询 TOP10">
              <Table
                rowKey="queryPreview"
                dataSource={data.topSlowQueries}
                columns={[
                  {
                    dataIndex: 'queryPreview',
                    title: 'SQL',
                    width: 280,
                    ellipsis: true,
                  },
                  {
                    dataIndex: 'calls',
                    title: '次数',
                    width: 60,
                    align: 'right',
                  },
                  {
                    dataIndex: 'avgMs',
                    title: '平均ms',
                    width: 70,
                    align: 'right',
                    render: (v: number) => v.toFixed(1),
                  },
                  {
                    dataIndex: 'pctTotal',
                    title: '占比',
                    width: 60,
                    align: 'right',
                    render: (v: number) => `${v}%`,
                  },
                ]}
                size="small"
                pagination={false}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="未使用索引">
              <Table
                rowKey="indexName"
                dataSource={data.unusedIndexes}
                columns={[
                  {
                    dataIndex: 'indexName',
                    title: '索引',
                    width: 240,
                    ellipsis: true,
                  },
                  {
                    dataIndex: 'size',
                    title: '大小',
                    width: 70,
                    align: 'right',
                  },
                  {
                    dataIndex: 'scans',
                    title: '扫描',
                    width: 50,
                    align: 'right',
                  },
                ]}
                size="small"
                pagination={false}
                locale={{ emptyText: '无未使用索引' }}
              />
            </Card>
          </Col>
        </Row>
      ) : null}
    </div>
  )
}
