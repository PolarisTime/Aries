/**
 * 在 cleanup 一定执行的前提下运行任务，语义等同 `try { task() } finally { cleanup() }`。
 *
 * <p>为什么需要它：React Compiler 目前不支持带 `finally` 的 TryStatement
 * （react-doctor 报 `react-hooks-js/todo`），命中后**整个组件/自定义 Hook 会失去自动记忆化**。
 * 把 `finally` 挪到组件之外的普通函数里，既保留「无论成功、失败还是提前 return 都收尾」的语义，
 * 又让编译器可以正常分析组件。</p>
 *
 * <p>与「把清理语句直接挪到 try/catch 之后」的区别：那种写法在 try 体内存在 `return` 时会漏执行清理，
 * 所以只有确认无提前返回的简单场景才用直接挪动；有提前返回时一律用本函数。</p>
 */
export async function withFinally<T>(
  task: () => T | Promise<T>,
  cleanup: () => void,
): Promise<T> {
  try {
    return await task()
  } finally {
    cleanup()
  }
}
