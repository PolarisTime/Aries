<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import type { UploadProps } from 'ant-design-vue'
import { businessPageConfigs } from '@/config/business-pages'
import { printTemplateTargetMap, printTemplateTargetOptions } from '@/config/print-template-targets'
import {
  deletePrintTemplate,
  listPrintTemplates,
  savePrintTemplate,
} from '@/api/print-template'
import type { PrintTemplateRecord } from '@/types/print-template'

const selectedBillType = ref(printTemplateTargetOptions[0]?.value || 'purchase-orders')
const loading = ref(false)
const saving = ref(false)
const templateRows = ref<PrintTemplateRecord[]>([])
const editorForm = reactive({
  id: undefined as number | undefined,
  billType: selectedBillType.value,
  templateName: '',
  templateHtml: '',
  isDefault: true,
})

const activeConfig = computed(() => businessPageConfigs[selectedBillType.value])
const headerTokens = computed(() =>
  (activeConfig.value?.detailFields || []).map((field) => ({
    key: field.key,
    label: field.label,
    token: `{{${field.key}}}`,
  })),
)
const detailTokens = computed(() =>
  (activeConfig.value?.itemColumns || []).map((field) => ({
    key: field.dataIndex,
    label: field.title,
    token: `{{detail.${field.dataIndex}}}`,
  })),
)

watch(selectedBillType, () => {
  editorForm.billType = selectedBillType.value
  void loadTemplates()
})

onMounted(() => {
  void loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  try {
    const response = await listPrintTemplates(selectedBillType.value)
    if (response.code !== 200) {
      throw new Error(response.message || '加载模板失败')
    }
    templateRows.value = (response.data || []).filter((item) => item.source !== 'file')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载模板失败')
  } finally {
    loading.value = false
  }
}

function resetEditor() {
  editorForm.id = undefined
  editorForm.billType = selectedBillType.value
  editorForm.templateName = ''
  editorForm.templateHtml = ''
  editorForm.isDefault = true
}

function handleCreate() {
  resetEditor()
}

function handleEdit(record: PrintTemplateRecord) {
  editorForm.id = typeof record.id === 'number' ? record.id : Number(record.id)
  editorForm.billType = record.billType || selectedBillType.value
  selectedBillType.value = editorForm.billType
  editorForm.templateName = record.templateName
  editorForm.templateHtml = record.templateHtml
  editorForm.isDefault = record.isDefault === '1'
}

async function handleSave() {
  if (!editorForm.templateName.trim()) {
    message.warning('请输入模板名称')
    return
  }
  if (!editorForm.templateHtml.trim()) {
    message.warning('请上传或填写模板内容')
    return
  }

  saving.value = true
  try {
    const response = await savePrintTemplate({
      id: editorForm.id,
      billType: editorForm.billType,
      templateName: editorForm.templateName.trim(),
      templateHtml: editorForm.templateHtml,
      isDefault: editorForm.isDefault ? '1' : '0',
    })
    if (response.code !== 200) {
      throw new Error(response.message || '保存失败')
    }
    selectedBillType.value = editorForm.billType
    message.success('模板保存成功')
    await loadTemplates()
    if (!editorForm.id) {
      resetEditor()
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function handleDelete(record: PrintTemplateRecord) {
  if (typeof record.id !== 'number') {
    message.warning('当前仅支持删除数据库模板')
    return
  }

  Modal.confirm({
    title: '删除模板',
    content: `确定删除模板“${record.templateName}”吗？`,
    okText: '删除',
    cancelText: '取消',
    onOk: async () => {
      const response = await deletePrintTemplate(record.id as number)
      if (response.code !== 200) {
        throw new Error(response.message || '删除失败')
      }
      if (editorForm.id === record.id) {
        resetEditor()
      }
      message.success('模板已删除')
      await loadTemplates()
    },
  })
}

function readFileText(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取模板文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}

const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
  try {
    const text = await readFileText(file as File)
    if (!editorForm.templateName.trim()) {
      editorForm.templateName = file.name.replace(/\.[^.]+$/, '')
    }
    editorForm.templateHtml = text
    message.success(`已载入模板文件：${file.name}`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '读取模板文件失败')
  }
  return false
}
</script>

<template>
  <div class="page-stack print-template-page">
    <a-card :bordered="false" class="module-panel-card">
      <div class="print-template-toolbar">
        <div class="print-template-toolbar-left">
          <span class="print-template-toolbar-label">适用页面</span>
          <a-select v-model:value="selectedBillType" style="width: 220px">
            <a-select-option
              v-for="item in printTemplateTargetOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
        </div>
        <div class="print-template-toolbar-actions">
          <a-button type="primary" @click="handleCreate">新增模板</a-button>
          <a-upload :show-upload-list="false" :before-upload="beforeUpload" accept=".html,.htm,.lodop,.txt">
            <a-button>上传模板</a-button>
          </a-upload>
          <a-button @click="loadTemplates">刷新</a-button>
        </div>
      </div>

      <a-table
        row-key="id"
        size="middle"
        bordered
        :data-source="templateRows"
        :loading="loading"
        :pagination="false"
      >
        <a-table-column title="模板名称" data-index="templateName" key="templateName" />
        <a-table-column title="适用页面" key="billType" width="160">
          <template #default="{ record }">
            {{ printTemplateTargetMap[record.billType || selectedBillType] || record.billType || '--' }}
          </template>
        </a-table-column>
        <a-table-column title="默认模板" key="isDefault" width="100" align="center">
          <template #default="{ record }">
            <a-tag :color="record.isDefault === '1' ? 'blue' : 'default'">
              {{ record.isDefault === '1' ? '是' : '否' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="更新时间" data-index="updateTime" key="updateTime" width="180" />
        <a-table-column title="操作" key="action" width="140" align="center">
          <template #default="{ record }">
            <a @click.prevent="handleEdit(record)">编辑</a>
            <a-divider type="vertical" />
            <a @click.prevent="handleDelete(record)">删除</a>
          </template>
        </a-table-column>
      </a-table>
    </a-card>

    <a-row :gutter="16">
      <a-col :xl="16" :xs="24">
        <a-card :bordered="false" class="module-panel-card">
          <template #title>
            {{ editorForm.id ? '编辑模板' : '新建模板' }}
          </template>
          <a-form layout="vertical">
            <a-row :gutter="16">
              <a-col :md="12" :xs="24">
                <a-form-item label="模板名称">
                  <a-input v-model:value="editorForm.templateName" placeholder="输入模板名称" />
                </a-form-item>
              </a-col>
              <a-col :md="12" :xs="24">
                <a-form-item label="适用页面">
                  <a-select v-model:value="editorForm.billType">
                    <a-select-option
                      v-for="item in printTemplateTargetOptions"
                      :key="item.value"
                      :value="item.value"
                    >
                      {{ item.label }}
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="16">
              <a-col :md="12" :xs="24">
                <a-form-item label="设为默认模板">
                  <a-switch v-model:checked="editorForm.isDefault" checked-children="默认" un-checked-children="普通" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-form-item label="模板内容">
              <a-textarea
                v-model:value="editorForm.templateHtml"
                :rows="22"
                placeholder="支持 HTML 模板和 LODOP 指令模板"
              />
            </a-form-item>

            <div class="print-template-editor-actions">
              <a-button type="primary" :loading="saving" @click="handleSave">保存模板</a-button>
              <a-button @click="resetEditor">清空</a-button>
            </div>
          </a-form>
        </a-card>
      </a-col>

      <a-col :xl="8" :xs="24">
        <a-card :bordered="false" class="module-panel-card">
          <template #title>
            可用字段
          </template>
          <div class="print-template-token-group">
            <div class="print-template-token-title">系统变量</div>
            <div class="print-template-token-list">
              <a-tag v-pre>{{_printDate}}</a-tag>
              <a-tag v-pre>{{_printTime}}</a-tag>
              <a-tag v-pre>{{_index}}</a-tag>
            </div>
          </div>
          <div class="print-template-token-group">
            <div class="print-template-token-title">主表字段</div>
            <div class="print-template-token-list">
              <a-tag v-for="item in headerTokens" :key="item.key">
                {{ item.token }} {{ item.label }}
              </a-tag>
            </div>
          </div>
          <div class="print-template-token-group">
            <div class="print-template-token-title">明细字段</div>
            <div class="print-template-token-list">
              <a-tag v-for="item in detailTokens" :key="item.key">
                {{ item.token }} {{ item.label }}
              </a-tag>
            </div>
          </div>
          <div class="print-template-token-group">
            <div class="print-template-token-title">循环语法</div>
            <pre class="print-template-code-sample" v-pre><code>&lt;!--DETAIL_ROW_START--&gt;
&lt;tr&gt;
  &lt;td&gt;{{_index}}&lt;/td&gt;
  &lt;td&gt;{{detail.materialCode}}&lt;/td&gt;
&lt;/tr&gt;
&lt;!--DETAIL_ROW_END--&gt;</code></pre>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>
