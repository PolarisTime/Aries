import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Form, Input, Modal, Skeleton, Steps, Tag } from 'antd'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listPermissions } from '@/api/system/permissions'
import { getRole } from '@/api/system/roles'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { RoleFormValues, RoleResponse } from '@/shared/schemas'
import { message } from '@/utils/antd-app'
import {
  applyTemplate,
  diffTemplate,
  matchTemplate,
  PERMISSION_TEMPLATES,
  type PermissionTemplate,
} from '@/views/system/permission-templates'
import { RolePermissionMatrixEditor } from '@/views/system/RolePermissionMatrixEditor'
import { hasWildcardPermission } from '@/views/system/role-permission-utils'
import {
  buildRoleWizardInitialValues,
  buildRoleWizardSubmit,
  type RoleWizardSubmit,
  resolveRoleWizardSourceId,
  resolveRoleWizardTitleKey,
} from '@/views/system/role-wizard-model'
import { WizardFooterActions } from './wizard-footer-actions'

export type { RoleWizardSubmit }

interface Props {
  open: boolean
  /** 编辑目标；为 null 表示新建。 */
  role: RoleResponse | null
  /** 克隆源：存在时以该角色的信息与权限作为初值，保存为新建角色。 */
  cloneFrom?: RoleResponse | null
  saving: boolean
  onSave: (submit: RoleWizardSubmit) => void
  onClose: () => void
}

/**
 * 角色配置向导：基本信息 → 权限配置。
 * - 新建：创建角色后写入所选权限；
 * - 编辑：更新角色后覆盖权限；
 * - 克隆：以源角色信息/权限为初值，保存为新角色。
 * 调用方通过 key 在每次打开时重挂载本组件，保证步骤/表单初值重置。
 */
export function RoleWizardModal({
  open,
  role,
  cloneFrom = null,
  saving,
  onSave,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [form] = Form.useForm<RoleFormValues>()
  const [current, setCurrent] = useState(0)
  const selectedRef = useRef<string[]>([])
  const permissionsTouchedRef = useRef(false)
  const cloning = Boolean(cloneFrom)
  const builtin = !cloning && Boolean(role?.builtin)
  const sourceId = resolveRoleWizardSourceId(role, cloneFrom)
  const initialValues = buildRoleWizardInitialValues({
    cloning,
    role,
    cloneFrom,
    t,
  })

  const roleQuery = useQuery({
    queryKey: QUERY_KEYS.role(sourceId),
    queryFn: ({ signal }) => getRole(sourceId, signal),
    enabled: open && Boolean(sourceId),
  })

  const wildcard = hasWildcardPermission(roleQuery.data?.permissions ?? [])

  const goNext = async () => {
    await form.validateFields()
    setCurrent(1)
  }

  const submit = async () => {
    const values = await form.validateFields()
    onSave(
      buildRoleWizardSubmit({
        cloning,
        roleId: role?.id,
        builtin,
        values,
        permissionsTouched: permissionsTouchedRef.current,
        selectedPermissions: selectedRef.current,
        rolePermissions: roleQuery.data?.permissions,
      }),
    )
  }

  const handlePermissionsChange = (next: string[]) => {
    permissionsTouchedRef.current = true
    selectedRef.current = next
  }

  return (
    <Modal
      key={String(open)}
      open={open}
      title={t(resolveRoleWizardTitleKey(cloning, Boolean(role)))}
      width={1280}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      mask={{ closable: false }}
    >
      <Steps
        size="small"
        current={current}
        items={[
          { title: t('system.role.wizardStepBasic') },
          { title: t('system.role.wizardStepPermissions') },
        ]}
      />
      <div style={{ marginTop: 16, minHeight: 320 }}>
        <div hidden={current !== 0}>
          <Form form={form} layout="vertical" initialValues={initialValues}>
            <Form.Item
              name="code"
              label={t('system.role.code')}
              tooltip={
                builtin ? t('system.role.builtinCodeReadonly') : undefined
              }
              rules={[
                { required: true, whitespace: true },
                { max: 64 },
                { pattern: /^[a-zA-Z0-9_-]+$/ },
              ]}
            >
              <Input
                maxLength={64}
                disabled={builtin}
                placeholder={t('system.role.codePlaceholder')}
              />
            </Form.Item>
            <Form.Item
              name="name"
              label={t('system.role.name')}
              rules={[{ required: true, whitespace: true }, { max: 64 }]}
            >
              <Input
                maxLength={64}
                placeholder={t('system.role.namePlaceholder')}
              />
            </Form.Item>
            <Form.Item
              name="description"
              label={t('system.role.descriptionLabel')}
              rules={[{ max: 255 }]}
            >
              <Input.TextArea
                maxLength={255}
                rows={3}
                placeholder={t('system.role.descriptionPlaceholder')}
              />
            </Form.Item>
          </Form>
        </div>
        <div hidden={current !== 1}>
          <RoleWizardPermissionsStep
            sourceId={sourceId}
            permissions={roleQuery.data?.permissions}
            wildcard={wildcard}
            onSelectedChange={handlePermissionsChange}
          />
        </div>
      </div>
      <WizardFooterActions
        current={current}
        saving={saving}
        previousLabel={t('system.role.wizardPrevious')}
        nextLabel={t('system.role.wizardNext')}
        onPrevious={() => setCurrent(0)}
        onNext={() => {
          void goNext()
        }}
        onSubmit={() => {
          void submit()
        }}
        onClose={onClose}
      />
    </Modal>
  )
}

/**
 * 权限步骤：模板选择 + 业务域矩阵编辑器。
 *
 * <p>替换了原先的 `RolePermissionPicker`（52 个折叠分组、按英文字母序、只显示 `0/5` 计数，
 * 用户找不到「销售订单」也看不出勾的是哪些动作）。现在的编辑器按 8 个业务域导航、
 * 以「资源 × 动作」矩阵呈现，并支持一键套用角色模板后自由微调。</p>
 *
 * <p>来源角色的权限还没加载完时先占位，避免用空权限渲染出「这个角色没有任何权限」的假象 ——
 * 对编辑/克隆场景尤其危险，用户可能直接保存把原权限覆盖成空。</p>
 */
function RoleWizardPermissionsStep({
  sourceId,
  permissions,
  wildcard,
  onSelectedChange,
}: {
  sourceId: string
  permissions: string[] | undefined
  wildcard: boolean
  onSelectedChange: (permissions: string[]) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[] | null>(null)
  /** 套用模板前先算出「会增加多少项」，让用户知道影响面再决定。 */
  const [pendingTemplate, setPendingTemplate] = useState<string | null>(null)

  const catalogQuery = useQuery({
    queryKey: QUERY_KEYS.permissions,
    queryFn: ({ signal }) => listPermissions(signal),
  })

  const loadedPermissions = permissions ?? []
  // 受控值以首次加载到的来源权限为初值；之后完全由用户交互驱动。
  const effectiveSelected = selected ?? loadedPermissions

  const handleChange = (next: string[]) => {
    setSelected(next)
    onSelectedChange(next)
  }

  const handleApplyTemplate = (templateCode: string) => {
    const template = PERMISSION_TEMPLATES.find(
      (item) => item.code === templateCode,
    )
    if (!template) return
    const diff = diffTemplate(template, effectiveSelected)
    const merged = applyTemplate(template, effectiveSelected)
    setPendingTemplate(null)
    handleChange(merged)
    // 套用是并集语义：只会增加，不会移除任何已选权限。
    void message.success(
      t('system.role.templateApplied', {
        added: diff.added.length,
        retained: diff.retained.length,
      }),
    )
  }

  // 编辑/克隆时来源权限未就绪：占位，避免空权限被误保存
  if (sourceId && permissions === undefined) {
    return <Skeleton active paragraph={{ rows: 8 }} />
  }

  return (
    <div className="role-wizard-permissions">
      <TemplatePicker
        templates={PERMISSION_TEMPLATES}
        activeCode={pendingTemplate}
        matchedCode={matchTemplate(effectiveSelected).template?.code ?? null}
        disabled={wildcard}
        onPick={(code) =>
          setPendingTemplate((current) => (current === code ? null : code))
        }
      />
      {pendingTemplate ? (
        <PendingTemplateNotice
          templateCode={pendingTemplate}
          currentSelected={effectiveSelected}
          onCancel={() => setPendingTemplate(null)}
          onConfirm={handleApplyTemplate}
        />
      ) : null}
      <RolePermissionMatrixEditor
        permissions={catalogQuery.data ?? []}
        selected={effectiveSelected}
        onChange={handleChange}
        loading={catalogQuery.isLoading}
        wildcard={wildcard}
      />
    </div>
  )
}

/**
 * 角色模板选择条。
 *
 * <p>模板只是「起点」：套用后仍可在下方矩阵里自由增删。当前选择恰好等于某个模板时
 * 该模板显示为选中态（用 Jaccard 相似度识别，容忍少量自定义差异）。</p>
 */
function TemplatePicker({
  templates,
  activeCode,
  matchedCode,
  disabled,
  onPick,
}: {
  templates: readonly PermissionTemplate[]
  activeCode: string | null
  matchedCode: string | null
  disabled: boolean
  onPick: (code: string) => void
}) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN'
  const isEnglish = language.startsWith('en')

  return (
    <section aria-label={t('system.role.templateSection')}>
      <div className="role-template-picker">
        {templates.map((template) => {
          const active = activeCode === template.code
          const matched = matchedCode === template.code
          return (
            <button
              key={template.code}
              type="button"
              aria-pressed={active || matched}
              disabled={disabled}
              onClick={() => onPick(template.code)}
              className={
                active || matched
                  ? 'role-template-chip role-template-chip--active'
                  : 'role-template-chip'
              }
              title={
                isEnglish ? template.descriptionEn : template.descriptionZh
              }
            >
              <span className="role-template-chip__name">
                {isEnglish ? template.nameEn : template.nameZh}
              </span>
              <Tag color={template.color} className="role-template-chip__count">
                {template.permissions.length}
              </Tag>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/**
 * 套用模板前的影响面提示。
 *
 * <p>套用是**并集**：只增加、不删除。把「会增加多少项、还会保留多少自定义项」先算出来给用户看，
 * 避免他以为会覆盖掉已配好的权限。</p>
 */
function PendingTemplateNotice({
  templateCode,
  currentSelected,
  onCancel,
  onConfirm,
}: {
  templateCode: string
  currentSelected: readonly string[]
  onCancel: () => void
  onConfirm: (code: string) => void
}) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN'
  const isEnglish = language.startsWith('en')
  const template = PERMISSION_TEMPLATES.find(
    (item) => item.code === templateCode,
  )
  if (!template) return null
  const diff = diffTemplate(template, currentSelected)

  return (
    <Alert
      type="info"
      showIcon
      className="role-template-notice"
      title={t('system.role.templateNoticeTitle', {
        name: isEnglish ? template.nameEn : template.nameZh,
      })}
      description={
        <div>
          <div>
            {t('system.role.templateNoticeDiff', {
              added: diff.added.length,
              retained: diff.retained.length,
            })}
          </div>
          {template.dataScopeNoteZh ? (
            <div className="role-template-notice__note">
              {isEnglish ? template.dataScopeNoteEn : template.dataScopeNoteZh}
            </div>
          ) : null}
        </div>
      }
      action={
        <div className="role-template-notice__actions">
          <Button
            size="small"
            type="primary"
            onClick={() => onConfirm(template.code)}
          >
            {t('system.role.templateApply')}
          </Button>
          <Button size="small" onClick={onCancel}>
            {t('system.role.templateCancel')}
          </Button>
        </div>
      }
    />
  )
}

/** 向导页脚：上一步 / 下一步 / 保存 / 取消。 */
