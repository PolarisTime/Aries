import { fireEvent, render, screen } from '@testing-library/react'
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

const { mockNumericFieldValue } = vi.hoisted(() => ({
  mockNumericFieldValue: vi.fn(() => '#000000' as string | undefined),
}))

vi.mock('antd', async () => {
  const React = await vi.importActual<typeof import('react')>('react')
  const Form = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  Form.Item = ({
    children,
    extra,
    label,
    name,
  }: {
    children: React.ReactNode
    extra?: React.ReactNode
    label: string
    name?: string
  }) => (
    <div>
      {label && <span>{label}</span>}
      {name === 'numericValue' && React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            onChange: vi.fn(),
            value: mockNumericFieldValue(),
          })
        : children}
      {extra}
    </div>
  )
  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  )
  Input.TextArea = (
    props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  ) => <textarea {...props} />

  const Space = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  )
  Space.Compact = Space
  Space.Addon = Space

  return {
    ColorPicker: ({
      onChange,
    }: {
      onChange?: (_: unknown, hex: string) => void
    }) => (
      <button type="button" onClick={() => onChange?.(null, '#112233')}>
        ColorPicker
      </button>
    ),
    Form,
    Input,
    Select: ({ options = [] }: { options?: Array<{ label: string }> }) => (
      <div>
        Select
        {options.map((option) => (
          <span key={option.label}>{option.label}</span>
        ))}
      </div>
    ),
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

  beforeEach(() => {
    vi.clearAllMocks()
    mockNumericFieldValue.mockReturnValue('#000000')
  })

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

  it('renders watermark color picker for watermark color setting', () => {
    const watermarkColorRecord = {
      ...defaultProps.record,
      settingCode: 'SYS_WATERMARK_COLOR',
    }

    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={watermarkColorRecord}
      />,
    )

    expect(
      screen.getByText('system.generalSettingsEditor.watermarkColor'),
    ).toBeInTheDocument()
    expect(screen.getByText('ColorPicker')).toBeInTheDocument()
    expect(
      screen.queryByText('system.generalSettingsEditor.magicVars'),
    ).not.toBeInTheDocument()
  })

  it('updates watermark color from picker and text input', () => {
    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={{
          ...defaultProps.record,
          settingCode: 'SYS_WATERMARK_COLOR',
        }}
      />,
    )

    screen.getByText('ColorPicker').click()
    fireEvent.change(screen.getByPlaceholderText('rgba(0,0,0,0.08)'), {
      target: { value: '#445566' },
    })
  })

  it('renders watermark color input with empty form value', () => {
    mockNumericFieldValue.mockReturnValue(undefined)

    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={{
          ...defaultProps.record,
          settingCode: 'SYS_WATERMARK_COLOR',
        }}
      />,
    )

    expect(screen.getByPlaceholderText('rgba(0,0,0,0.08)')).toHaveValue('')
  })

  it.each([
    [
      'SYS_WATERMARK_FONT_SIZE',
      'system.generalSettingsEditor.watermarkFontSize',
      'px',
    ],
    [
      'SYS_WATERMARK_DENSITY',
      'system.generalSettingsEditor.watermarkDensity',
      'px',
    ],
    ['SYS_WATERMARK_ROTATE', 'system.generalSettingsEditor.currentValue', '°'],
  ])('renders watermark numeric controls for %s', (settingCode, label, addon) => {
    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={{ ...defaultProps.record, settingCode }}
      />,
    )

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(addon)).toBeInTheDocument()
  })

  it('renders default list page size numeric input', () => {
    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={{
          ...defaultProps.record,
          settingCode: 'UI_DEFAULT_LIST_PAGE_SIZE',
        }}
      />,
    )

    expect(
      screen.getByText('system.generalSettingsEditor.currentValue'),
    ).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveAttribute('max', '200')
  })

  it('renders generic numeric input for other numeric setting', () => {
    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={{
          ...defaultProps.record,
          settingCode: 'SYS_MAX_CONCURRENT_SESSIONS',
        }}
      />,
    )

    expect(
      screen.getByText('system.generalSettingsEditor.currentValue'),
    ).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveAttribute('min', '0')
  })

  it('renders detailed operation action selector', () => {
    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={{
          ...defaultProps.record,
          settingCode: 'SYS_OPERATION_LOG_DETAILED_PAGE_ACTIONS',
        }}
      />,
    )

    expect(
      screen.getByText('system.generalSettingsEditor.recordedActions'),
    ).toBeInTheDocument()
    expect(screen.getByText('Select')).toBeInTheDocument()
  })

  it('renders hide audited statuses selector', () => {
    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={{
          ...defaultProps.record,
          settingCode: 'UI_HIDE_AUDITED_LIST_RECORDS',
        }}
      />,
    )

    expect(
      screen.getByText('system.generalSettingsEditor.hiddenStatuses'),
    ).toBeInTheDocument()
    expect(screen.getByText('Select')).toBeInTheDocument()
  })

  it('renders default title when record name is empty', () => {
    render(
      <GeneralSettingsEditorModal
        {...defaultProps}
        record={{ ...defaultProps.record, settingName: '' }}
      />,
    )

    expect(
      screen.getByText(
        'system.generalSettingsEditor.editTitle system.generalSettingsEditor.defaultTitle',
      ),
    ).toBeInTheDocument()
  })
})
