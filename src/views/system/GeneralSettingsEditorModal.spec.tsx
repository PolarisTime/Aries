import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/FormModal', () => ({
  FormModal: ({
    children,
    title,
    open,
  }: {
    children: React.ReactNode
    title: string
    open: boolean
  }) =>
    open ? (
      <div data-testid="form-modal">
        <div>{title}</div>
        {children}
      </div>
    ) : null,
}))

vi.mock('antd', () => {
  const Form = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  Form.Item = ({
    children,
    label,
  }: {
    children: React.ReactNode
    label: string
  }) => (
    <div>
      {label && <span>{label}</span>}
      {children}
    </div>
  )
  const Input = () => <input />
  Input.TextArea = () => <textarea />

  const Space = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  Space.Compact = Space
  Space.Addon = Space

  return {
    ColorPicker: () => <div>ColorPicker</div>,
    Form,
    Input,
    Select: () => <div>Select</div>,
    Space,
    Switch: () => <div>Switch</div>,
    Typography: {
      Text: ({ children }: { children: React.ReactNode }) => (
        <span>{children}</span>
      ),
    },
  }
})

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
    expect(
      screen.getByText('system.generalSettingsEditor.settingCode'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.generalSettingsEditor.settingName'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('system.generalSettingsEditor.remark'),
    ).toBeInTheDocument()
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
    render(
      <GeneralSettingsEditorModal {...defaultProps} record={toggleRecord} />,
    )
    expect(
      screen.getByText('system.generalSettingsEditor.enabledStatus'),
    ).toBeInTheDocument()
  })

  it('renders watermark content for watermark setting', () => {
    const watermarkRecord = {
      ...defaultProps.record,
      settingCode: 'SYS_WATERMARK_CONTENT',
    }
    render(
      <GeneralSettingsEditorModal {...defaultProps} record={watermarkRecord} />,
    )
    expect(
      screen.getByText('system.generalSettingsEditor.watermarkContent'),
    ).toBeInTheDocument()
  })
})
