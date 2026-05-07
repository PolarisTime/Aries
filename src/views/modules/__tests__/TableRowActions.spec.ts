import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import TableRowActions from '@/views/modules/components/TableRowActions.vue'
import type { ModuleRecord } from '@/types/module-page'

const record: ModuleRecord = { id: 'row-1', status: '草稿' }

function actionLabels(overrides: Record<string, unknown>) {
  const wrapper = mount(TableRowActions, {
    props: {
      record,
      canView: true,
      canEdit: true,
      canAudit: false,
      canReverseAudit: false,
      canDelete: true,
      canAttach: false,
      isReadOnly: false,
      ...overrides,
    },
    global: {
      plugins: [Antd],
    },
  })
  return wrapper.findAll('.table-action-btn').map((link) => link.text())
}

describe('TableRowActions', () => {
  it('renders audit action for auditable list rows', () => {
    expect(actionLabels({ canAudit: true })).toContain('审核')
  })

  it('renders reverse audit action for audited list rows', () => {
    expect(actionLabels({ canReverseAudit: true, record: { id: 'row-2', status: '已审核' } })).toContain('反审核')
  })

  it('renders confirm labels for statement rows', () => {
    expect(actionLabels({ canAudit: true, auditLabel: '确认' })).toContain('确认')
    expect(actionLabels({
      canReverseAudit: true,
      reverseAuditLabel: '反确认',
      record: { id: 'row-3', status: '已确认' },
    })).toContain('反确认')
  })
})
