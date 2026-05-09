import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, message } from 'antd'
import { useCallback, useMemo, useState } from 'react'
import { listSystemSettings, saveSystemSetting } from '@/api/system-settings'
import { useRequestError } from '@/hooks/useRequestError'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import { GeneralSettingsEditorModal } from '@/views/system/GeneralSettingsEditorModal'
import { GeneralSettingsTableCard } from '@/views/system/GeneralSettingsTableCard'
import {
  isDefaultTaxRateSetting,
  isNumericSetting,
  isToggleSetting,
  matchesGeneralSettingKeyword,
} from '@/views/system/general-settings-view-utils'
import { isSystemSwitch } from '@/views/system/number-rules-view-utils'

export function GeneralSettingsView() {
  const queryClient = useQueryClient()
  const { showError } = useRequestError()
  const permissionStore = usePermissionStore()
  const canEdit = permissionStore.can('general-setting', 'update')

  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  )
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<ModuleRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const { data: rows = [], isLoading } = useQuery<ModuleRecord[]>({
    queryKey: ['general-setting'],
    queryFn: () => listSystemSettings(),
  })

  const filteredRows = useMemo(
    () =>
      rows
        .filter(isSystemSwitch)
        .filter((record) => {
          if (statusFilter && String(record.status || '') !== statusFilter) {
            return false
          }
          return matchesGeneralSettingKeyword(record, keyword)
        }),
    [rows, keyword, statusFilter],
  )

  const basicSettingRows = useMemo(
    () => filteredRows.filter(isNumericSetting),
    [filteredRows],
  )
  const switchRows = useMemo(
    () => filteredRows.filter(isToggleSetting),
    [filteredRows],
  )

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['general-setting'] })
  }, [queryClient])

  const openEditor = useCallback(
    (record: ModuleRecord) => {
      if (!canEdit) {
        message.warning('暂无编辑权限')
        return
      }
      setEditingRecord(record)
      form.setFieldsValue({
        settingCode: record.settingCode,
        settingName: record.settingName,
        billName: record.billName,
        remark: record.remark,
        enabled: String(record.status || '') === '正常',
        numericValue: isDefaultTaxRateSetting(record)
          ? Number(record.sampleNo || 0.13)
          : Number(record.sampleNo || 0),
        selectedActions: String(record.sampleNo || '')
          .split(',')
          .filter(Boolean),
      })
      setEditorOpen(true)
    },
    [canEdit, form],
  )

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
      await saveSystemSetting({
        id: editingRecord.id,
        settingCode: values.settingCode,
        settingName: values.settingName,
        billName: values.billName,
        prefix: '',
        dateRule: '',
        serialLength: 0,
        resetRule: '',
        remark: values.remark,
        status: values.enabled ? '正常' : '禁用',
        sampleNo,
      })
      message.success('保存成功')
      refresh()
      setEditorOpen(false)
    } catch (error) {
      showError(error, '保存失败')
    } finally {
      setSaving(false)
    }
  }, [editingRecord, form, refresh, showError])

  return (
    <div className="page-stack">
      <GeneralSettingsTableCard
        keyword={keyword}
        statusFilter={statusFilter}
        filteredRows={filteredRows}
        basicSettingRows={basicSettingRows}
        switchRows={switchRows}
        loading={isLoading}
        canEdit={canEdit}
        onKeywordChange={setKeyword}
        onStatusFilterChange={setStatusFilter}
        onRefresh={refresh}
        onEdit={openEditor}
      />

      <GeneralSettingsEditorModal
        open={editorOpen}
        record={editingRecord}
        form={form}
        saving={saving}
        onSave={() => {
          void handleSave()
        }}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  )
}
