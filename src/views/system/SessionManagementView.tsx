import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card, Button, Table, Tag, Space, Modal, Input, Statistic, message, Row, Col,
} from 'antd'
import { ReloadOutlined, StopOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listRefreshTokens, getRefreshTokenSummary, revokeRefreshToken, revokeAllRefreshTokens,
  type RefreshTokenRecord,
} from '@/api/session-management'
import { usePermissionStore } from '@/stores/permissionStore'
import { useRequestError } from '@/hooks/useRequestError'

export function SessionManagementView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canEdit = permissionStore.can('session', 'update')

  const [keyword, setKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: tokensData, isLoading } = useQuery({
    queryKey: ['refresh-tokens', currentPage, pageSize, keyword],
    queryFn: async () => {
      return listRefreshTokens({
        page: currentPage - 1,
        size: pageSize,
        keyword: keyword.trim() || undefined,
      })
    },
  })

  const { data: summary } = useQuery({
    queryKey: ['refresh-tokens-summary'],
    queryFn: getRefreshTokenSummary,
  })

  const tokens = tokensData?.records || []
  const totalElements = Number(tokensData?.totalElements) || 0

  const startAutoRefresh = useCallback(() => {
    refreshTimerRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['refresh-tokens'] })
      queryClient.invalidateQueries({ queryKey: ['refresh-tokens-summary'] })
    }, 30000)
  }, [queryClient])

  const stopAutoRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    startAutoRefresh()
    return stopAutoRefresh
  }, [startAutoRefresh, stopAutoRefresh])

  const getStatusColor = useCallback((status: string) => {
    if (status === '有效') return 'green'
    if (status === '已禁用') return 'red'
    return 'default'
  }, [])

  const getOnlineColor = useCallback((record: RefreshTokenRecord) => {
    if (record.status !== '有效') return 'default'
    return record.online ? 'green' : 'orange'
  }, [])

  const getOnlineLabel = useCallback((record: RefreshTokenRecord) => {
    if (record.status !== '有效') return '离线'
    return record.online ? '在线' : '离线'
  }, [])

  const truncateDeviceInfo = useCallback((text: unknown) => {
    const s = String(text ?? '')
    if (!s) return '--'
    return s.length > 60 ? s.slice(0, 60) + '...' : s
  }, [])

  const handleRevoke = useCallback((record: RefreshTokenRecord) => {
    if (!canEdit) { message.warning('暂无会话管理权限'); return }
    Modal.confirm({
      title: '禁用令牌',
      content: '确定禁用该会话令牌吗？禁用后对应设备需要重新登录。',
      okText: '确认禁用', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await revokeRefreshToken(record.id)
          message.success('已禁用')
          queryClient.invalidateQueries({ queryKey: ['refresh-tokens'] })
          queryClient.invalidateQueries({ queryKey: ['refresh-tokens-summary'] })
        } catch (err) {
          showError(err, '禁用失败')
        }
      },
    })
  }, [canEdit, queryClient, showError])

  const handleRevokeAll = useCallback(() => {
    if (!canEdit) { message.warning('暂无会话管理权限'); return }
    Modal.confirm({
      title: '清除全部令牌',
      content: '确定禁用所有有效的会话令牌吗？所有设备将需要重新登录。',
      okText: '确认清除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const response = await revokeAllRefreshTokens()
          message.success(response.message || '已清除')
          queryClient.invalidateQueries({ queryKey: ['refresh-tokens'] })
          queryClient.invalidateQueries({ queryKey: ['refresh-tokens-summary'] })
        } catch (err) {
          showError(err, '清除失败')
        }
      },
    })
  }, [canEdit, queryClient, showError])

  const columns = [
    { dataIndex: 'tokenId', title: 'Token ID', width: 200, ellipsis: true },
    { dataIndex: 'loginName', title: '登录名', width: 120 },
    { dataIndex: 'userName', title: '用户名', width: 120 },
    { dataIndex: 'loginIp', title: '登录IP', width: 140 },
    { dataIndex: 'deviceInfo', title: '设备信息', width: 280, ellipsis: true, render: (v: unknown) => truncateDeviceInfo(v) },
    { dataIndex: 'createdAt', title: '创建时间', width: 170 },
    { dataIndex: 'lastActiveAt', title: '最近活跃', width: 170, render: (v: string) => v || '--' },
    { dataIndex: 'expiresAt', title: '过期时间', width: 170 },
    {
      title: '在线状态', key: 'online', width: 100, align: 'center' as const,
      render: (_: unknown, record: RefreshTokenRecord) => (
        <Tag color={getOnlineColor(record)}>{getOnlineLabel(record)}</Tag>
      ),
    },
    {
      dataIndex: 'status', title: '状态', width: 100, align: 'center' as const,
      render: (v: string) => <Tag color={getStatusColor(v)}>{v}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 100, align: 'center' as const,
      render: (_: unknown, record: RefreshTokenRecord) => (
        canEdit && record.status === '有效' ? (
          <Button type="link" size="small" danger icon={<StopOutlined />} onClick={() => handleRevoke(record)}>禁用</Button>
        ) : null
      ),
    },
  ]

  return (
    <div className="page-stack">
      <Card
        title="会话管理"
        extra={
          <Space>
            <Input.Search
              placeholder="搜索 Token ID / IP / 设备信息"
              style={{ width: 320 }}
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={() => { setCurrentPage(1); queryClient.invalidateQueries({ queryKey: ['refresh-tokens'] }) }}
            />
            <Button icon={<ReloadOutlined />} onClick={() => { queryClient.invalidateQueries({ queryKey: ['refresh-tokens'] }); queryClient.invalidateQueries({ queryKey: ['refresh-tokens-summary'] }) }}>刷新</Button>
            {canEdit && <Button danger icon={<DeleteOutlined />} onClick={handleRevokeAll}>清除全部</Button>}
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Statistic title="在线人数" value={summary?.onlineUsers ?? 0} /></Col>
          <Col span={8}><Statistic title="在线设备" value={summary?.onlineSessions ?? 0} /></Col>
          <Col span={8}><Statistic title="有效会话" value={summary?.activeSessions ?? 0} /></Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={tokens}
          loading={isLoading}
          size="middle"
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalElements,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size) },
          }}
        />
      </Card>
    </div>
  )
}
