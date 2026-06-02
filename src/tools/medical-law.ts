import { z } from "zod"
import {
  searchMedicalLaw,
  getLawArticle,
  searchMedicalPrecedent,
  searchAdminDecision,
} from "../legal/client.js"
import { MEDICAL_DISCLAIMER } from "../lib/disclaimer.js"
import type { McpTool } from "../lib/types.js"

const MEDICAL_LAW_NAMES = [
  "의료법",
  "응급의료에 관한 법률",
  "약사법",
  "국민건강보험법",
  "감염병의 예방 및 관리에 관한 법률",
  "의료사고 피해구제 및 의료분쟁 조정 등에 관한 법률",
] as const

const SearchMedicalLawSchema = z.object({
  query: z.string().describe(
    "검색어 (예: '응급실 진료거부', '의료과오', '비급여', '의사 면허 취소')"
  ),
  lawName: z.enum(MEDICAL_LAW_NAMES).optional().describe("특정 법령 내에서 검색 시 지정"),
  articleNo: z.string().optional().describe("특정 조문 조회 시 (예: '제15조', '제48조의2')"),
  searchType: z.enum(["law", "precedent", "admin_appeal"]).default("law").describe(
    "검색 유형: law=법령 조문, precedent=판례, admin_appeal=행정심판례"
  ),
  display: z.number().int().min(1).max(20).default(5).describe("결과 개수"),
})

export const searchMedicalLawTool: McpTool = {
  name: "search_medical_law",
  description:
    "의료 관련 법령(의료법, 약사법, 응급의료법 등), 판례, 행정심판례를 검색합니다. 법제처 공개 API 사용.",
  schema: SearchMedicalLawSchema,
  handler: async (rawInput) => {
    const input = SearchMedicalLawSchema.parse(rawInput)

    if (input.searchType === "precedent") {
      const precedents = await searchMedicalPrecedent({ query: input.query, display: input.display })
      if (precedents.length === 0) {
        return {
          content: [{
            type: "text",
            text: `판례 검색 결과 없음 — "${input.query}"\n\n다른 검색어를 시도해보세요.${MEDICAL_DISCLAIMER}`,
          }],
        }
      }
      const body = precedents.map((p, i) => {
        const lines = [
          `${i + 1}. [${p.court}] ${p.caseNo} (${p.decisionDate})`,
          `   사건명: ${p.caseName || "-"}`,
        ]
        if (p.summary) lines.push(`   판시사항: ${p.summary.slice(0, 200)}${p.summary.length > 200 ? "…" : ""}`)
        if (p.lawRefName) lines.push(`   참조조문: ${p.lawRefName}`)
        if (p.precedentId) lines.push(`   원문: https://www.law.go.kr/precInfoP.do?precSeq=${p.precedentId}`)
        return lines.join("\n")
      }).join("\n\n")
      return {
        content: [{
          type: "text",
          text: `판례 검색 결과 — "${input.query}"\n\n${body}\n\n출처: 법제처 판례 데이터베이스${MEDICAL_DISCLAIMER}`,
        }],
      }
    }

    if (input.searchType === "admin_appeal") {
      const decisions = await searchAdminDecision({ query: input.query, display: input.display })
      if (decisions.length === 0) {
        return {
          content: [{
            type: "text",
            text: `행정심판례 검색 결과 없음 — "${input.query}"${MEDICAL_DISCLAIMER}`,
          }],
        }
      }
      const body = decisions.map((d, i) => {
        const lines = [
          `${i + 1}. ${d.caseNo || "-"} (${d.decisionDate || "-"})`,
          `   기관: ${d.institution}`,
        ]
        if (d.summary) lines.push(`   요지: ${d.summary.slice(0, 200)}${d.summary.length > 200 ? "…" : ""}`)
        if (d.result) lines.push(`   결과: ${d.result}`)
        return lines.join("\n")
      }).join("\n\n")
      return {
        content: [{
          type: "text",
          text: `행정심판례 검색 결과 — "${input.query}"\n\n${body}\n\n출처: 법제처 행정심판례${MEDICAL_DISCLAIMER}`,
        }],
      }
    }

    // law 검색
    const { laws } = await searchMedicalLaw({ query: input.query, lawName: input.lawName })
    if (laws.length === 0) {
      return {
        content: [{
          type: "text",
          text: `법령 검색 결과 없음 — "${input.query}"\n\n지원 법령: ${MEDICAL_LAW_NAMES.join(", ")}${MEDICAL_DISCLAIMER}`,
        }],
      }
    }

    if (input.articleNo && laws[0].mst) {
      const articleJson = await getLawArticle({ mst: laws[0].mst, articleNo: input.articleNo })
      let articleText = ""
      try {
        const parsed = JSON.parse(articleJson)
        const joInfo = parsed?.law?.조문?.조문내용 ?? parsed?.조문내용 ?? ""
        const joTitle = parsed?.law?.조문?.조문제목 ?? parsed?.조문제목 ?? input.articleNo
        articleText = `${laws[0].lawName} ${joTitle}\n\n${joInfo}`
      } catch {
        articleText = articleJson.slice(0, 1000)
      }
      return {
        content: [{
          type: "text",
          text: `법령 조문 — ${laws[0].lawName} ${input.articleNo}\n\n${articleText}\n\n시행일: ${laws[0].enforcementDate}\n원문: https://www.law.go.kr/법령/${encodeURIComponent(laws[0].lawName)}\n\n출처: 법제처${MEDICAL_DISCLAIMER}`,
        }],
      }
    }

    const body = laws.slice(0, input.display).map((law, i) =>
      [
        `${i + 1}. ${law.lawName} (${law.lawType})`,
        `   시행일: ${law.enforcementDate}`,
        `   원문: https://www.law.go.kr/법령/${encodeURIComponent(law.lawName)}`,
      ].join("\n")
    ).join("\n\n")

    return {
      content: [{
        type: "text",
        text: `법령 검색 결과 — "${input.query}"\n\n${body}\n\n출처: 법제처\n💡 특정 조문을 보려면 articleNo 파라미터를 추가하세요 (예: '제15조')${MEDICAL_DISCLAIMER}`,
      }],
    }
  },
}
