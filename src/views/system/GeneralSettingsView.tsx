import { useState, useCallback, useMemo } from 'react'
import {
  Card, Button, Table, Tag, Space, Modal, Form, Input, Select, Switch,
  Typography, message, Row, Col, Statistic,
} from 'antd'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listAllBusinessModuleRows, saveBusinessModule } from '@/api/business'
import { usePermissionStore } from '@/stores/permissionStore'
import { useRequestError } from '@/hooks/useRequestError'
import type { ModuleRecord } from '@/types/module-page'

const DEFAULT_TAX_RATE_SETTING_CODE = 'SYS_DEFAULT_TAX_RATE'
const MAX_CONCURRENT_SESSIONS_CODE = 'SYS_MAX_CONCURRENT_SESSIONS'

const SYSTEM_SWITCH_HELP_TEXT: Record<string, string> = {
  SYS_DEFAULT_TAX_RATE: '用于发票默认税率与税额自动计算，修改后新开票草稿会使用该值。',
  SYS_MAX_CONCURRENT_SESSIONS: '限制同一用户同时保持的有效会话数量，超出后最早的会话将被自动清理。设为 0 或留空表示不限制。',
  UI_WEIGHT_ONLY_PURCHASE_INBOUNDS: '启用后，采购入库页面切换到重量视图，隐藏金额和单价字段。',
  UI_WEIGHT_ONLY_SALES_OUTBOUNDS: '启用后，销售出库页面切换到重量视图，隐藏金额和单价字段。',
  SYS_CUSTOMER_STATEMENT_RECEIPT_ZERO_FROM_SALES_ORDER: '启用后，生成客户对账单草稿时默认收款金额为 0，期末余额等于所选销售订单总金额。',
  SYS_SUPPLIER_STATEMENT_FULL_PAYMENT_FROM_PURCHASE: '启用后，生成供应商对账单草稿时默认付款金额等于所选采购单据总金额。',
  SYS_OPERATION_LOG_RECORD_ALL_WRITE: '启用后，普通写操作会按新增、编辑、删除、审核、导出、打印自动记录。',
  SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS: '启用后，会按照下方勾选项自动记录页面层操作。',
  SYS_OPERATION_LOG_RECORD_AUTH_EVENTS: '启用后，登录成功、登录失败、2FA 验证失败和退出登录会写入操作日志。',
  SYS_FORCE_USER_TOTP_ON_FIRST_LOGIN: '启用后，管理员新增的账号首次使用密码登录时，会先进入专用安全引导页。',
  SYS_BATCH_NO_AUTO_GENERATE: '启用后，批号管理商品在明细未填写批号时，系统按单号规则中的批号生成规则自动补齐。',
  UI_HIDE_AUDITED_LIST_RECORDS: '启用后，业务列表分页查询默认不显示下方勾选状态的单据。',
  UI_SHOW_SNOWFLAKE_ID: '启用后，业务列表显示系统雪花 ID 列，便于排查数据问题。',
  SYS_LOGIN_CAPTCHA: '启用后，登录时需输入图形验证码，增加暴力破解防护。',
}

const DETAILED_OPERATION_ACTION_OPTIONS = [
  { label: '查询', value: 'QUERY' }, { label: '查看', value: 'DETAIL' },
  { label: '新增', value: 'CREATE' }, { label: '编辑', value: 'EDIT' },
  { label: '删除', value: 'DELETE' }, { label: '审核', value: 'AUDIT' },
  { label: '导出', value: 'EXPORT' }, { label: '打印', value: 'PRINT' },
]

const HIDE_AUDITED_STATUS_OPTIONS = [
  { label: '已审核', value: '已审核' }, { label: '已完成', value: '已完成' },
  { label: '完成采购', value: '完成采购' }, { label: '完成入库', value: '完成入库' },
  { label: '完成销售', value: '完成销售' }, { label: '已付款', value: '已付款' },
  { label: '已收款', value: '已收款' }, { label: '已签署', value: '已签署' },
  { label: '已送达', value: '已送达' },
]

export function GeneralSettingsView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canEdit = permissionStore.can('general-setting', 'update')

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ModuleRecord | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const { data: rows = [], isLoading } = useQuery<ModuleRecord[]>({
    queryKey: ['general-settings'],
    queryFn: () => listAllBusinessModuleRows('general-settings', {}),
  })

  const isDefaultTaxRateSetting = useCallback((record: ModuleRecord) => String(record.settingCode || '').trim() === DEFAULT_TAX_RATE_SETTING_CODE, [])
  const isMaxConcurrentSetting = useCallback((record: ModuleRecord) => String(record.settingCode || '').trim() === MAX_CONCURRENT_SESSIONS_CODE, [])
  const isNumericSetting = useCallback((record: ModuleRecord) => isDefaultTaxRateSetting(record) || isMaxConcurrentSetting(record), [isDefaultTaxRateSetting, isMaxConcurrentSetting])
  const isToggleSetting = useCallback((record: ModuleRecord) => !isNumericSetting(record), [isNumericSetting])

  const matchesKeyword = useCallback((record: ModuleRecord, searchKeyword: string) => {
    if (!searchKeyword.trim()) return true
    const normalized = searchKeyword.trim().toLowerCase()
    return [record.settingCode, record.settingName, record.billName, record.remark].some(
      (item) => String(item || '').toLowerCase().includes(normalized)
    )
  }, [])

  const filteredRows = useMemo(() => rows.filter((record: ModuleRecord) => {
    if (statusFilter && String(record.status || '') !== statusFilter) return false
    return matchesKeyword(record, keyword)
  }), [rows, keyword, statusFilter, matchesKeyword])

  const basicSettingRows = useMemo(() => filteredRows.filter((r: ModuleRecord) => isNumericSetting(r)), [filteredRows, isNumericSetting])
  const switchRows = useMemo(() => filteredRows.filter((r: ModuleRecord) => isToggleSetting(r)), [filteredRows, isToggleSetting])

  const formatSettingValue = useCallback((record: ModuleRecord) => {
    if (isDefaultTaxRateSetting(record)) {
      const val = Number(record.sampleNo || 0)
      return val ? `${(val * 100).toFixed(0)}%` : '13%'
    }
    if (isMaxConcurrentSetting(record)) {
      return String(record.sampleNo || '0')
    }
    return String(record.sampleNo || '--')
  }, [isDefaultTaxRateSetting, isMaxConcurrentSetting])

  const formatSwitchState = useCallback((record: ModuleRecord) => {
    if (String(record.status || '') !== '正常') return '已关闭'
    return '已启用'
  }, [])

  const openEditor = useCallback((record: ModuleRecord) => {
    if (!canEdit) { message.warning('暂无编辑权限'); return }
    setEditingRecord(record)
    form.setFieldsValue({
      settingCode: record.settingCode, settingName: record.settingName,
      billName: record.billName, remark: record.remark,
      enabled: String(record.status || '') === '正常',
      numericValue: isDefaultTaxRateSetting(record) ? Number(record.sampleNo || 0.13) : Number(record.sampleNo || 0),
      selectedActions: String(record.sampleNo || '').split(',').filter(Boolean),
    })
    setEditorOpen(true)
  }, [canEdit, form, isDefaultTaxRateSetting])

  const handleSave = useCallback(async () => {
    if (!editingRecord) return
    setSaving(true)
    try {
      const values = await form.validateFields()
      let sampleNo = ''
      if (isNumericSetting(editingRecord)) {
        sampleNo = String(values.numericValue || 0)
      } else if (isToggleSetting(editingRecord)) {
        sampleNo = values.selectedActions?.join(',') || ''
      }
      await saveBusinessModule('general-settings', {
        id: editingRecord.id,
        settingCode: values.settingCode,
        settingName: values.settingName,
        billName: values.billName,
        remark: values.remark,
        status: values.enabled ? '正常' : '禁用',
        sampleNo,
      })
      message.success('保存成功')
      queryClient.invalidateQueries({ queryKey: ['general-settings'] })
      setEditorOpen(false)
    } catch (err) {
      showError(err, '保存失败')
    } finally {
      setSaving(false)
    }
  }, [editingRecord, form, isNumericSetting, isToggleSetting, queryClient, showError])

  const basicSettingColumns = useMemo(() => [
    { dataIndex: 'billName', title: '适用范围', width: 160 },
    { dataIndex: 'settingName', title: '参数名称', width: 240 },
    { title: '当前值', key: 'value', width: 140, align: 'right' as const, render: (_: unknown, record: ModuleRecord) => formatSettingValue(record) },
    { dataIndex: 'remark', title: '说明', width: 420 },
    {
      title: '操作', key: 'action', width: 90, align: 'center' as const,
      render: (_: unknown, record: ModuleRecord) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditor(record)}>编辑</Button>
      ),
    },
  ], [formatSettingValue, openEditor])

  const switchColumns = useMemo(() => [
    { dataIndex: 'billName', title: '适用范围', width: 160 },
    { dataIndex: 'settingName', title: '开关名称', width: 240 },
    {
      title: '当前状态', key: 'state', width: 120, align: 'center' as const,
      render: (_: unknown, record: ModuleRecord) => (
        <Tag color={String(record.status || '') === '正常' ? 'processing' : 'default'}>{formatSwitchState(record)}</Tag>
      ),
    },
    { dataIndex: 'remark', title: '说明', width: 420 },
    {
      title: '操作', key: 'action', width: 90, align: 'center' as const,
      render: (_: unknown, record: ModuleRecord) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditor(record)}>编辑</Button>
      ),
    },
  ], [formatSwitchState, openEditor])

  return (
    <div className="page-stack">
      <Card
        title="通用设置"
        extra={
          <Space>
            <Input.Search
              placeholder="搜索设置项"
              style={{ width: 280 }}
              allowClear
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              allowClear placeholder="全部状态"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[{ label: '已启用', value: '正常' }, { label: '已关闭', value: '禁用' }]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['general-settings'] })}>刷新</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Statistic title="基础参数" value={basicSettingRows.length} /></Col>
          <Col span={8}><Statistic title="系统开关" value={switchRows.length} /></Col>
          <Col span={8}><Statistic title="当前启用" value={filteredRows.filter((row: ModuleRecord) => String(row.status || '') === '正常').length} /></Col>
        </Row>

        <Typography.Title level={5}>基础参数</Typography.Title>
        <Table
          rowKey="id"
          columns={basicSettingColumns}
          dataSource={basicSettingRows}
          loading={isLoading}
          size="small"
          pagination={false}
          style={{ marginBottom: 24 }}
        />

        <Typography.Title level={5}>系统开关</Typography.Title>
        <Table
          rowKey="id"
          columns={switchColumns}
          dataSource={switchRows}
          loading={isLoading}
          size="small"
          pagination={false}
        />
      </Card>

      <Modal
        title="编辑设置"
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={600}
        maskClosable={false}
      >
        {editingRecord && (
          <Form form={form} layout="vertical">
            <Form.Item name="settingCode" label="设置编码"><Input disabled /></Form.Item>
            <Form.Item name="settingName" label="设置名称"><Input disabled /></Form.Item>
            <Form.Item name="billName" label="适用范围"><Input disabled /></Form.Item>
            {isNumericSetting(editingRecord) ? (
              <Form.Item name="numericValue" label="当前值" required>
                {isDefaultTaxRateSetting(editingRecord) ? (
                  <Input type="number" min={0} max={1} step={0.01} addonAfter="%" />
                ) : (
                  <Input type="number" min={0} />
                )}
              </Form.Item>
            ) : (
              <>
                <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                  <Switch checkedChildren="启用" unCheckedChildren="关闭" />
                </Form.Item>
                {String(editingRecord.settingCode || '') === 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS' && (
                  <Form.Item name="selectedActions" label="记录的操作">
                    <Select mode="multiple" options={DETAILED_OPERATION_ACTION_OPTIONS} />
                  </Form.Item>
                )}
                {String(editingRecord.settingCode || '') === 'UI_HIDE_AUDITED_LIST_RECORDS' && (
                  <Form.Item name="selectedActions" label="隐藏的状态">
                    <Select mode="multiple" options={HIDE_AUDITED_STATUS_OPTIONS} />
                  </Form.Item>
                )}
              </>
            )}
            <Form.Item name="remark" label="说明"><Input.TextArea rows={2} disabled /></Form.Item>
            {SYSTEM_SWITCH_HELP_TEXT[String(editingRecord.settingCode || '')] && (
              <Typography.Text type="secondary">{SYSTEM_SWITCH_HELP_TEXT[String(editingRecord.settingCode || '')]}</Typography.Text>
            )}
          </Form>
        )}
      </Modal>
    </div>
  )
}
