<script setup lang="ts">
import type {
  PrintTemplateSnippet,
  PrintTemplateTokenGroup,
} from '@/utils/print-template-designer'

interface Props {
  tokenGroups: PrintTemplateTokenGroup[]
  snippets: PrintTemplateSnippet[]
}

defineProps<Props>()

const emit = defineEmits<{
  insert: [content: string]
}>()
</script>

<template>
  <aside class="print-template-sidebar">
    <div class="print-template-sidebar-stack">
      <a-card
        :bordered="false"
        class="module-panel-card print-template-sidebar-card"
      >
        <template #title>
          <div class="sidebar-title">
            <div>
              <div class="sidebar-title-main">变量与语法</div>
              <div class="sidebar-title-sub">点击即可插入当前编辑器</div>
            </div>
            <a-tag color="processing">快捷插入</a-tag>
          </div>
        </template>

        <div class="sidebar-card-body">
          <div
            v-for="group in tokenGroups"
            :key="group.key"
            class="sidebar-section"
          >
            <div class="sidebar-section-head">
              <div class="sidebar-section-title">{{ group.label }}</div>
              <div class="sidebar-section-desc">{{ group.description }}</div>
            </div>
            <div class="token-list">
              <button
                v-for="item in group.tokens"
                :key="`${group.key}-${item.key}`"
                type="button"
                class="token-chip"
                @click="emit('insert', item.token)"
              >
                <span class="token-chip-text">{{ item.token }}</span>
                <span class="token-chip-label">{{ item.label }}</span>
              </button>
            </div>
          </div>
        </div>
      </a-card>

      <a-card
        :bordered="false"
        class="module-panel-card print-template-sidebar-card"
      >
        <template #title>
          <div class="sidebar-title">
            <div>
              <div class="sidebar-title-main">模板片段</div>
              <div class="sidebar-title-sub">
                常用条件块和循环结构，减少手写出错
              </div>
            </div>
            <a-tag color="blue">结构片段</a-tag>
          </div>
        </template>

        <div class="sidebar-card-body">
          <div class="snippet-list">
            <div
              v-for="snippet in snippets"
              :key="snippet.key"
              class="snippet-card"
            >
              <div class="snippet-card-head">
                <div>
                  <div class="snippet-title">{{ snippet.label }}</div>
                  <div class="snippet-desc">{{ snippet.description }}</div>
                </div>
                <a-button
                  size="small"
                  @click="emit('insert', snippet.content)"
                >
                  插入
                </a-button>
              </div>
              <pre class="snippet-code">{{ snippet.content }}</pre>
            </div>
          </div>
        </div>
      </a-card>
    </div>
  </aside>
</template>

<style scoped>
.print-template-sidebar {
  position: relative;
  width: 100%;
  min-width: 0;
}

.print-template-sidebar-stack {
  position: sticky;
  top: 102px;
  display: grid;
  gap: 16px;
  max-height: calc(100vh - 118px);
}

.print-template-sidebar-card {
  min-height: 0;
}

:deep(.print-template-sidebar-card > .ant-card-body) {
  overflow-y: auto;
}

.sidebar-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sidebar-title > div {
  min-width: 0;
}

.sidebar-title-main {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.sidebar-title-sub {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.sidebar-card-body {
  display: grid;
  gap: 20px;
}

.sidebar-section + .sidebar-section {
  margin-top: 20px;
}

.sidebar-section-head {
  margin-bottom: 12px;
}

.sidebar-section-title {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.sidebar-section-desc {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.token-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.token-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  max-width: 100%;
  padding: 10px 12px;
  border: 1px solid #dbe4ee;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.token-chip:hover {
  border-color: #1677ff;
  background: #eff6ff;
}

.token-chip-text {
  color: #0f172a;
  font-family:
    'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}

.token-chip-label {
  color: #64748b;
  font-size: 12px;
}

.snippet-list {
  display: grid;
  gap: 12px;
}

.snippet-card {
  padding: 12px;
  border: 1px solid #dbe4ee;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.snippet-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.snippet-card-head > div:first-child {
  min-width: 0;
}

.snippet-title {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.snippet-desc {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.snippet-code {
  min-height: 96px;
  margin: 16px 0 0;
  padding: 14px 16px;
  border: 1px solid #dbe4ee;
  border-radius: 14px;
  background: #f8fafc;
  overflow: auto;
  color: #0f172a;
  font-family:
    'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1600px) {
  .print-template-sidebar {
    grid-column: 1 / -1;
  }

  .print-template-sidebar-stack {
    position: static;
    max-height: none;
  }
}

@media (max-width: 1280px) {
  .print-template-sidebar {
    position: static;
    max-height: none;
    overflow: visible;
  }

  .print-template-sidebar-stack {
    position: static;
    max-height: none;
  }
}
</style>
