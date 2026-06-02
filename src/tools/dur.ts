import { z } from "zod"
import { callPublicApi, getDataGoKrKey, extractItems } from "../lib/public-api-client.js"
import { TTLCache, TTL } from "../lib/cache.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const cache = new TTLCache<string, string>()

const CheckDurSchema = z.object({
  drugs: z.array(z.string()).min(1).max(10).describe(
    "확인할 의약품명 목록 (예: ['타이레놀', '이부프로펜'])"
  ),
  patientAge: z.number().int().min(0).max(150).optional().describe("환자 나이 (연령 금기 확인용)"),
  isPregnant: z.boolean().optional().describe("임부 여부 (임부 금기 확인용)"),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDurItems(items: any[], drugName: string): string {
  if (items.length === 0) return `✅ ${drugName}: DUR 금기 정보 없음`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any) => {
    const lines = [`⚠️ ${drugName} — ${item.typeName ?? "금기"}:`]
    if (item.mixture) lines.push(`   병용 의약품: ${item.mixture}`)
    if (item.prohbtContent) lines.push(`   금기 내용: ${item.prohbtContent}`)
    if (item.remark) lines.push(`   비고: ${item.remark}`)
    return lines.join("\n")
  }).join("\n")
}

async function checkDurForDrug(serviceKey: string, drugName: string): Promise<string> {
  const data = await callPublicApi(
    "/B551182/DURPrdlstInfoService03/getUsjntTabooInfoList03",
    serviceKey,
    { itemName: drugName, pageNo: 1, numOfRows: 20 }
  )
  const items = extractItems(data)
  return formatDurItems(items, drugName)
}

export const checkDurTool: McpTool = {
  name: "check_dur",
  description: "의약품 안전사용정보(DUR)를 확인합니다. 병용금기, 연령금기, 임부금기 등을 조회합니다.",
  schema: CheckDurSchema,
  handler: async (rawInput) => {
    const input = CheckDurSchema.parse(rawInput)
    const cacheKey = `dur:${JSON.stringify(input)}`
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()

    const results: string[] = []
    for (const drug of input.drugs) {
      const combo = await checkDurForDrug(serviceKey, drug)
      results.push(combo)
    }

    if (input.patientAge !== undefined) {
      results.push(
        `\n📋 연령 관련 안내 (${input.patientAge}세):`,
        "   특정 의약품은 소아(<12세), 고령자(>65세)에게 금기일 수 있습니다.",
        "   정확한 연령 금기는 처방 의사 또는 약사와 상담하세요."
      )
    }

    if (input.isPregnant) {
      results.push(
        "\n🤰 임부 관련 안내:",
        "   임신 중에는 많은 의약품이 금기이거나 주의가 필요합니다.",
        "   반드시 담당 의사 또는 약사와 상담 후 복용하세요."
      )
    }

    const drugsStr = input.drugs.join(", ")
    const result =
      `DUR 안전사용정보 — ${drugsStr}\n\n` +
      results.join("\n") +
      `\n\n출처: 건강보험심사평가원 DUR 품목정보` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.DRUG)
    return { content: [{ type: "text", text: result }] }
  },
}
