import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type CustomerProject,
  deleteCustomerProject,
  fetchCustomerProjects,
  saveCustomerProject,
} from '@/api/master/customer-projects'
import { fetchGeneratedMasterDataCode } from '@/api/master/master-data-codes'
import { enabledStatusOptions } from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import type { EntityId } from '@/types/entity-id'
import { message } from '@/utils/antd-app'

interface CustomerIdentity {
  id: EntityId
  code: string
  name: string
}

interface ProjectFormValues {
  projectCode: string
  projectName: string
  projectNameAbbr?: string
  projectAddress?: string
  projectManager?: string
  status: string
  remark?: string
}

interface Props {
  customer: CustomerIdentity
  onChanged: () => Promise<void>
}

interface ManagerState {
  editorOpen: boolean
  editingProject: CustomerProject | null
  saving: boolean
  codeLoading: boolean
  deletingId: EntityId | null
}

const INITIAL_MANAGER_STATE: ManagerState = {
  editorOpen: false,
  editingProject: null,
  saving: false,
  codeLoading: false,
  deletingId: null,
}

function mergeManagerState(
  state: ManagerState,
  update: Partial<ManagerState>,
): ManagerState {
  return { ...state, ...update }
}

export function CustomerProjectManager({ customer, onChanged }: Props) {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<ProjectFormValues>()
  const [state, updateState] = useReducer(
    mergeManagerState,
    INITIAL_MANAGER_STATE,
  )
  const { editorOpen, editingProject, saving, codeLoading, deletingId } = state

  const projectQueryKey = QUERY_KEYS.masterOptions.customerProjects(customer.id)
  const { data: projects = [], isLoading } = useQuery({
    queryKey: projectQueryKey,
    queryFn: () => fetchCustomerProjects(customer.id),
  })

  const refreshProjects = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectQueryKey }),
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.masterOptions.project(customer.id),
      }),
      onChanged(),
    ])
  }

  const openCreateEditor = async () => {
    form.resetFields()
    form.setFieldsValue({ status: '正常' })
    updateState({ editingProject: null, editorOpen: true, codeLoading: true })
    try {
      const projectCode = await fetchGeneratedMasterDataCode('project')
      form.setFieldValue('projectCode', projectCode)
    } catch (error) {
      showError(error)
      updateState({ editorOpen: false, codeLoading: false })
      return
    }
    updateState({ codeLoading: false })
  }

  const openEditEditor = (project: CustomerProject) => {
    form.setFieldsValue({
      projectCode: project.projectCode,
      projectName: project.projectName,
      projectNameAbbr: project.projectNameAbbr,
      projectAddress: project.projectAddress,
      projectManager: project.projectManager,
      status: project.status,
      remark: project.remark,
    })
    updateState({ editingProject: project, editorOpen: true })
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      updateState({ saving: true })
      await saveCustomerProject(
        {
          ...values,
          customerId: customer.id,
          customerCode: customer.code,
        },
        editingProject?.id,
      )
      message.success(t('hooks.customerProjectActions.saveSuccess'))
      updateState({ editorOpen: false })
      await refreshProjects()
    } catch (error) {
      if (!error || typeof error !== 'object' || !('errorFields' in error)) {
        showError(error)
      }
    }
    updateState({ saving: false })
  }

  const handleDelete = async (projectId: EntityId) => {
    updateState({ deletingId: projectId })
    try {
      await deleteCustomerProject(projectId)
      message.success(t('hooks.customerProjectActions.deleteSuccess'))
      await refreshProjects()
    } catch (error) {
      showError(error)
    }
    updateState({ deletingId: null })
  }

  const columns: ColumnsType<CustomerProject> = [
    {
      title: t('hooks.customerProjectActions.code'),
      dataIndex: 'projectCode',
      width: 145,
    },
    {
      title: t('hooks.customerProjectActions.name'),
      dataIndex: 'projectName',
      width: 330,
      ellipsis: { showTitle: false },
      render: (value: string) => <Tooltip title={value}>{value}</Tooltip>,
    },
    {
      title: t('hooks.customerProjectActions.address'),
      dataIndex: 'projectAddress',
      width: 220,
      ellipsis: { showTitle: false },
      render: (value: string) => (
        <Tooltip title={value}>{value || '-'}</Tooltip>
      ),
    },
    {
      title: t('hooks.customerProjectActions.manager'),
      dataIndex: 'projectManager',
      width: 110,
      render: (value: string) => value || '-',
    },
    {
      title: t('hooks.customerProjectActions.status'),
      dataIndex: 'status',
      width: 85,
      align: 'center',
      render: (value: string) => (
        <Tag color={value === '正常' ? 'success' : 'error'}>{value}</Tag>
      ),
    },
    {
      title: t('hooks.customerProjectActions.operations'),
      key: 'operations',
      width: 90,
      fixed: 'right',
      align: 'center',
      render: (_, project) => (
        <Flex justify="center" gap={4}>
          <Tooltip title={t('hooks.customerProjectActions.edit')}>
            <Button
              type="text"
              size="small"
              aria-label={t('hooks.customerProjectActions.edit')}
              icon={<EditOutlined />}
              onClick={() => openEditEditor(project)}
            />
          </Tooltip>
          <Popconfirm
            title={t('hooks.customerProjectActions.deleteConfirm')}
            okText={t('common.confirm')}
            cancelText={t('common.cancel')}
            onConfirm={() => void handleDelete(project.id)}
          >
            <Tooltip title={t('hooks.customerProjectActions.delete')}>
              <Button
                type="text"
                size="small"
                danger
                loading={deletingId === project.id}
                aria-label={t('hooks.customerProjectActions.delete')}
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Flex>
      ),
    },
  ]

  return (
    <>
      <Flex vertical gap={12} className="mt-12">
        <Flex justify="flex-end">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => void openCreateEditor()}
          >
            {t('hooks.customerProjectActions.create')}
          </Button>
        </Flex>
        <Table
          rowKey="id"
          size="small"
          loading={isLoading}
          columns={columns}
          dataSource={projects}
          pagination={false}
          scroll={{ x: 980, y: 420 }}
        />
      </Flex>

      <Modal
        title={
          editingProject
            ? t('hooks.customerProjectActions.edit')
            : t('hooks.customerProjectActions.create')
        }
        open={editorOpen}
        width={760}
        destroyOnHidden
        mask={{ closable: false }}
        confirmLoading={saving}
        okButtonProps={{ disabled: codeLoading }}
        onOk={() => void handleSave()}
        onCancel={() => updateState({ editorOpen: false })}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="projectCode"
                label={t('hooks.customerProjectActions.code')}
                rules={[{ required: true }]}
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="projectName"
                label={t('hooks.customerProjectActions.name')}
                rules={[{ required: true, whitespace: true }]}
              >
                <Input maxLength={200} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="projectNameAbbr"
                label={t('hooks.customerProjectActions.abbreviatedName')}
              >
                <Input maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="projectManager"
                label={t('hooks.customerProjectActions.manager')}
              >
                <Input maxLength={32} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="projectAddress"
                label={t('hooks.customerProjectActions.address')}
              >
                <Input maxLength={255} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label={t('hooks.customerProjectActions.status')}
                rules={[{ required: true }]}
              >
                <Select options={enabledStatusOptions} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="remark"
                label={t('hooks.customerProjectActions.remark')}
              >
                <Input.TextArea rows={3} maxLength={255} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  )
}
