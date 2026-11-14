import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { type CollabPeer, uniquePeerUsers } from './collab-presence'
import {
  type CollabConnectionState,
  type CollabStatusTone,
  collabOnlineLabelKey,
  collabStatusLabelKey,
  collabStatusTone,
} from './collab-status'
import './collab.css'

/**
 * antd Tag 的语义色：与 {@link CollabStatusTone} 一一对应。
 *
 * <p>用 Tag 而不是 Badge：Badge 的圆点太轻，无法承载「离线，改动将在重连后同步」这类
 * 必须被读到的文字；Tag 同时有底色与文字，满足 WCAG 1.4.1（不只用颜色传递信息）。</p>
 */
const TONE_COLOR: Record<CollabStatusTone, string> = {
  default: 'default',
  processing: 'processing',
  success: 'success',
  warning: 'warning',
  error: 'error',
}

/**
 * 协作状态徽标 + 在线名单（设计文档 §9.3）。
 *
 * <p>`role="status"` + `aria-live="polite"`：连接状态变化（连接中 → 已连接 → 离线）是
 * 异步发生的，读屏用户需要被动获知，不能只靠看见颜色变了。</p>
 *
 * <p>状态为 `disabled`（功能没开）时整条不渲染 —— 与改动前完全一致，不留空行。</p>
 */
export function CollabStatusBar({
  state,
  writable,
  peers,
}: {
  state: CollabConnectionState
  writable: boolean
  peers: readonly CollabPeer[]
}) {
  const { t } = useTranslation()
  if (state === 'disabled') return null

  const users = uniquePeerUsers(peers)
  const onlineLabel = t(collabOnlineLabelKey(users.length), {
    count: users.length + 1,
  })

  return (
    <div className="collab-status" role="status" aria-live="polite">
      <Tag
        className="collab-status__badge"
        color={TONE_COLOR[collabStatusTone(state, writable)]}
      >
        {t(collabStatusLabelKey(state, writable))}
      </Tag>
      <span className="collab-status__online">{onlineLabel}</span>
      {users.length ? (
        <span className="collab-status__peers">
          {users.map((user) => (
            <span
              className="collab-status__peer"
              key={user.id}
              style={{ borderColor: user.color }}
              title={user.name}
            >
              {user.name}
            </span>
          ))}
        </span>
      ) : null}
    </div>
  )
}
