import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import SetupTwoFactorView from '@/views/auth/SetupTwoFactorView.vue'
import { useAuthStore } from '@/stores/auth'

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  route: {
    query: {
      redirect: '/purchase-orders',
    },
  },
}))

const accountSecurityMocks = vi.hoisted(() => ({
  changeOwnPassword: vi.fn(),
  enableOwn2fa: vi.fn(),
  setupOwn2fa: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: routerMocks.replace,
  }),
  useRoute: () => routerMocks.route,
}))

vi.mock('@/api/account-security', () => ({
  changeOwnPassword: accountSecurityMocks.changeOwnPassword,
  enableOwn2fa: accountSecurityMocks.enableOwn2fa,
  setupOwn2fa: accountSecurityMocks.setupOwn2fa,
}))

vi.mock('@/api/client', () => ({
  isHandledRequestError: () => false,
}))

vi.mock('@/api/auth', () => ({
  logout: vi.fn(),
}))

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function findButtonsByType(wrapper: ReturnType<typeof mount>, type: string) {
  return wrapper.findAllComponents({ name: 'AButton' }).filter((component) => component.props('type') === type)
}

async function setInputValue(wrapper: ReturnType<typeof mount>, placeholder: string, value: string) {
  const input = wrapper
    .findAllComponents({ name: 'AInput' })
    .find((component) => component.props('placeholder') === placeholder)
  expect(input).toBeDefined()
  input!.vm.$emit('update:value', value)
  await flushPromises()
}

describe('SetupTwoFactorView', () => {
  beforeEach(() => {
    localStorage.clear()
    ;(i18n.global.locale as unknown as { value: string }).value = 'zh-CN'
    routerMocks.replace.mockReset()
    routerMocks.route.query.redirect = '/purchase-orders'
    accountSecurityMocks.changeOwnPassword.mockReset()
    accountSecurityMocks.enableOwn2fa.mockReset()
    accountSecurityMocks.setupOwn2fa.mockReset()
  })

  it('completes forced 2fa setup and redirects back to the original page', async () => {
    accountSecurityMocks.setupOwn2fa.mockResolvedValue({
      code: 0,
      message: '密钥生成成功',
      data: {
        qrCodeBase64: 'ZmFrZQ==',
        secret: 'SECRET123',
      },
    })
    accountSecurityMocks.enableOwn2fa.mockResolvedValue({
      code: 0,
      message: '2FA 已启用',
      data: {
        id: 1,
        loginName: 'leo',
        userName: 'Leo',
        totpEnabled: true,
        forceTotpSetup: false,
      },
    })

    const pinia = createPinia()
    setActivePinia(pinia)
    const authStore = useAuthStore()
    authStore.user = {
      id: 1,
      loginName: 'leo',
      userName: 'Leo',
      totpEnabled: false,
      forceTotpSetup: true,
    }

    const wrapper = mount(SetupTwoFactorView, {
      global: {
        plugins: [Antd, pinia, i18n],
      },
    })

    const setupButton = findButtonsByType(wrapper, 'primary').at(0)
    expect(setupButton).toBeDefined()
    setupButton!.vm.$emit('click')
    await flushPromises()

    await setInputValue(wrapper, '输入认证器中的 6 位验证码', '123456')

    const submitButton = findButtonsByType(wrapper, 'primary').at(-1)
    expect(submitButton).toBeDefined()
    submitButton!.vm.$emit('click')
    await flushPromises()

    expect(accountSecurityMocks.setupOwn2fa).toHaveBeenCalledTimes(1)
    expect(accountSecurityMocks.enableOwn2fa).toHaveBeenCalledWith('123456')
    expect(authStore.user?.totpEnabled).toBe(true)
    expect(authStore.user?.forceTotpSetup).toBe(false)
    expect(routerMocks.replace).toHaveBeenCalledWith('/purchase-orders')
  })
})
