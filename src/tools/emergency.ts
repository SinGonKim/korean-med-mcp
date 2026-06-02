import { z } from "zod"
import { callPublicApi, getDataGoKrKey, extractItems } from "../lib/public-api-client.js"
import { TTLCache, TTL } from "../lib/cache.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const cache = new TTLCache<string, string>()

const GetErStatusSchema = z.object({
  region: z.string().optional().describe(
    "지역 필터 (예: '서울', '경기', '부산'). 미입력 시 전국 조회"
  ),
  numOfRows: z.number().int().min(1).max(50).default(20).describe("결과 개수"),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatErStatus(items: any[]): string {
  if (items.length === 0) return "응급실 정보를 찾을 수 없습니다."
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((er: any) => {
    const hvec = Number(er.hvec ?? -1)
    const hvoc = Number(er.hvoc ?? -1)
    const statusIcon = hvec > 0 ? "🟢" : hvec === 0 ? "🔴" : "⚪"
    const lines = [
      `${statusIcon} ${er.dutyName ?? "-"}`,
      `   주소: ${er.dutyAddr ?? "-"}`,
      `   대표전화: ${er.dutyTel1 ?? "-"}`,
    ]
    if (er.dutyTel3) lines.push(`   응급실 직통: ${er.dutyTel3}`)
    if (hvec >= 0) lines.push(`   가용 일반 병상: ${hvec}개`)
    if (hvoc >= 0) lines.push(`   가용 중환자 병상: ${hvoc}개`)
    if (er.hvidate) lines.push(`   정보 업데이트: ${er.hvidate}`)
    return lines.join("\n")
  }).join("\n\n")
}

export const getErStatusTool: McpTool = {
  name: "get_er_status",
  description: "응급실 실시간 가용 병상 현황을 조회합니다. 2분 캐시 적용.",
  schema: GetErStatusSchema,
  handler: async (rawInput) => {
    const input = GetErStatusSchema.parse(rawInput)
    const cacheKey = JSON.stringify(input)
    const cached = cache.get(cacheKey)
    if (cached) return { content: [{ type: "text", text: cached }] }

    const serviceKey = getDataGoKrKey()

    const params: Record<string, string | number> = {
      pageNo: 1,
      numOfRows: input.numOfRows,
    }
    if (input.region) params.STAGE1 = input.region

    const data = await callPublicApi(
      "/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire",
      serviceKey,
      params
    )

    const items = extractItems(data)
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })
    const body = formatErStatus(items)
    const result =
      `응급실 실시간 현황 — ${input.region ?? "전국"} (조회: ${now})\n\n` +
      body +
      `\n\n출처: 국립중앙의료원 응급의료정보제공 (실시간)` +
      `\n⚠️ 병상 현황은 실시간이나 도착 시 변경될 수 있습니다. 반드시 전화 확인 바랍니다.` +
      MEDICAL_DISCLAIMER

    cache.set(cacheKey, result, TTL.ER_STATUS)
    return { content: [{ type: "text", text: result }] }
  },
}
