import type { CollabPeer } from './collab-presence'
import './collab.css'

/**
 * 单元格上的远端光标：彩色描边 + 用户名小标签（设计文档 §9.3）。
 *
 * <p>只画在**别人正停留的格子**上，自己的光标用浏览器原生焦点表达。同一格可能同时有几个人，
 * 描边叠在一起没有意义，所以描边只画第一位的颜色，其余的人名标签向上错行排开。</p>
 *
 * <p>覆盖层是 `aria-hidden`：在线名单已经用可访问文本说明了"谁在线"，
 * 这里再让读屏念一遍人名只是噪声（描边本身也不是必须感知的信息）。</p>
 */
export function CollabCellCursors({
  cursors,
}: {
  cursors: readonly CollabPeer[]
}) {
  if (cursors.length === 0) return null
  const [first] = cursors
  return (
    <span aria-hidden="true" className="collab-cell-cursors">
      <span
        className="collab-cell-cursor"
        style={{ borderColor: first?.user.color }}
      />
      {cursors.map((peer, index) => (
        <span
          className="collab-cell-cursor-name"
          key={`${peer.listId}:${peer.clientId}`}
          style={{
            backgroundColor: peer.user.color,
            // 第一个人名贴描边上沿，其余向上错 16px 一行，避免互相盖住
            top: `${-18 - index * 16}px`,
          }}
        >
          {peer.user.name}
        </span>
      ))}
    </span>
  )
}
