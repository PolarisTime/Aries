<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { businessPageConfigs } from '@/config/business-pages'
import { appTitle, isMockEnabled } from '@/utils/env'

const modulePageCount = String(Object.keys(businessPageConfigs).length)

const summaryQuery = useQuery({
  queryKey: ['dashboard-summary'],
  queryFn: async () => ({
    generatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    mode: isMockEnabled ? 'Mock REST' : '业务 API',
    pageCount: modulePageCount,
    migratedCount: modulePageCount,
    milestones: [
      '统一布局、菜单、页签和登录页已切换到 Jeecg 风格。',
      '主数据、采购、销售、价格、物流、报表、对账、财务模块已统一到列表底座。',
      '下一步补齐新增、编辑、复制、附件、审核等业务动作。',
    ],
  }),
})
</script>

<template>
  <div class="page-stack">
    <a-card :bordered="false" class="dashboard-card">
      <div class="dashboard-title">系统首页</div>
      <div class="dashboard-subtitle">
        {{ appTitle }} 前端重写版，当前整体界面已统一为 Jeecg 列表风格。
      </div>
    </a-card>

    <a-row :gutter="[12, 12]">
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="dashboard-stat-card" title="当前模式">
          <strong>{{ summaryQuery.data.value?.mode }}</strong>
          <p class="card-note">根据环境变量自动切换接口来源。</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="dashboard-stat-card" title="模块页面">
          <strong>{{ summaryQuery.data.value?.pageCount }}</strong>
          <p class="card-note">菜单与模块页结构已经铺开。</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="dashboard-stat-card" title="已迁移页面">
          <strong>{{ summaryQuery.data.value?.migratedCount }}</strong>
          <p class="card-note">全部统一到当前列表底座。</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :xl="6">
        <a-card class="dashboard-stat-card" title="更新时间">
          <strong>{{ summaryQuery.data.value?.generatedAt }}</strong>
          <p class="card-note">以当前构建时的页面状态为准。</p>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="[12, 12]">
      <a-col :xs="24" :xl="15">
        <a-card title="系统说明">
          <a-alert
            type="info"
            show-icon
            message="当前重点"
            description="先保持旧系统使用习惯一致，再逐步替换为 Vue 3 组合式实现。"
          />
          <a-descriptions
            :column="1"
            size="small"
            class="dashboard-descriptions"
          >
            <a-descriptions-item label="界面风格">
              统一按 Jeecg 风格重写，包括查询区、操作按钮条、白底表格、页签和登录页。
            </a-descriptions-item>
            <a-descriptions-item label="当前状态">
              采购、销售、价格、物流、对账、财务页面已切到统一列表底座。
            </a-descriptions-item>
            <a-descriptions-item label="下一步">
              继续补齐新增、编辑、复制、附件、审核、联动弹窗等业务动作。
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
      <a-col :xs="24" :xl="9">
        <a-card title="近期安排">
          <a-timeline
            :items="
              (summaryQuery.data.value?.milestones || []).map((item, index) => ({
                color: index === 0 ? 'green' : 'blue',
                children: item,
              }))
            "
          />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>
