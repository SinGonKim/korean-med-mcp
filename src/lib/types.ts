import { z } from "zod"

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>
  isError?: boolean
}

export interface McpTool {
  name: string
  description: string
  schema: z.ZodObject<z.ZodRawShape>
  handler: (input: z.infer<z.ZodObject<z.ZodRawShape>>) => Promise<ToolResult>
}

export function toMcpInputSchema(schema: z.ZodObject<z.ZodRawShape>): {
  type: "object"
  properties: Record<string, unknown>
  required?: string[]
} {
  const shape = schema.shape
  const properties: Record<string, unknown> = {}
  const required: string[] = []

  for (const [key, field] of Object.entries(shape)) {
    const zodField = field as z.ZodTypeAny
    const isOptional =
      zodField instanceof z.ZodOptional ||
      zodField instanceof z.ZodDefault

    // extract inner type for optional/default
    let inner: z.ZodTypeAny = zodField
    if (zodField instanceof z.ZodOptional) inner = zodField.unwrap()
    if (zodField instanceof z.ZodDefault) inner = zodField.removeDefault()

    const description = (inner as { description?: string }).description

    let type = "string"
    if (inner instanceof z.ZodNumber) type = "number"
    else if (inner instanceof z.ZodBoolean) type = "boolean"
    else if (inner instanceof z.ZodArray) type = "array"

    const prop: Record<string, unknown> = { type }
    if (description) prop.description = description

    // enum values
    if (inner instanceof z.ZodEnum) {
      prop.enum = inner.options
    }

    properties[key] = prop
    if (!isOptional) required.push(key)
  }

  return { type: "object", properties, ...(required.length > 0 ? { required } : {}) }
}
