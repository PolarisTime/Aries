import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { usePermissionStore } from '@/stores/permission'
import UserAccountManagementView from '@/views/system/UserAccountManagementView.vue'

const userAccountApiMocks = vi.hoisted(() => ({
  checkUserAccountLoginName: vi.fn(),
  createUserAccount: vi.fn(),
  deleteUserAccount: vi.fn(),
  disableUserAccount2fa: vi.fn(),
  enableUserAccount2fa: vi.fn(),
  getUserAccountDetail: vi.fn(),
  listDepartmentOptions: vi.fn(),
  listRoleOptions: vi.fn(),
  listUserAccounts: vi.fn(),
  setupUserAccount2fa: vi.fn(),
  updateUserAccount: vi.fn(),
}))

const browserMocks = vi.hoisted(() => ({
  writeText: vi.fn(),
}))

vi.mock('@/api/user-accounts', () => ({
  checkUserAccountLoginName: userAccountApiMocks.checkUserAccountLoginName,
  createUserAccount: userAccountApiMocks.createUserAccount,
  deleteUserAccount: userAccountApiMocks.deleteUserAccount,
  disableUserAccount2fa: userAccountApiMocks.disableUserAccount2fa,
  enableUserAccount2fa: userAccountApiMocks.enableUserAccount2fa,
  getUserAccountDetail: userAccountApiMocks.getUserAccountDetail,
  listDepartmentOptions: userAccountApiMocks.listDepartmentOptions,
  listRoleOptions: userAccountApiMocks.listRoleOptions,
  listUserAccounts: userAccountApiMocks.listUserAccounts,
  setupUserAccount2fa: userAccountApiMocks.setupUserAccount2fa,
  updateUserAccount: userAccountApiMocks.updateUserAccount,
}))

vi.mock('@/api/client', () => ({
  isHandledRequestError: () => false,
}))

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function getNormalizedText(value: string) {
  return value.replace(/\s+/g, '')
}

function mountWithPermissions() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  const permissionStore = usePermissionStore()
  authStore.user = {
    id: 1,
    loginName: 'admin',
    userName: 'Admin',
    totpEnabled: false,
  }
  permissionStore.setPermissions([
    { resource: 'user-account', actions: ['read', 'create', 'update', 'delete'] },
    { resource: 'role', actions: ['read'] },
    { resource: 'department', actions: ['read'] },
  ])

  const wrapper = mount(UserAccountManagementView, {
    attachTo: document.body,
    global: {
      plugins: [Antd, pinia, i18n],
    },
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

const mountedWrappers: VueWrapper[] = []

async function setInputValue(wrapper: VueWrapper, placeholder: string, value: string) {
  const component = [
    ...wrapper.findAllComponents({ name: 'AInput' }),
    ...wrapper.findAllComponents({ name: 'AInputPassword' }),
  ].find((item) => item.props('placeholder') === placeholder)

  if (!component) {
    throw new Error(`missing input: ${placeholder}`)
  }

  component.vm.$emit('update:value', value)
  await flushPromises()
}

async function selectDepartment(wrapper: VueWrapper, value: string | number) {
  const departmentSelect = wrapper
    .findAllComponents({ name: 'ASelect' })
    .find((component) => component.props('placeholder') === '请选择部门')
  expect(departmentSelect).toBeDefined()
  departmentSelect!.vm.$emit('update:value', value)
  await flushPromises()
}

describe('UserAccountManagementView', () => {
  beforeEach(() => {
    userAccountApiMocks.checkUserAccountLoginName.mockReset()
    userAccountApiMocks.createUserAccount.mockReset()
    userAccountApiMocks.deleteUserAccount.mockReset()
    userAccountApiMocks.disableUserAccount2fa.mockReset()
    userAccountApiMocks.enableUserAccount2fa.mockReset()
    userAccountApiMocks.getUserAccountDetail.mockReset()
    userAccountApiMocks.listDepartmentOptions.mockReset()
    userAccountApiMocks.listRoleOptions.mockReset()
    userAccountApiMocks.listUserAccounts.mockReset()
    userAccountApiMocks.setupUserAccount2fa.mockReset()
    userAccountApiMocks.updateUserAccount.mockReset()

    userAccountApiMocks.listUserAccounts.mockResolvedValue({
      records: [],
      totalElements: 0,
    })
    userAccountApiMocks.checkUserAccountLoginName.mockResolvedValue({
      available: true,
      message: null,
    })
    userAccountApiMocks.listRoleOptions.mockResolvedValue([
      {
        id: '1',
        roleCode: 'PURCHASER',
        roleName: '采购专员',
        roleType: '业务',
        dataScope: '全部',
        permissionSummary: '采购订单-查看',
        status: '正常',
      },
    ])
    userAccountApiMocks.listDepartmentOptions.mockResolvedValue([
      {
        id: '10',
        departmentCode: 'HQ',
        departmentName: '总部',
      },
    ])
    userAccountApiMocks.createUserAccount.mockResolvedValue({
      code: 0,
      message: '创建成功',
      data: {
        user: {
          id: '1',
          loginName: 'tester',
          userName: '测试用户',
          mobile: '13800000000',
          departmentId: '10',
          departmentName: '总部',
          roleNames: ['采购专员'],
          dataScope: '全部',
          permissionSummary: '采购订单-查看',
          lastLoginDate: null,
          status: '正常',
          remark: '',
          totpEnabled: false,
        },
        initialPassword: 'Ab12Cd34',
      },
    })
    browserMocks.writeText.mockReset()
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: browserMocks.writeText,
      },
    })
  })

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
  })

  it('shows initial password field in create modal', async () => {
    const wrapper = mountWithPermissions()
    await flushPromises()

    const createButton = wrapper.findAll('button').find((button) => getNormalizedText(button.text()) === '新增')
    expect(createButton).toBeDefined()

    await createButton!.trigger('click')
    await flushPromises()

    expect(getNormalizedText(document.body.textContent || '')).toContain('初始密码')
    expect(getNormalizedText(document.body.textContent || '')).toContain('留空时系统会自动生成8位随机数字大小写字母密码。')
  })

  it('submits the typed password when creating a user', async () => {
    const wrapper = mountWithPermissions()
    await flushPromises()

    const createButton = wrapper.findAll('button').find((button) => getNormalizedText(button.text()) === '新增')
    await createButton!.trigger('click')
    await flushPromises()

    await setInputValue(wrapper, '请输入登录账号', 'tester')
    await setInputValue(wrapper, '请输入初始密码', 'Init@123')
    await setInputValue(wrapper, '请输入用户姓名', '测试用户')
    await setInputValue(wrapper, '请输入手机号', '13800000000')
    await selectDepartment(wrapper, '10')

    const roleSelect = wrapper
      .findAllComponents({ name: 'ASelect' })
      .find((component) => component.props('placeholder') === '请选择角色')
    expect(roleSelect).toBeDefined()
    roleSelect!.vm.$emit('update:value', ['采购专员'])
    await flushPromises()

    const editorModal = wrapper
      .findAllComponents({ name: 'AModal' })
      .find((component) => component.props('title') === '新增用户账户')
    expect(editorModal).toBeDefined()

    const onOk = editorModal!.props('onOk') as (() => void | Promise<void>) | undefined
    expect(onOk).toBeDefined()
    await onOk?.()
    await flushPromises()

    expect(userAccountApiMocks.createUserAccount).toHaveBeenCalledWith({
      loginName: 'tester',
      password: 'Init@123',
      userName: '测试用户',
      mobile: '13800000000',
      departmentId: '10',
      roleNames: ['采购专员'],
      dataScope: '全部数据',
      permissionSummary: '采购订单-查看',
      status: '正常',
      remark: '',
    })
    expect(getNormalizedText(document.body.textContent || '')).toContain('用户创建成功')
    expect(getNormalizedText(document.body.textContent || '')).toContain('账号tester')
    expect(getNormalizedText(document.body.textContent || '')).toContain('初始密码Ab12Cd34')
    expect(getNormalizedText(document.body.textContent || '')).toContain('所属角色采购专员')
    expect(getNormalizedText(document.body.textContent || '')).toContain('复制账号')
    expect(getNormalizedText(document.body.textContent || '')).toContain('复制密码')
  })

  it('shows generated password when creating a user without typing one', async () => {
    const wrapper = mountWithPermissions()
    await flushPromises()

    const createButton = wrapper.findAll('button').find((button) => getNormalizedText(button.text()) === '新增')
    await createButton!.trigger('click')
    await flushPromises()

    await setInputValue(wrapper, '请输入登录账号', 'tester')
    await setInputValue(wrapper, '请输入用户姓名', '测试用户')
    await setInputValue(wrapper, '请输入手机号', '13800000000')
    await selectDepartment(wrapper, '10')

    const roleSelect = wrapper
      .findAllComponents({ name: 'ASelect' })
      .find((component) => component.props('placeholder') === '请选择角色')
    expect(roleSelect).toBeDefined()
    roleSelect!.vm.$emit('update:value', ['采购专员'])
    await flushPromises()

    const editorModal = wrapper
      .findAllComponents({ name: 'AModal' })
      .find((component) => component.props('title') === '新增用户账户')
    expect(editorModal).toBeDefined()

    const onOk = editorModal!.props('onOk') as (() => void | Promise<void>) | undefined
    expect(onOk).toBeDefined()
    await onOk?.()
    await flushPromises()

    expect(userAccountApiMocks.createUserAccount).toHaveBeenCalledWith({
      loginName: 'tester',
      userName: '测试用户',
      mobile: '13800000000',
      departmentId: '10',
      roleNames: ['采购专员'],
      dataScope: '全部数据',
      permissionSummary: '采购订单-查看',
      status: '正常',
      remark: '',
    })
    expect(getNormalizedText(document.body.textContent || '')).toContain('初始密码Ab12Cd34')
  })

  it('copies account and password from the create result modal', async () => {
    const wrapper = mountWithPermissions()
    await flushPromises()

    const createButton = wrapper.findAll('button').find((button) => getNormalizedText(button.text()) === '新增')
    await createButton!.trigger('click')
    await flushPromises()

    await setInputValue(wrapper, '请输入登录账号', 'tester')
    await setInputValue(wrapper, '请输入用户姓名', '测试用户')
    await setInputValue(wrapper, '请输入手机号', '13800000000')
    await selectDepartment(wrapper, '10')

    const roleSelect = wrapper
      .findAllComponents({ name: 'ASelect' })
      .find((component) => component.props('placeholder') === '请选择角色')
    expect(roleSelect).toBeDefined()
    roleSelect!.vm.$emit('update:value', ['采购专员'])
    await flushPromises()

    const editorModal = wrapper
      .findAllComponents({ name: 'AModal' })
      .find((component) => component.props('title') === '新增用户账户')
    expect(editorModal).toBeDefined()

    const onOk = editorModal!.props('onOk') as (() => void | Promise<void>) | undefined
    expect(onOk).toBeDefined()
    await onOk?.()
    await flushPromises()

    const copyAccountButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => getNormalizedText(button.textContent || '') === '复制账号',
    )
    const copyPasswordButton = Array.from(document.body.querySelectorAll('button')).find(
      (button) => getNormalizedText(button.textContent || '') === '复制密码',
    )

    expect(copyAccountButton).toBeDefined()
    expect(copyPasswordButton).toBeDefined()

    copyAccountButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()
    copyPasswordButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    expect(browserMocks.writeText).toHaveBeenNthCalledWith(1, 'tester')
    expect(browserMocks.writeText).toHaveBeenNthCalledWith(2, 'Ab12Cd34')
  })

  it('shows duplicate login name message and blocks submit', async () => {
    userAccountApiMocks.checkUserAccountLoginName.mockResolvedValue({
      available: false,
      message: '登录账号已存在',
    })

    const wrapper = mountWithPermissions()
    await flushPromises()

    const createButton = wrapper.findAll('button').find((button) => getNormalizedText(button.text()) === '新增')
    await createButton!.trigger('click')
    await flushPromises()

    await setInputValue(wrapper, '请输入登录账号', 'tester')
    await setInputValue(wrapper, '请输入用户姓名', '测试用户')
    await setInputValue(wrapper, '请输入手机号', '13800000000')
    await selectDepartment(wrapper, '10')

    const loginNameInput = wrapper
      .findAllComponents({ name: 'AInput' })
      .find((component) => component.props('placeholder') === '请输入登录账号')
    expect(loginNameInput).toBeDefined()
    loginNameInput!.vm.$emit('blur')
    await flushPromises()

    const roleSelect = wrapper
      .findAllComponents({ name: 'ASelect' })
      .find((component) => component.props('placeholder') === '请选择角色')
    expect(roleSelect).toBeDefined()
    roleSelect!.vm.$emit('update:value', ['采购专员'])
    await flushPromises()

    const editorModal = wrapper
      .findAllComponents({ name: 'AModal' })
      .find((component) => component.props('title') === '新增用户账户')
    expect(editorModal).toBeDefined()

    const onOk = editorModal!.props('onOk') as (() => void | Promise<void>) | undefined
    expect(onOk).toBeDefined()
    await onOk?.()
    await flushPromises()

    expect(userAccountApiMocks.checkUserAccountLoginName).toHaveBeenCalledWith('tester', undefined)
    expect(userAccountApiMocks.createUserAccount).not.toHaveBeenCalled()
    expect(getNormalizedText(document.body.textContent || '')).toContain('登录账号已存在')
  })
})
