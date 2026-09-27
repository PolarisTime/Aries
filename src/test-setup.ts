// 全局测试初始化: 提前初始化 i18n 并固定为 zh-CN, 使模块顶层调用 i18next.t() 的
// 注册表(page-registry / navigation-registry 等)能得到中文标题而非 undefined/英文。
// 需要英文的用例可自行 changeLanguage('en-US') 覆盖。
import i18next from 'i18next'
import { afterEach, beforeAll } from 'vitest'
import '@/i18n'

void i18next.changeLanguage('zh-CN')

/** 排空 React scheduler 的宏任务队列: 仅 await 微任务不足以排空 setImmediate。 */
async function flushMacrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  const scheduleImmediate = (
    globalThis as { setImmediate?: (callback: () => void) => unknown }
  ).setImmediate
  if (typeof scheduleImmediate === 'function') {
    await new Promise<void>((resolve) => {
      scheduleImmediate(() => resolve())
    })
  }
}

/**
 * antd 的静态弹层(message/notification/Modal)会在 document.body 上自建 React 根,
 * 卸载被测组件带不走它们。这些根上的 appear/leave 动画与「自动关闭」定时器会持续
 * 产生 React 状态更新; 一旦更新在 jsdom 环境销毁之后才被调度, React 会在调度任务
 * 入口读取 `window.event` 并抛 "ReferenceError: window is not defined" —— 断言虽然
 * 全过, 但测试进程 exit≠0(CI 判红), 且报错会归因到当时正在运行的另一个文件。
 *
 * 这里不去销毁它们(销毁本身也会触发一轮新的状态更新, 反而制造更多残留), 而是让它们
 * 根本不产生后续任务: 关掉动效 + 取消自动关闭定时器; 再在每条用例后冲刷调度队列,
 * 把用例期间排队的更新在 jsdom 存活时执行完。
 * 只对 jsdom 环境生效(node 环境无 document, 直接跳过), 且全部尽力处理: 个别用例会
 * mock antd, 清理失败不得影响用例结果。
 */
beforeAll(async () => {
  if (typeof document === 'undefined') return
  try {
    const { ConfigProvider, message, notification } = await import('antd')
    ConfigProvider.config({ theme: { token: { motion: false } } })
    message.config({ duration: 0 })
    notification.config({ duration: 0 })
  } catch {
    // mock 了 antd 的用例没有这些导出, 忽略
  }
})

afterEach(async () => {
  if (typeof document === 'undefined') return
  await flushMacrotasks()
})
