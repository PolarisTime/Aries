import { Button, Radio, Select } from 'antd'
import {
  fontSizeOptions,
  layoutModeOptions,
} from '@/layouts/personal-settings-constants'
import type { LayoutMode } from '@/layouts/usePersonalSettings'

interface Props {
  fontSize: number
  layoutMode: LayoutMode
  onFontSizeChange: (value: number) => void
  onLayoutModeChange: (value: LayoutMode) => void
  onResetDisplay: () => void
  onSaveDisplay: () => void
}

export function PersonalSettingsDisplayTab({
  fontSize,
  layoutMode,
  onFontSizeChange,
  onLayoutModeChange,
  onResetDisplay,
  onSaveDisplay,
}: Props) {
  return (
    <div className="personal-setting-panel">
      <div className="personal-setting-row">
        <span className="personal-setting-label">系统字体</span>
        <span className="personal-setting-value">苹方</span>
      </div>
      <div className="personal-setting-row">
        <span className="personal-setting-label">字体大小</span>
        <Select
          value={fontSize}
          style={{ width: 160 }}
          onChange={onFontSizeChange}
          options={fontSizeOptions.map((value) => ({
            value,
            label: `${value}px`,
            title: `${value}px`,
          }))}
        />
      </div>
      <div className="personal-setting-row personal-setting-layout-row">
        <span className="personal-setting-label">导航布局</span>
        <Radio.Group
          className="personal-layout-mode-group"
          optionType="button"
          buttonStyle="solid"
          value={layoutMode}
          onChange={(event) =>
            onLayoutModeChange(event.target.value as LayoutMode)
          }
        >
          {layoutModeOptions.map((item) => (
            <Radio.Button key={item.value} value={item.value}>
              {item.label}
            </Radio.Button>
          ))}
        </Radio.Group>
      </div>
      <div className="personal-layout-mode-desc">
        {
          layoutModeOptions.find((item) => item.value === layoutMode)
            ?.description
        }
      </div>
      <div className="personal-setting-actions">
        <Button onClick={onResetDisplay}>恢复默认</Button>
        <Button type="primary" onClick={onSaveDisplay}>
          保存显示设置
        </Button>
      </div>
    </div>
  )
}
