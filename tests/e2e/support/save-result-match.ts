/**
 * 保存回执文案的共享匹配口径。
 *
 * <p>回执标题按「本次动作 + 结果状态」渲染——`已保存为草稿` / `已保存并审核` /
 * `已保存并确认` / `已核定并完成销售`——不再存在一句固定的「保存成功」。
 * 判定集中在这里，避免文案再调整时散落在各处的写死断言集体过期
 * （回执按动作区分文案后，依赖 harness 的链路用例就因此红过）。</p>
 *
 * <p>注意不要匹配到失败回执：`保存失败` / `数据已被其他操作更新` 都不含下列词。</p>
 */
export const SAVE_RESULT_SUCCESS_PATTERN = /已保存|已核定|保存成功/

export function isSaveResultSuccess(panelText: string): boolean {
  return SAVE_RESULT_SUCCESS_PATTERN.test(panelText)
}
