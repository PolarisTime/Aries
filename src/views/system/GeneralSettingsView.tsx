/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { asString } from '@/utils/type-narrowing'
import { useQuery } from '@tanstack/react-query'
import { useRefreshQuery } from '@/hooks/useRefreshQuery'
import Form from 'antd/es/form'
import { useCallback, useMemo, useState } from 'react'
import { listSystemSettings, saveSystemSetting } from '@/api/system-settings'
import { useRequestError } from '@/hooks/useRequestError'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'
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
  const [toggling, setToggling] = useState(false)
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
          if (statusFilter && asString(record.status) !== statusFilter) {
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

  const refresh = useRefreshQuery('general-setting')

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
        enabled: asString(record.status) === '正常',
        numericValue: isDefaultTaxRateSetting(record)
          ? Number(record.sampleNo || 0.13)
          : Number(record.sampleNo || 0),
        selectedActions: asString(record.sampleNo)
          .split(',')
          .filter(Boolean),
      })
      setEditorOpen(true)
    },
    [canEdit, form],
  )

  const handleToggle = useCallback(
    async (record: ModuleRecord) => {
      setToggling(true)
      const nextStatus = asString(record.status) === '正常' ? '禁用' : '正常'
      try {
        await saveSystemSetting({
          id: record.id,
          settingCode: record.settingCode,
          settingName: record.settingName,
          billName: record.billName,
          prefix: 'SYS',
          dateRule: 'NONE',
          serialLength: 6,
          resetRule: 'NEVER',
          sampleNo: record.sampleNo || 'ON',
          status: nextStatus,
          remark: record.remark,
        })
        message.success(nextStatus === '正常' ? '已启用' : '已关闭')
        refresh()
      } catch (error) {
        showError(error, '操作失败')
      } finally {
        setToggling(false)
      }
    },
    [refresh, showError],
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
        prefix: 'SYS',
        dateRule: 'NONE',
        serialLength: 6,
        resetRule: 'NEVER',
        remark: values.remark,
        status: values.enabled ? '正常' : '禁用',
        sampleNo: sampleNo || 'ON',
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
        toggling={toggling}
        onKeywordChange={setKeyword}
        onStatusFilterChange={setStatusFilter}
        onRefresh={refresh}
        onEdit={openEditor}
        oonToggle={() => { void handleToggle }}
      />

      {editorOpen ? (
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
      ) : null}
    </div>
  )
}
