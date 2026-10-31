import { describe, expect, it } from 'vitest'
import {
  isMainFlowModuleKey,
  MAIN_FLOW_MODULE_KEYS,
  type ModuleRecordContractCheck,
} from './module-record'

describe('主流程模块契约(schema ↔ 手写 map)', () => {
  it('三张 map 与 schema 注册表键值一致(编译期断言由 tsc 校验)', () => {
    // `ModuleRecordContractCheck` 内部每一项都是 `Expect<true>`: 手写 map 的键或值与
    // 对应 zod schema 注册表不一致时, 本文件在 `tsc -b` 阶段就会报错, 不必等运行时。
    const check: ModuleRecordContractCheck = {
      recordKeys: true,
      recordValues: true,
      listKeys: true,
      saveKeys: true,
      saveValues: true,
    }
    expect(Object.values(check).every(Boolean)).toBe(true)
  })

  it('主流程模块 key 无重复, 且全部能被类型守卫识别', () => {
    expect(new Set(MAIN_FLOW_MODULE_KEYS).size).toBe(
      MAIN_FLOW_MODULE_KEYS.length,
    )
    for (const key of MAIN_FLOW_MODULE_KEYS) {
      expect(isMainFlowModuleKey(key)).toBe(true)
    }
    expect(isMainFlowModuleKey('not-a-module')).toBe(false)
    expect(isMainFlowModuleKey('')).toBe(false)
  })
})
