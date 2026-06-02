import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js"
import { findHospitalTool } from "./tools/hospital.js"
import { findPharmacyTool } from "./tools/pharmacy.js"
import { getErStatusTool } from "./tools/emergency.js"
import { searchDrugTool, identifyPillTool } from "./tools/drug.js"
import { searchDrugPatentTool } from "./tools/drug-patent.js"
import { getDrugUsageByAreaTool, getDrugUsageBySickTool } from "./tools/drug-usage.js"
import { searchMedicalLawTool } from "./tools/medical-law.js"
import {
  searchCancerInfoTool,
  getCancerPreventionTool,
  searchCancerFaqTool,
  searchCancerDictionaryTool,
  getCancerStatisticsTool,
  getCancerLifeGuideTool,
} from "./tools/cancer.js"
import { toMcpInputSchema } from "./lib/types.js"
import type { McpTool } from "./lib/types.js"

const allTools: McpTool[] = [
  // data.go.kr 공공 의료 API
  findHospitalTool,
  findPharmacyTool,
  getErStatusTool,
  searchDrugTool,
  identifyPillTool,
  searchDrugPatentTool,
  getDrugUsageByAreaTool,
  getDrugUsageBySickTool,
  // 법제처 DRF API
  searchMedicalLawTool,
  // 국가암정보센터 API
  searchCancerInfoTool,
  getCancerPreventionTool,
  searchCancerFaqTool,
  searchCancerDictionaryTool,
  getCancerStatisticsTool,
  getCancerLifeGuideTool,
]

const toolMap = new Map<string, McpTool>(allTools.map((t) => [t.name, t]))

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: toMcpInputSchema(t.schema),
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const tool = toolMap.get(name)

    if (!tool) {
      return {
        content: [{ type: "text" as const, text: `알 수 없는 도구: ${name}` }],
        isError: true,
      }
    }

    try {
      const result = await tool.handler(args ?? {})
      return {
        content: result.content.map((c) => ({ type: "text" as const, text: c.text })),
        isError: result.isError ?? false,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        content: [{ type: "text" as const, text: `오류: ${msg}` }],
        isError: true,
      }
    }
  })
}
