import Button from 'antd/es/button'
import Radio from 'antd/es/radio'
import Select from 'antd/es/select'
import { useTranslation } from 'react-i18next'
import {
  fontSizeOptions,
  getLayoutModeOptions,
  getThemeModeOptions,
} from '@/layouts/personal-settings-constants'
import type { LayoutMode } from '@/layouts/usePersonalSettings'
import type { ThemeMode } from '@/utils/storage'

interface Props {
  fontSize: number
  layoutMode: LayoutMode
  themeMode: ThemeMode
  onFontSizeChange: (value: number) => void
  onLayoutModeChange: (value: LayoutMode) => void
  onThemeModeChange: (value: ThemeMode) => void
  onResetDisplay: () => void
  onSaveDisplay: () => void
}

export function PersonalSettingsDisplayTab({
  fontSize,
  layoutMode,
  themeMode,
  onFontSizeChange,
  onLayoutModeChange,
  onThemeModeChange,
  onResetDisplay,
  onSaveDisplay,
}: Props) {
  const { t } = useTranslation()
  const themeModeOptions = getThemeModeOptions(t)
  const layoutModeOptions = getLayoutModeOptions(t)

  return (
    <div className="personal-setting-panel">
      <div className="personal-setting-row">
        <span className="personal-setting-label">
          {t('layouts.settings.systemFont')}
        </span>
        <span className="personal-setting-value">
          {t('layouts.settings.systemFontDefault')}
        </span>
      </div>
      <div className="personal-setting-row">
        <span className="personal-setting-label">
          {t('layouts.settings.fontSize')}
        </span>
        <Select
          value={fontSize}
          className="w-160"
          onChange={onFontSizeChange}
          options={fontSizeOptions.map((value) => ({
            value,
            label: `${value}px`,
            title: `${value}px`,
          }))}
        />
      </div>
      <div className="personal-setting-row personal-setting-layout-row">
        <span className="personal-setting-label">
          {t('layouts.settings.navLayout')}
        </span>
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
      <div className="personal-setting-row">
        <span className="personal-setting-label">
          {t('layouts.settings.themeMode')}
        </span>
        <Radio.Group
          optionType="button"
          buttonStyle="solid"
          value={themeMode}
          onChange={(event) =>
            onThemeModeChange(event.target.value as ThemeMode)
          }
        >
          {themeModeOptions.map((item) => (
            <Radio.Button key={item.value} value={item.value}>
              {item.label}
            </Radio.Button>
          ))}
        </Radio.Group>
      </div>
      <div className="personal-setting-actions">
        <Button onClick={onResetDisplay}>
          {t('layouts.settings.resetDefault')}
        </Button>
        <Button type="primary" onClick={onSaveDisplay}>
          {t('layouts.settings.saveDisplay')}
        </Button>
      </div>
    </div>
  )
}
