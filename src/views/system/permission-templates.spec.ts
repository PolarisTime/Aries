import { describe, expect, it } from 'vitest'
import { isKnownAppIconKey } from '@/config/app-icons'
import {
  applyTemplate,
  diffTemplate,
  getPermissionTemplate,
  matchTemplate,
  matchTemplates,
  PERMISSION_TEMPLATES,
  type PermissionTemplate,
  validateAllTemplates,
  validateTemplate,
} from './permission-templates'

/**
 * 真实权限码快照（守卫基准）。
 *
 * <p><b>来源</b>：2026-10-19 实测开发库 `sys_permission` 表，共 166 条 / 53 个资源。</p>
 *
 * <p><b>为什么把清单抄进测试而不是查接口</b>：单元测试不能连数据库，
 * 也不该依赖一个需要鉴权的 HTTP 接口。抄快照是"把外部事实固化成可断言基准"，
 * 代价是后端新增权限后这里是旧的——但**本测试的方向是单向的**：
 * 它只断言「模板里的码都在快照里」，所以后端新增权限不会让测试变红，
 * 只有模板写错码才会红。这正是我们要拦的那类缺陷。</p>
 *
 * <p><b>重新生成</b>：后端增删权限后，如需让快照跟上，用下面命令替换数组内容：</p>
 * <pre>
 * cd leo &amp;&amp; source scripts/env/dev.sh \
 *   &amp;&amp; PGPASSWORD="$SPRING_DATASOURCE_PASSWORD" psql -h localhost \
 *      -U "$SPRING_DATASOURCE_USERNAME" -d leo -tAc "select code from sys_permission order by 1"
 * </pre>
 */
const KNOWN_PERMISSION_CODES: readonly string[] = [
  '*',
  'attachment-manifest-exports:export',
  'attachment-upload-sessions:complete',
  'attachment-upload-sessions:create',
  'attachments:create',
  'attachments:read',
  'attachments:update',
  'carriers:create',
  'carriers:delete',
  'carriers:read',
  'carriers:update',
  'cash-ledger:export',
  'cash-ledger:read',
  'code-issuances:create',
  'code-issuances:read',
  'company-settings:create',
  'company-settings:delete',
  'company-settings:read',
  'company-settings:update',
  'customer-statements:confirm',
  'customer-statements:create',
  'customer-statements:delete',
  'customer-statements:read',
  'customer-statements:update',
  'customers:create',
  'customers:delete',
  'customers:read',
  'customers:update',
  'dashboard:read',
  'finance:read',
  'freight-bills:audit',
  'freight-bills:create',
  'freight-bills:delete',
  'freight-bills:read',
  'freight-bills:update',
  'freight-statements:audit',
  'freight-statements:create',
  'freight-statements:delete',
  'freight-statements:read',
  'freight-statements:update',
  'global-search:read',
  'import-batches:rollback',
  'inventory:backfill',
  'inventory:read',
  'inventory:read:cost',
  'ledger-adjustments:audit',
  'ledger-adjustments:create',
  'ledger-adjustments:delete',
  'ledger-adjustments:read',
  'ledger-adjustments:update',
  'length-premiums:create',
  'length-premiums:delete',
  'length-premiums:read',
  'length-premiums:update',
  'material-categories:create',
  'material-categories:delete',
  'material-categories:read',
  'material-categories:update',
  'material-exports:export',
  'material-imports:import',
  'material-imports:preview',
  'material-price-matches:read',
  'materials:create',
  'materials:delete',
  'materials:read',
  'materials:update',
  'meta:read',
  'module-exports:export',
  'operation-logs:read',
  'payments:audit',
  'payments:create',
  'payments:delete',
  'payments:read',
  'payments:update',
  'permissions:read',
  'print-exports:print',
  'print-previews:read',
  'print-templates:create',
  'print-templates:delete',
  'print-templates:read',
  'print-templates:update',
  'projects:create',
  'projects:delete',
  'projects:read',
  'projects:update',
  'purchase-inbounds:audit',
  'purchase-inbounds:create',
  'purchase-inbounds:delete',
  'purchase-inbounds:read',
  'purchase-inbounds:unaudit',
  'purchase-inbounds:update',
  'purchase-orders:audit',
  'purchase-orders:create',
  'purchase-orders:delete',
  'purchase-orders:force-close',
  'purchase-orders:read',
  'purchase-orders:unaudit',
  'purchase-orders:update',
  'quote-regions:create',
  'quote-regions:delete',
  'quote-regions:read',
  'quote-regions:update',
  'quote-sheets:create',
  'quote-sheets:delete',
  'quote-sheets:read',
  'quote-sheets:update',
  'receipts:audit',
  'receipts:create',
  'receipts:delete',
  'receipts:read',
  'receipts:update',
  'roles:read',
  'roles:write',
  'sales-contracts:create',
  'sales-contracts:delete',
  'sales-contracts:read',
  'sales-contracts:update',
  'sales-orders:audit',
  'sales-orders:complete',
  'sales-orders:confirm',
  'sales-orders:create',
  'sales-orders:delete',
  'sales-orders:export',
  'sales-orders:read',
  'sales-orders:read:amount',
  'sales-orders:unaudit',
  'sales-orders:update',
  'sales-orders:update:unit-price',
  'sales-outbounds:audit',
  'sales-outbounds:create',
  'sales-outbounds:delete',
  'sales-outbounds:read',
  'sales-outbounds:unaudit',
  'sales-outbounds:update',
  'sales-returns:audit',
  'sales-returns:create',
  'sales-returns:delete',
  'sales-returns:read',
  'sales-returns:unaudit',
  'sales-returns:update',
  'steel-quote-backfills:backfill',
  'steel-quote-backfills:read',
  'steel-quote-calendars:read',
  'steel-quote-syncs:read',
  'steel-quote-syncs:sync',
  'steel-quotes:read',
  'supplier-price-lists:create',
  'supplier-price-lists:delete',
  'supplier-price-lists:read',
  'supplier-price-lists:update',
  'suppliers:create',
  'suppliers:delete',
  'suppliers:read',
  'suppliers:update',
  'system:admin',
  'user-accounts:read',
  'user-accounts:update',
  'user-accounts:write',
  'value-aliases:create',
  'value-aliases:delete',
  'value-aliases:read',
  'value-aliases:update',
  'warehouses:create',
  'warehouses:delete',
  'warehouses:read',
  'warehouses:update',
]

const KNOWN = new Set(KNOWN_PERMISSION_CODES)

/** 构造一个假模板，用于验证「守卫真的会红」。 */
function fakeTemplate(
  permissions: readonly string[],
  overrides: Partial<PermissionTemplate> = {},
): PermissionTemplate {
  return {
    code: 'fake',
    nameZh: '假模板',
    nameEn: 'Fake',
    descriptionZh: '仅用于测试',
    descriptionEn: 'test only',
    icon: 'UserOutlined',
    color: 'blue',
    permissions,
    ...overrides,
  }
}

describe('权限码快照本身可信', () => {
  it('共 166 条、去重、含超管通配符 `*`', () => {
    // 条数锁死：快照被误删/截断时这里先红，避免守卫在空集上"全绿"
    expect(KNOWN_PERMISSION_CODES).toHaveLength(166)
    expect(new Set(KNOWN_PERMISSION_CODES).size).toBe(166)
    // `*` 是真实存在的权限码（SUPER_ADMIN 用），保留在快照里但模板禁止使用
    expect(KNOWN_PERMISSION_CODES).toContain('*')
  })

  it('除超管通配符外，每个码都是 resource:action 或 resource:action:field 形态', () => {
    for (const code of KNOWN_PERMISSION_CODES) {
      expect(code).not.toBe('')
      // `*` 是唯一不带冒号的码（SUPER_ADMIN 通配），单独放行
      if (code === '*') {
        continue
      }
      expect(code.split(':').length).toBeGreaterThanOrEqual(2)
      expect(code.split(':').every((segment) => segment.length > 0)).toBe(true)
    }
  })

  it('含 3 个字段级权限码（read:amount / update:unit-price / read:cost）', () => {
    const fieldLevel = KNOWN_PERMISSION_CODES.filter(
      (code) => code.split(':').length === 3,
    )
    expect(fieldLevel.toSorted()).toEqual([
      'inventory:read:cost',
      'sales-orders:read:amount',
      'sales-orders:update:unit-price',
    ])
  })
})

describe('守卫：模板权限码必须真实存在', () => {
  it('四个模板的每个权限码都在真实清单里', () => {
    const results = validateAllTemplates(KNOWN)
    // 逐模板断言，失败时能直接看出是哪个模板哪个码
    for (const result of results) {
      expect(result, `模板 ${result.templateCode} 校验未通过`).toEqual({
        templateCode: result.templateCode,
        unknownCodes: [],
        duplicateCodes: [],
        sorted: true,
        ok: true,
      })
    }
    expect(results).toHaveLength(4)
  })

  it('四个模板的所有码合起来也没有一个越界', () => {
    const all = PERMISSION_TEMPLATES.flatMap((template) => [
      ...template.permissions,
    ])
    const unknown = all.filter((code) => !KNOWN.has(code))
    expect(unknown).toEqual([])
  })

  it('模板不得使用超管通配符 `*`（否则等于给了全部权限）', () => {
    for (const template of PERMISSION_TEMPLATES) {
      expect(template.permissions).not.toContain('*')
    }
  })
})

/**
 * 这一组是「守卫的有效性证明」。
 *
 * <p>如果只写前面那组「模板码都在清单里」，那么**当校验函数本身被写坏、
 * 或模板权限数组为空时，测试依然是绿的** —— 守卫就是假的。所以这里反向喂
 * 已知有问题的数据，断言校验函数**确实报错**。校验函数一旦退化成 `return ok`，
 * 这几个用例会立刻红。</p>
 */
describe('守卫的有效性：喂坏数据必须报错', () => {
  it('含不存在的权限码时，unknownCodes 非空且 ok=false', () => {
    const bad = fakeTemplate([
      'sales-orders:read',
      'sales-orders:read:amount',
      'sales-orders:this-action-does-not-exist',
      'no-such-resource:read',
    ])

    const result = validateTemplate(bad, KNOWN)

    expect(result.ok).toBe(false)
    expect(result.unknownCodes.toSorted()).toEqual([
      'no-such-resource:read',
      'sales-orders:this-action-does-not-exist',
    ])
    // 真实存在的码不应被误报
    expect(result.unknownCodes).not.toContain('sales-orders:read')
    expect(result.unknownCodes).not.toContain('sales-orders:read:amount')
  })

  it('用空清单校验现有模板时，全部码都应被判为未知（证明不是恒真）', () => {
    // 反面：把"已知清单"换成空集，真实模板也必须全部报错
    const results = validateAllTemplates(new Set())
    for (const result of results) {
      expect(result.ok).toBe(false)
      expect(result.unknownCodes.length).toBeGreaterThan(0)
    }
    // 且未知码数量应等于该模板的权限数（空清单下无一能命中）
    const salesperson = results.find((r) => r.templateCode === 'salesperson')
    const template = getPermissionTemplate('salesperson')
    expect(salesperson?.unknownCodes).toHaveLength(
      template?.permissions.length ?? -1,
    )
  })

  it('含重复码时 duplicateCodes 非空且 ok=false', () => {
    const bad = fakeTemplate([
      'sales-orders:read',
      'sales-orders:read',
      'sales-orders:update',
    ])

    const result = validateTemplate(bad, KNOWN)

    expect(result.ok).toBe(false)
    expect(result.duplicateCodes).toEqual(['sales-orders:read'])
    expect(result.unknownCodes).toEqual([])
  })

  it('未按字典序排列时 sorted=false 且 ok=false', () => {
    const bad = fakeTemplate(['sales-orders:update', 'sales-orders:read'])

    const result = validateTemplate(bad, KNOWN)

    expect(result.ok).toBe(false)
    expect(result.sorted).toBe(false)
  })

  it('完全合法的假模板能通过（证明上一组红不是因为校验函数恒报错）', () => {
    const good = fakeTemplate(['sales-orders:read', 'sales-orders:read:amount'])

    const result = validateTemplate(good, KNOWN)

    expect(result.ok).toBe(true)
    expect(result.unknownCodes).toEqual([])
  })
})

describe('模板元数据', () => {
  it('code 唯一且与 getPermissionTemplate 一致', () => {
    const codes = PERMISSION_TEMPLATES.map((template) => template.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) {
      expect(getPermissionTemplate(code)?.code).toBe(code)
    }
    expect(getPermissionTemplate('nope')).toBeUndefined()
  })

  it('中英名称/描述都不为空（用于 UI 双语文案）', () => {
    for (const template of PERMISSION_TEMPLATES) {
      expect(template.nameZh.trim()).not.toBe('')
      expect(template.nameEn.trim()).not.toBe('')
      expect(template.descriptionZh.trim()).not.toBe('')
      expect(template.descriptionEn.trim()).not.toBe('')
    }
  })

  it('图标名都能被 resolveAppIcon 识别（不留死图标）', () => {
    for (const template of PERMISSION_TEMPLATES) {
      expect(
        isKnownAppIconKey(template.icon),
        `${template.code} 的图标 ${template.icon} 不存在`,
      ).toBe(true)
    }
  })

  it('各模板的权限项数与产品确认的粒度一致', () => {
    // 数字锁死：模板范围被误改（多给/少给权限）时这里会红
    expect(
      Object.fromEntries(
        PERMISSION_TEMPLATES.map((template) => [
          template.code,
          template.permissions.length,
        ]),
      ),
    ).toEqual({
      salesperson: 12,
      supervisor: 27,
      dispatcher: 9,
      finance: 29,
    })
  })

  it('主管是业务员的超集（业务员全部权限）', () => {
    const salesperson = getPermissionTemplate('salesperson')
    const supervisor = getPermissionTemplate('supervisor')
    const supervisorCodes = new Set(supervisor?.permissions)
    for (const code of salesperson?.permissions ?? []) {
      expect(supervisorCodes.has(code), `主管缺少业务员的 ${code}`).toBe(true)
    }
    // 且确实多给了金额可见
    expect(supervisorCodes.has('sales-orders:read:amount')).toBe(true)
  })

  it('只有主管和财务能看金额，只有财务能看成本', () => {
    const withAmount = PERMISSION_TEMPLATES.filter((template) =>
      template.permissions.includes('sales-orders:read:amount'),
    ).map((template) => template.code)
    const withCost = PERMISSION_TEMPLATES.filter((template) =>
      template.permissions.includes('inventory:read:cost'),
    ).map((template) => template.code)

    expect(withAmount.toSorted()).toEqual(['finance', 'supervisor'])
    expect(withCost).toEqual(['finance'])
  })
})

describe('applyTemplate：并集语义', () => {
  const salesperson = getPermissionTemplate('salesperson') as PermissionTemplate

  it('用户已选但模板没有的权限不会被清空', () => {
    const current = ['system:admin', 'roles:read']

    const merged = applyTemplate(salesperson, current)

    expect(merged).toContain('system:admin')
    expect(merged).toContain('roles:read')
    // 模板权限也全部到位
    for (const code of salesperson.permissions) {
      expect(merged).toContain(code)
    }
    expect(merged).toHaveLength(current.length + salesperson.permissions.length)
  })

  it('已经勾过的模板权限不会重复', () => {
    const current = ['sales-orders:read', 'sales-orders:create']

    const merged = applyTemplate(salesperson, current)

    expect(merged.filter((code) => code === 'sales-orders:read')).toHaveLength(
      1,
    )
    expect(merged).toHaveLength(salesperson.permissions.length)
  })

  it('不修改入参，且输出已排序去重', () => {
    const current = ['system:admin', 'sales-orders:read', 'system:admin']
    const snapshot = [...current]

    const merged = applyTemplate(salesperson, current)

    expect(current).toEqual(snapshot)
    expect(new Set(merged).size).toBe(merged.length)
    expect(merged).toEqual([...merged].toSorted())
  })

  it('幂等：套用两次结果相同', () => {
    const once = applyTemplate(salesperson, [])
    const twice = applyTemplate(salesperson, once)
    expect(twice).toEqual(once)
  })

  it('对空选择即等于模板本身（排序后）', () => {
    expect(applyTemplate(salesperson, [])).toEqual(
      [...salesperson.permissions].toSorted(),
    )
  })
})

describe('diffTemplate：供 UI 提示增量', () => {
  const salesperson = getPermissionTemplate('salesperson') as PermissionTemplate

  it('added 是模板中尚未勾选的部分', () => {
    const diff = diffTemplate(salesperson, ['sales-orders:read'])

    expect(diff.added).not.toContain('sales-orders:read')
    expect(diff.added).toHaveLength(salesperson.permissions.length - 1)
    expect(diff.added).toEqual([...diff.added].toSorted())
  })

  it('retained 是当前已选但不在模板里的额外权限', () => {
    const diff = diffTemplate(salesperson, [
      'sales-orders:read',
      'system:admin',
    ])

    expect(diff.retained).toEqual(['system:admin'])
  })

  it('removed 恒为空：并集语义下套用不会删除任何已有权限', () => {
    // 这条是语义守卫：若将来有人把 applyTemplate 改成「替换」，
    // diffTemplate 的 removed 会开始非空，本用例立刻红
    const diff = diffTemplate(salesperson, ['system:admin', 'roles:write'])
    expect(diff.removed).toEqual([])

    // 交叉验证：applyTemplate 的实际结果确实没丢这两项
    const merged = applyTemplate(salesperson, ['system:admin', 'roles:write'])
    expect(merged).toContain('system:admin')
    expect(merged).toContain('roles:write')
  })

  it('added 的数量与 applyTemplate 的实际增量一致', () => {
    const current = ['sales-orders:read', 'system:admin']
    const diff = diffTemplate(salesperson, current)
    const merged = applyTemplate(salesperson, current)

    expect(merged.length - current.length).toBe(diff.added.length)
  })

  it('当前已完全包含模板时 added 为空', () => {
    const diff = diffTemplate(salesperson, [...salesperson.permissions])
    expect(diff.added).toEqual([])
    expect(diff.retained).toEqual([])
  })
})

describe('matchTemplate：完全匹配 / 部分匹配 / 不匹配', () => {
  const salesperson = getPermissionTemplate('salesperson') as PermissionTemplate
  const finance = getPermissionTemplate('finance') as PermissionTemplate

  it('完全匹配：集合相等 → exact', () => {
    const match = matchTemplate([...salesperson.permissions])

    expect(match.kind).toBe('exact')
    expect(match.template?.code).toBe('salesperson')
    expect(match.similarity).toBe(1)
    expect(match.missing).toEqual([])
    expect(match.extra).toEqual([])
  })

  it('完全匹配与顺序无关', () => {
    const shuffled = [...salesperson.permissions].toReversed()
    expect(matchTemplate(shuffled).kind).toBe('exact')
  })

  it('部分匹配：模板 + 少量自定义 → partial，并给出 extra', () => {
    const match = matchTemplate([
      ...salesperson.permissions,
      'system:admin',
      'roles:read',
    ])

    expect(match.kind).toBe('partial')
    expect(match.template?.code).toBe('salesperson')
    expect(match.missing).toEqual([])
    expect(match.extra).toEqual(['roles:read', 'system:admin'])
    // Jaccard: 12 / (12 + 2) = 0.857...
    expect(match.similarity).toBeCloseTo(12 / 14, 5)
  })

  it('部分匹配：少勾几项仍能识别，并给出 missing', () => {
    const partial = salesperson.permissions.filter(
      (code) => code !== 'sales-orders:delete',
    )
    const match = matchTemplate(partial)

    expect(match.kind).toBe('partial')
    expect(match.template?.code).toBe('salesperson')
    expect(match.missing).toEqual(['sales-orders:delete'])
  })

  it('不匹配：空选择 → none', () => {
    const match = matchTemplate([])

    expect(match.kind).toBe('none')
    expect(match.template).toBeNull()
    expect(match.similarity).toBe(0)
  })

  it('不匹配：与任何模板都无交集 → none', () => {
    const match = matchTemplate([
      'system:admin',
      'roles:write',
      'user-accounts:write',
      'permissions:read',
      'print-templates:delete',
    ])

    expect(match.kind).toBe('none')
    expect(match.template).toBeNull()
  })

  it('不匹配：交集过少（低于 0.6 阈值）→ none', () => {
    // 财务 29 项里只有 2 项 → 2 / 29 = 0.069
    const match = matchTemplate(['receipts:read', 'payments:read'])

    expect(match.kind).toBe('none')
    expect(match.template).toBeNull()
  })

  it('多模板同分时按「额外更少」优先，而非数组顺序', () => {
    // 调度(9) ∪ 财务(29) 的并集：财务 29/38=0.76，调度 9/38=0.24 → 财务
    const dispatcher = getPermissionTemplate('dispatcher') as PermissionTemplate
    const union = [
      ...new Set([...dispatcher.permissions, ...finance.permissions]),
    ]

    const match = matchTemplate(union)

    expect(match.kind).toBe('partial')
    expect(match.template?.code).toBe('finance')
  })
})

describe('matchTemplates：候选列表', () => {
  it('空选择返回空数组', () => {
    expect(matchTemplates([])).toEqual([])
  })

  it('按相似度降序，且与 matchTemplate 的首项一致', () => {
    const salesperson = getPermissionTemplate(
      'salesperson',
    ) as PermissionTemplate
    const current = [...salesperson.permissions, 'system:admin']

    const candidates = matchTemplates(current)
    const best = matchTemplate(current)

    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates[0].template?.code).toBe(best.template?.code)
    for (let index = 1; index < candidates.length; index += 1) {
      expect(candidates[index - 1].similarity).toBeGreaterThanOrEqual(
        candidates[index].similarity,
      )
    }
  })

  it('精确匹配时候选首项标记为 exact', () => {
    const dispatcher = getPermissionTemplate('dispatcher') as PermissionTemplate
    const candidates = matchTemplates([...dispatcher.permissions])

    expect(candidates[0].kind).toBe('exact')
    expect(candidates[0].template?.code).toBe('dispatcher')
  })
})
