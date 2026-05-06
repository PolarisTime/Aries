import { useState, useCallback, useMemo } from 'react'
import {
  Card, Button, Table, Tag, Space, Modal, Form, Input, Select, Typography, message, Row, Col, Statistic,
} from 'antd'
import { EditOutlined, ReloadOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listAllBusinessModuleRows, saveBusinessModule, updatePageUploadRule } from '@/api/business'
import { usePermissionStore } from '@/stores/permissionStore'
import { useRequestError } from '@/hooks/useRequestError'
import type { ModuleRecord } from '@/types/module-page'

const DATE_RULE_OPTIONS = [
  { label: '按年（yyyy）', value: 'yyyy' },
  { label: '按月（yyyyMM）', value: 'yyyyMM' },
  { label: '无日期', value: 'NONE' },
]

const RESET_RULE_OPTIONS = [
  { label: '按年重置', value: 'YEARLY' },
  { label: '按月重置', value: 'MONTHLY' },
  { label: '永不重置', value: 'NEVER' },
]

export function NumberRulesView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()

  const canEdit = permissionStore.can('general-setting', 'update')

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorKind, setEditorKind] = useState<'number-rule' | 'upload-rule'>('number-rule')
  const [editingRecord, setEditingRecord] = useState<ModuleRecord | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const { data: rows = [], isLoading } = useQuery<ModuleRecord[]>({
    queryKey: ['number-rules'],
    queryFn: () => listAllBusinessModuleRows('general-settings', {}),
  })

  const isUploadRule = useCallback((record: ModuleRecord) => String(record.ruleType || '') === 'UPLOAD_RULE', [])
  const isSystemSwitch = useCallback((record: ModuleRecord) => {
    if (isUploadRule(record)) return false
    const settingCode = String(record.settingCode || '')
    return settingCode.startsWith('UI_') || settingCode.startsWith('SYS_')
  }, [isUploadRule])
  const isNumberRule = useCallback((record: ModuleRecord) => !isUploadRule(record) && !isSystemSwitch(record), [isUploadRule, isSystemSwitch])

  const matchesKeyword = useCallback((record: ModuleRecord, searchKeyword: string) => {
    if (!searchKeyword.trim()) return true
    const normalized = searchKeyword.trim().toLowerCase()
    return [record.settingCode, record.settingName, record.billName, record.prefix, record.sampleNo, record.remark, record.moduleKey].some(
      (item) => String(item || '').toLowerCase().includes(normalized)
    )
  }, [])

  const filteredRows = useMemo(() => rows.filter((record: ModuleRecord) => {
    if (statusFilter && String(record.status || '') !== statusFilter) return false
    return matchesKeyword(record, keyword)
  }), [rows, keyword, statusFilter, matchesKeyword])

  const numberRuleRows = useMemo(() => filteredRows.filter(isNumberRule), [filteredRows, isNumberRule])
  const uploadRuleRows = useMemo(() => filteredRows.filter(isUploadRule), [filteredRows, isUploadRule])

  const formatDateRuleLabel = useCallback((value?: string) => {
    if (value === 'yyyy') return '按年（yyyy）'
    if (value === 'yyyyMM') return '按月（yyyyMM）'
    if (value === 'NONE') return '无日期'
    return value || '--'
  }, [])

  const formatResetRuleLabel = useCallback((value?: string) => {
    if (value === 'YEARLY') return '按年重置'
    if (value === 'MONTHLY') return '按月重置'
    if (value === 'NEVER') return '永不重置'
    return value || '--'
  }, [])

  const formatStatusText = useCallback((value?: string) => {
    if (value === '正常') return '正常'
    if (value === '禁用') return '禁用'
    return value || '--'
  }, [])

  const formatStatusColor = useCallback((value?: string) => {
    if (value === '正常') return 'green'
    if (value === '禁用') return 'red'
    return 'default'
  }, [])

  const buildRuleSampleNo = useCallback((prefix: string, dateRule: string, serialLength: number) => {
    let result = prefix || ''
    if (dateRule === 'yyyy') result += '2026'
    else if (dateRule === 'yyyyMM') result += '202601'
    result += String(1).padStart(serialLength || 6, '0')
    return result
  }, [])

  const buildUploadRulePreview = useCallback((pattern: string) => {
    if (!pattern) return ''
    return pattern
      .replace('{yyyy}', '2026')
      .replace('{yyyyMMdd}', '20260101')
      .replace('{HHmmss}', '120000')
      .replace('{yyyyMMddHHmmss}', '20260101120000')
      .replace('{timestamp}', String(Date.now()))
      .replace('{random8}', 'abcd1234')
      .replace('{originName}', '原始文件名')
      .replace('{ext}', '.pdf')
  }, [])

  const openNumberRuleEditor = useCallback((record: ModuleRecord) => {
    if (!canEdit) { message.warning('暂无编辑权限'); return }
    setEditingRecord(record)
    setEditorKind('number-rule')
    form.setFieldsValue({
      settingCode: record.settingCode, settingName: record.settingName,
      billName: record.billName, prefix: record.prefix || '',
      dateRule: record.dateRule || 'yyyy', serialLength: record.serialLength || 6,
      resetRule: record.resetRule || 'YEARLY', status: record.status || '正常',
      remark: record.remark || '',
    })
    setEditorOpen(true)
  }, [canEdit, form])

  const openUploadRuleEditor = useCallback((record: ModuleRecord) => {
    if (!canEdit) { message.warning('暂无编辑权限'); return }
    setEditingRecord(record)
    setEditorKind('upload-rule')
    form.setFieldsValue({
      moduleKey: record.moduleKey, moduleName: record.moduleName || record.billName,
      ruleCode: record.ruleCode || record.settingCode, ruleName: record.ruleName || record.settingName,
      renamePattern: record.renamePattern || record.prefix || '', status: record.status || '正常',
      remark: record.remark || '',
    })
    setEditorOpen(true)
  }, [canEdit, form])

  const handleSave = useCallback(async () => {
    if (!editingRecord) return
    setSaving(true)
    try {
      const values = await form.validateFields()
      if (editorKind === 'number-rule') {
        await saveBusinessModule('general-settings', {
          id: editingRecord.id, settingCode: values.settingCode, settingName: values.settingName,
          billName: values.billName, prefix: values.prefix, dateRule: values.dateRule,
          serialLength: values.serialLength, resetRule: values.resetRule,
          status: values.status, remark: values.remark,
        })
      } else {
        await updatePageUploadRule('general-settings', {
          renamePattern: values.renamePattern,
          status: values.status,
          remark: values.remark,
        })
      }
      message.success('保存成功')
      queryClient.invalidateQueries({ queryKey: ['number-rules'] })
      setEditorOpen(false)
    } catch (err) {
      showError(err, '保存失败')
    } finally {
      setSaving(false)
    }
  }, [editingRecord, form, editorKind, queryClient, showError])

  const numberRuleColumns = useMemo(() => [
    { dataIndex: 'billName', title: '单据', width: 140 },
    { dataIndex: 'settingName', title: '规则名称', width: 180 },
    { dataIndex: 'prefix', title: '规则模板', width: 240 },
    { title: '日期规则', key: 'dateRule', width: 150, render: (_: unknown, record: ModuleRecord) => formatDateRuleLabel(record.dateRule as string) },
    { dataIndex: 'serialLength', title: '流水位数', width: 100, align: 'right' as const },
    { title: '重置规则', key: 'resetRule', width: 120, render: (_: unknown, record: ModuleRecord) => formatResetRuleLabel(record.resetRule as string) },
    { dataIndex: 'sampleNo', title: '示例单号', width: 180 },
    {
      dataIndex: 'status', title: '状态', width: 100, align: 'center' as const,
      render: (v: string) => <Tag color={formatStatusColor(v)}>{formatStatusText(v)}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 90, align: 'center' as const,
      render: (_: unknown, record: ModuleRecord) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openNumberRuleEditor(record)}>编辑</Button>
      ),
    },
  ], [formatDateRuleLabel, formatResetRuleLabel, formatStatusColor, formatStatusText, openNumberRuleEditor])

  const uploadRuleColumns = useMemo(() => [
    { dataIndex: 'billName', title: '模块', width: 140 },
    { dataIndex: 'settingName', title: '规则名称', width: 180 },
    { dataIndex: 'prefix', title: '重命名模板', width: 240 },
    { dataIndex: 'sampleNo', title: '示例文件名', width: 200 },
    {
      dataIndex: 'status', title: '状态', width: 100, align: 'center' as const,
      render: (v: string) => <Tag color={formatStatusColor(v)}>{formatStatusText(v)}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 90, align: 'center' as const,
      render: (_: unknown, record: ModuleRecord) => (
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openUploadRuleEditor(record)}>编辑</Button>
      ),
    },
  ], [formatStatusColor, formatStatusText, openUploadRuleEditor])

  const numberRulePreview = useMemo(() => {
    const values = form.getFieldsValue()
    return buildRuleSampleNo(values.prefix || '', values.dateRule || 'yyyy', values.serialLength || 6)
  }, [form, buildRuleSampleNo])

  const uploadRulePreview = useMemo(() => {
    const values = form.getFieldsValue()
    return buildUploadRulePreview(values.renamePattern || '') || '--'
  }, [form, buildUploadRulePreview])

  return (
    <div className="page-stack">
      <Card
        title="编号规则"
        extra={
          <Space>
            <Input.Search
              placeholder="搜索规则项"
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
              options={[{ label: '正常', value: '正常' }, { label: '禁用', value: '禁用' }]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => queryClient.invalidateQueries({ queryKey: ['number-rules'] })}>刷新</Button>
          </Space>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}><Statistic title="单号规则" value={rows.filter((row: ModuleRecord) => isNumberRule(row)).length} /></Col>
          <Col span={8}><Statistic title="上传规则" value={rows.filter((row: ModuleRecord) => isUploadRule(row)).length} /></Col>
          <Col span={8}><Statistic title="禁用上传规则" value={rows.filter((row: ModuleRecord) => isUploadRule(row) && String(row.status || '') === '禁用').length} /></Col>
        </Row>

        <Typography.Title level={5}>单号规则</Typography.Title>
        <Table
          rowKey="id"
          columns={numberRuleColumns}
          dataSource={numberRuleRows}
          loading={isLoading}
          size="small"
          pagination={false}
          style={{ marginBottom: 24 }}
        />

        <Typography.Title level={5}>上传规则</Typography.Title>
        <Table
          rowKey="id"
          columns={uploadRuleColumns}
          dataSource={uploadRuleRows}
          loading={isLoading}
          size="small"
          pagination={false}
        />
      </Card>

      <Modal
        title={editorKind === 'number-rule' ? '编辑单号规则' : '编辑上传规则'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={600}
        maskClosable={false}
      >
        <Form form={form} layout="vertical">
          {editorKind === 'number-rule' ? (
            <>
              <Form.Item name="settingCode" label="规则编码"><Input disabled /></Form.Item>
              <Form.Item name="settingName" label="规则名称"><Input disabled /></Form.Item>
              <Form.Item name="billName" label="适用单据"><Input disabled /></Form.Item>
              <Form.Item name="prefix" label="规则模板" required>
                <Input placeholder="如：PO-{yyyy}{seq}" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="dateRule" label="日期规则">
                    <Select options={DATE_RULE_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="serialLength" label="流水位数">
                    <Input type="number" min={1} max={10} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="resetRule" label="重置规则">
                    <Select options={RESET_RULE_OPTIONS} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="status" label="状态">
                <Select options={[{ label: '正常', value: '正常' }, { label: '禁用', value: '禁用' }]} />
              </Form.Item>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Typography.Text type="secondary">示例单号：{numberRulePreview}</Typography.Text>
            </>
          ) : (
            <>
              <Form.Item name="moduleKey" label="模块编码"><Input disabled /></Form.Item>
              <Form.Item name="moduleName" label="模块名称"><Input disabled /></Form.Item>
              <Form.Item name="ruleCode" label="规则编码"><Input disabled /></Form.Item>
              <Form.Item name="ruleName" label="规则名称"><Input disabled /></Form.Item>
              <Form.Item name="renamePattern" label="重命名模板" required>
                <Input placeholder="如：{yyyyMMdd}_{originName}{ext}" />
              </Form.Item>
              <Form.Item name="status" label="状态">
                <Select options={[{ label: '正常', value: '正常' }, { label: '禁用', value: '禁用' }]} />
              </Form.Item>
              <Form.Item name="remark" label="备注">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Typography.Text type="secondary">示例文件名：{uploadRulePreview}</Typography.Text>
            </>
          )}
        </Form>
      </Modal>
    </div>
  )
}
