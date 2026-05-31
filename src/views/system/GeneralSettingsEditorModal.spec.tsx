import '@/i18n'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Form from 'antd/es/form'
import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { GeneralSettingsEditorModal } from '@/views/system/GeneralSettingsEditorModal'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock

function EditorHarness({
  onValidated,
  record,
}: {
  onValidated: (values: Record<string, unknown>) => void
  record: ModuleRecord
}) {
  const [form] = Form.useForm()
  form.setFieldsValue({
    settingCode: record.settingCode,
    settingName: record.settingName,
    billName: record.billName,
    numericValue: record.sampleNo,
  })

  return (
    <GeneralSettingsEditorModal
      open
      record={record}
      form={form}
      saving={false}
      onClose={vi.fn()}
      onSave={() => {
        void form.validateFields().then(onValidated)
      }}
    />
  )
}

describe('GeneralSettingsEditorModal', () => {
  it('binds watermark content textarea to numericValue', async () => {
    const record = {
      id: '221',
      settingCode: 'SYS_WATERMARK_CONTENT',
      settingName: '页面水印内容',
      billName: '界面显示',
      sampleNo: '{username}  {time}',
      status: '正常',
      remark: '支持变量',
    } satisfies ModuleRecord

    const onValidated = vi.fn()
    render(<EditorHarness record={record} onValidated={onValidated} />)

    const textarea = screen.getByLabelText('水印内容')
    fireEvent.change(textarea, { target: { value: '内部专用 {date}' } })

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }))

    await waitFor(() => {
      expect(onValidated).toHaveBeenCalledWith(
        expect.objectContaining({ numericValue: '内部专用 {date}' }),
      )
    })
  })
})
