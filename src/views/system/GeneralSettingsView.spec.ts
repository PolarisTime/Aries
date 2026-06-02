import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { buildSystemSettingPayload } from '@/views/system/GeneralSettingsView'
import {
  DETAILED_OPERATION_ACTION_VALUES,
  resolveDetailedOperationActionValues,
} from '@/views/system/general-settings-view-utils'

describe('buildSystemSettingPayload', () => {
  it('preserves general setting metadata when saving a value patch', () => {
    const record = {
      id: '221',
      settingCode: 'SYS_WATERMARK_CONTENT',
      settingName: '页面水印内容',
      billName: '界面显示',
      prefix: 'SYS',
      dateRule: 'yyyy',
      serialLength: 1,
      resetRule: 'YEARLY',
      sampleNo: '{username}  {time}',
      status: '正常',
      remark: '支持变量',
    } satisfies ModuleRecord

    expect(
      buildSystemSettingPayload(record, { sampleNo: '内部专用 {date}' }),
    ).toEqual(
      expect.objectContaining({
        prefix: 'SYS',
        dateRule: 'yyyy',
        serialLength: 1,
        resetRule: 'YEARLY',
        sampleNo: '内部专用 {date}',
        status: '正常',
      }),
    )
  })

  it('treats legacy detailed operation log ON value as all actions selected', () => {
    expect(resolveDetailedOperationActionValues('ON')).toEqual(
      DETAILED_OPERATION_ACTION_VALUES,
    )
  })

  it('filters detailed operation log actions to supported values', () => {
    expect(resolveDetailedOperationActionValues('QUERY,ON,PRINT')).toEqual([
      'QUERY',
      'PRINT',
    ])
  })
})
