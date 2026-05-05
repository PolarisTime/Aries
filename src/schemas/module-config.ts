import { z } from 'zod'

const moduleColumnDefinitionSchema = z.object({
  dataIndex: z.string(),
  title: z.string(),
  width: z.number().positive().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  type: z.string().optional(),
  required: z.boolean().optional(),
})

const moduleFormFieldDefinitionSchema = z.object({
  dataIndex: z.string(),
  label: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.unknown() })).optional(),
})

export const modulePageConfigSchema = z.object({
  moduleKey: z.string(),
  path: z.string(),
  title: z.string(),
  columns: z.array(moduleColumnDefinitionSchema),
  formFields: z.array(moduleFormFieldDefinitionSchema).optional(),
  itemColumns: z.array(moduleColumnDefinitionSchema).optional(),
  detailFields: z.array(moduleColumnDefinitionSchema).optional(),
  readOnly: z.boolean().optional(),
})

export type ModuleColumnDefinition = z.infer<typeof moduleColumnDefinitionSchema>
export type ModuleFormFieldDefinition = z.infer<typeof moduleFormFieldDefinitionSchema>
export type ModulePageConfig = z.infer<typeof modulePageConfigSchema>
