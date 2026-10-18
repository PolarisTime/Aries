import type { ModalFuncProps } from 'antd'
import { modal } from '@/utils/antd-app'

/**
 * 危险操作二次确认的唯一入口。
 *
 * <p><b>为什么必须有这个出口</b>：仓库里散落着二十多处 `modal.confirm({...})`，
 * 每处各自决定「默认焦点落在哪个按钮」。antd 的默认行为是把初始焦点放在
 * **确认按钮**上，于是「删除 / 放弃修改 / 注销」这类不可逆操作变成：
 * 弹出确认框 → 用户手还在回车键上 → 直接执行。审查实测两处真实事故：
 * 批量删除焦点在「确定」、放弃修改焦点在「放弃修改」。</p>
 *
 * <p>因此本函数强制两件事，调用点不需要（也不应该）再各自判断：</p>
 * <ol>
 *   <li>`autoFocusButton: 'cancel'` —— 默认焦点在「取消」，回车安全；</li>
 *   <li>`okButtonProps.danger: true` —— 确认按钮用危险语义色，视觉上就区分开。</li>
 * </ol>
 *
 * <p><b>文案按实际条数给</b>：单条删除与批量删除共用同一句「删除选中的 N 条」会让
 * 单条操作读起来像批量（用户会怀疑自己是不是误选了更多）。调用方通过
 * {@link confirmDanger} 的 `title`/`content` 传入已按条数生成的文案，
 * 本函数不替调用方猜。</p>
 *
 * <p>用法：</p>
 * <pre>{@code
 * confirmDanger({
 *   title: t('common.deleteConfirmTitle'),
 *   content: t('common.deleteConfirmContent', { count }),
 *   okText: t('common.delete'),
 *   onOk: () => doDelete(),
 * })
 * }</pre>
 *
 * 非破坏性确认（例如「保存并审核」这种可逆性尚有争议的）不要走本函数，
 * 直接用 `modal.confirm`，避免把「危险」语义泛化到所有弹框。
 */
export interface ConfirmDangerOptions
  extends Omit<ModalFuncProps, 'autoFocusButton' | 'okButtonProps' | 'okType'> {
  /** 是否强调危险色（默认 true）。个别"仅提示"场景可关掉。 */
  danger?: boolean
}

export function confirmDanger(options: ConfirmDangerOptions): void {
  const { danger = true, ...rest } = options
  modal.confirm({
    cancelText: rest.cancelText,
    ...rest,
    /*
     * 显式放在展开之后：即使调用方传了 autoFocusButton 也不能覆盖成确认侧，
     * 否则本出口的"默认安全"保证就漏了。
     */
    autoFocusButton: 'cancel',
    okButtonProps: danger ? { danger: true } : undefined,
  } as ModalFuncProps)
}
