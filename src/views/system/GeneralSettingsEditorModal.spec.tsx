import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({ children, title, open }: { children: React.ReactNode; title: string; open: boolean }) =>
    open ? (
      <div data-testid="form-modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('antd/es/form', () => {
  const Form = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Form.Item = ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      {label && <span>{label}</span>}
      {children}
    </div>
  )
  Form.useForm = () => [{}]
  return { default: Form }
})

vi.mock('antd/es/input', () => {
  const Input = () => <input />
  Input.TextArea = () => <textarea />
  return { default: Input }
})

vi.mock('antd/es/select', () => ({
  default: () => <div>Select</div>,
}))

vi.mock('antd/es/switch', () => ({
  default: () => <div>Switch</div>,
}))

vi.mock('antd/es/color-picker', () => ({
  default: () => <div>ColorPicker</div>,
}))

vi.mock('antd/es/space', () => {
  const Space = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  Space.Compact = Space
  return { default: Space }
})

vi.mock('antd/es/typography', () => ({
  default: {
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  },
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: (v: unknown) => String(v ?? ''),
}))

const formInstance = {
  getFieldValue: vi.fn(),
  getFieldsValue: vi.fn(() => ({})),
  setFieldsValue: vi.fn(),
  setFieldValue: vi.fn(),
  resetFields: vi.fn(),
  validateFields: vi.fn(),
}

import { GeneralSettingsEditorModal } from '@/views/system/GeneralSettingsEditorModal'

describe('GeneralSettingsEditorModal', () => {
  const defaultProps = {
    open: true,
    record: {
      id: '1',
      settingCode: 'SYS_DEFAULT_TAX_RATE',
      settingName: '默认税率',
      billName: '',
      prefix: '',
      dateRule: '',
      serialLength: 0,
      resetRule: '',
      sampleNo: '0.13',
      status: '正常',
      remark: '税率配置',
      ruleType: '',
      moduleKey: '',
    },
    form: formInstance as never,
    saving: false,
    onSave: vi.fn(),
    onClose: vi.fn(),
  }

  it('renders without crashing', () => {
    expect(GeneralSettingsEditorModal).toBeDefined()
    expect(typeof GeneralSettingsEditorModal).toBe('function')
  })

  it('renders modal when open', () => {
    render(<GeneralSettingsEditorModal {...defaultProps} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<GeneralSettingsEditorModal {...defaultProps} open={false} />)
    expect(screen.queryByTestId('form-modal')).not.toBeInTheDocument()
  })

  it('renders form fields', () => {
    render(<GeneralSettingsEditorModal {...defaultProps} />)
    expect(screen.getByText('system.generalSettingsEditor.settingCode')).toBeInTheDocument()
    expect(screen.getByText('system.generalSettingsEditor.settingName')).toBeInTheDocument()
    expect(screen.getByText('system.generalSettingsEditor.remark')).toBeInTheDocument()
  })

  it('renders null record gracefully', () => {
    render(<GeneralSettingsEditorModal {...defaultProps} record={null} />)
    expect(screen.getByTestId('form-modal')).toBeInTheDocument()
  })

  it('renders toggle switch fields for toggle setting', () => {
    const toggleRecord = {
      ...defaultProps.record,
      settingCode: 'SYS_BATCH_NO_AUTO_GENERATE',
    }
    render(<GeneralSettingsEditorModal {...defaultProps} record={toggleRecord} />)
    expect(screen.getByText('system.generalSettingsEditor.enabledStatus')).toBeInTheDocument()
  })

  it('renders watermark content for watermark setting', () => {
    const watermarkRecord = {
      ...defaultProps.record,
      settingCode: 'SYS_WATERMARK_CONTENT',
    }
    render(<GeneralSettingsEditorModal {...defaultProps} record={watermarkRecord} />)
    expect(screen.getByText('system.generalSettingsEditor.watermarkContent')).toBeInTheDocument()
  })
})
