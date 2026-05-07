<script setup lang="ts">
interface Props {
  previewTab: 'preview' | 'data'
  templateKind: string
  previewDocument: string
  previewSource: string
  previewSampleJson: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:previewTab': [value: 'preview' | 'data']
}>()
</script>

<template>
  <section class="workspace-panel">
    <div class="workspace-panel-head">
      <div>
        <div class="workspace-panel-title">实时预览</div>
        <div class="workspace-panel-subtitle">
          基于当前页面的样例数据即时渲染
        </div>
      </div>
      <a-radio-group
        :value="previewTab"
        size="small"
        @update:value="emit('update:previewTab', $event)"
      >
        <a-radio-button value="preview">预览</a-radio-button>
        <a-radio-button value="data">样例数据</a-radio-button>
      </a-radio-group>
    </div>

    <div v-if="previewTab === 'preview'" class="preview-shell">
      <a-alert
        v-if="templateKind === 'LODOP 指令'"
        type="info"
        show-icon
        message="LODOP 指令模板无法在浏览器中直接还原版式，下面展示的是变量替换后的代码。"
      />
      <iframe
        v-if="templateKind === 'HTML 模板'"
        class="preview-frame"
        sandbox=""
        referrerpolicy="no-referrer"
        :srcdoc="previewDocument"
        title="打印模板预览"
      />
      <pre v-else class="preview-code">{{ previewSource }}</pre>
    </div>

    <pre v-else class="preview-data">{{ previewSampleJson }}</pre>
  </section>
</template>

<style scoped>
.workspace-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.workspace-panel-head > div:first-child {
  min-width: 0;
}

.workspace-panel-title {
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.workspace-panel-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.preview-shell {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.preview-frame,
.preview-code,
.preview-data {
  width: 100%;
  border: 1px solid #dbe4ee;
  border-radius: 14px;
  background: #f8fafc;
}

.preview-frame {
  min-height: 660px;
}

.preview-code,
.preview-data {
  margin: 16px 0 0;
  padding: 14px 16px;
  overflow: auto;
  color: #0f172a;
  font-family:
    'JetBrains Mono', 'Fira Code', 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-data {
  min-height: 660px;
  margin-top: 16px;
}
</style>
