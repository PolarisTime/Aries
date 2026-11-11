import i18next from 'i18next'
import { notification } from '@/utils/antd-app'

/** 卡片里最多列出的失败行数（其余用「另有 N 条」收口）。 */
export const BATCH_FAILURE_LINES = 5

export interface BatchFailure {
  /** 失败目标的单据号 / 编码（用户据此定位是哪一条）。 */
  no: string
  /** 失败原因原文（接口 message 或本地兜底文案）。 */
  reason: string
}

/**
 * 批量操作「有失败」时的结果提示：**卡片式通知 + 逐条失败清单**。
 *
 * <p>为什么这批提示必须是卡片而不是 toast：</p>
 * <ul>
 *   <li>批量结果天生多行 —— 哪几条失败、各自什么原因。toast 只能塞一句"首条错误"，
 *       其余失败原因直接丢失，用户只能一条条重试去猜；</li>
 *   <li>用户要照着清单逐条处理，提示就得能停留、能手动关 —— toast 3 秒自动消失。</li>
 * </ul>
 *
 * <p>成功路径仍然走 toast（`message.success`）：那是"点完即走"的回执，不需要读完。
 * 两个失败出口（业务单据批量审核/删除、主数据批量删除）共用本函数，避免各写一份清单渲染。</p>
 */
export function showBatchFailureNotification(options: {
  /** 标题：只放统计（成功 N 条 / 失败 M 条），明细交给正文。 */
  title: string
  failures: readonly BatchFailure[]
  /** 停留秒数，缺省 8 秒（比 toast 长，够读完 5 行原因）。 */
  duration?: number
}): void {
  const { failures, title, duration = 8 } = options
  notification.warning({
    message: title,
    duration,
    description: (
      <div
        style={{ display: 'grid', gap: 4, maxHeight: 220, overflowY: 'auto' }}
      >
        {failures.slice(0, BATCH_FAILURE_LINES).map((failure) => (
          <div key={`${failure.no}-${failure.reason}`}>
            {failure.no}：{failure.reason}
          </div>
        ))}
        {failures.length > BATCH_FAILURE_LINES ? (
          <div>
            {i18next.t('hooks.batchActions.failureMore', {
              count: failures.length - BATCH_FAILURE_LINES,
            })}
          </div>
        ) : null}
      </div>
    ),
  })
}
