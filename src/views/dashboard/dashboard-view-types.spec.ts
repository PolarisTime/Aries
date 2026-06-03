import { describe, expect, it } from 'vitest'

import type {
  DashboardInfoItem,
  WorkflowSection,
} from '@/views/dashboard/dashboard-view-types'

describe('dashboard-view-types', () => {
  describe('WorkflowSection', () => {
    it('can be created with required properties', () => {
      const section: WorkflowSection = {
        key: 'master',
        title: '主数据',
        description: '管理基础数据',
        accent: '#0f766e',
        nodes: [],
      }
      expect(section.key).toBe('master')
      expect(section.title).toBe('主数据')
      expect(section.description).toBe('管理基础数据')
      expect(section.accent).toBe('#0f766e')
      expect(section.nodes).toEqual([])
    })

    it('allows nodes with all properties', () => {
      const section: WorkflowSection = {
        key: 'master',
        title: '主数据',
        description: '管理基础数据',
        accent: '#0f766e',
        nodes: [
          {
            key: 'material',
            title: '物料',
            path: '/material',
            icon: () => null,
            tone: '#1677ff',
            hint: '管理物料信息',
            metric: '100 个物料',
          },
        ],
      }
      expect(section.nodes[0].key).toBe('material')
      expect(section.nodes[0].title).toBe('物料')
      expect(section.nodes[0].path).toBe('/material')
      expect(section.nodes[0].tone).toBe('#1677ff')
      expect(section.nodes[0].hint).toBe('管理物料信息')
      expect(section.nodes[0].metric).toBe('100 个物料')
    })

    it('allows nodes without optional metric', () => {
      const section: WorkflowSection = {
        key: 'master',
        title: '主数据',
        description: '管理基础数据',
        accent: '#0f766e',
        nodes: [
          {
            key: 'warehouse',
            title: '仓库',
            path: '/warehouse',
            icon: () => null,
            tone: '#13c2c2',
            hint: '管理仓库信息',
          },
        ],
      }
      expect(section.nodes[0].metric).toBeUndefined()
    })

    it('allows multiple nodes', () => {
      const section: WorkflowSection = {
        key: 'master',
        title: '主数据',
        description: '管理基础数据',
        accent: '#0f766e',
        nodes: [
          {
            key: 'material',
            title: '物料',
            path: '/material',
            icon: () => null,
            tone: '#1677ff',
            hint: '管理物料信息',
          },
          {
            key: 'supplier',
            title: '供应商',
            path: '/supplier',
            icon: () => null,
            tone: '#52c41a',
            hint: '管理供应商信息',
          },
        ],
      }
      expect(section.nodes).toHaveLength(2)
    })
  })

  describe('DashboardInfoItem', () => {
    it('can be created with required properties', () => {
      const item: DashboardInfoItem = {
        key: 'userName',
        label: '用户名',
        value: '测试用户',
        icon: () => null,
      }
      expect(item.key).toBe('userName')
      expect(item.label).toBe('用户名')
      expect(item.value).toBe('测试用户')
    })

    it('has correct type structure', () => {
      const item: DashboardInfoItem = {
        key: 'loginName',
        label: '登录名',
        value: 'testuser',
        icon: () => null,
      }
      expect(typeof item.key).toBe('string')
      expect(typeof item.label).toBe('string')
      expect(typeof item.value).toBe('string')
      expect(typeof item.icon).toBe('function')
    })

    it('allows empty values', () => {
      const item: DashboardInfoItem = {
        key: 'roleName',
        label: '角色',
        value: '',
        icon: () => null,
      }
      expect(item.value).toBe('')
    })

    it('allows dash as value', () => {
      const item: DashboardInfoItem = {
        key: 'companyName',
        label: '公司',
        value: '—',
        icon: () => null,
      }
      expect(item.value).toBe('—')
    })
  })
})
