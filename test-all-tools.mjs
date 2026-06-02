#!/usr/bin/env node
/**
 * korean-med-mcp 전체 도구 통합 테스트
 * 실행: source .env && node test-all-tools.mjs
 */

import { findHospitalTool } from "./build/tools/hospital.js"
import { findPharmacyTool } from "./build/tools/pharmacy.js"
import { getErStatusTool } from "./build/tools/emergency.js"
import { searchDrugTool, identifyPillTool } from "./build/tools/drug.js"
import { searchDrugPatentTool } from "./build/tools/drug-patent.js"
import { checkDurTool } from "./build/tools/dur.js"
import { searchMedicalLawTool } from "./build/tools/medical-law.js"
import {
  searchCancerInfoTool,
  getCancerPreventionTool,
  searchCancerFaqTool,
  searchCancerDictionaryTool,
  getCancerStatisticsTool,
  getCancerLifeGuideTool,
} from "./build/tools/cancer.js"

const GREEN  = "\x1b[32m"
const RED    = "\x1b[31m"
const YELLOW = "\x1b[33m"
const BOLD   = "\x1b[1m"
const RESET  = "\x1b[0m"

const TESTS = [
  // ── 공공데이터 (data.go.kr) ──────────────────────────────────────
  {
    tool: findHospitalTool,
    input: { keyword: "강남세브란스", pageNo: 1, numOfRows: 3 },
    label: "병원 찾기 (강남세브란스)",
    check: (t) => t.includes("병원") || t.includes("의원"),
  },
  {
    tool: findPharmacyTool,
    input: { keyword: "강남약국", pageNo: 1, numOfRows: 3 },
    label: "약국 찾기 (강남약국)",
    check: (t) => t.includes("약국") || t.includes("주소"),
  },
  {
    tool: getErStatusTool,
    input: { region: "서울", numOfRows: 5 },
    label: "응급실 실시간 현황 (서울)",
    check: (t) => t.includes("응급") || t.includes("병상"),
  },
  {
    tool: searchDrugTool,
    input: { drugName: "타이레놀", pageNo: 1, numOfRows: 2 },
    label: "의약품 검색 (타이레놀)",
    check: (t) => t.includes("타이레놀") || t.includes("아세트아미노펜") || t.includes("효능"),
  },
  {
    tool: identifyPillTool,
    input: { color: "흰색", shape: "원형" },
    label: "약 식별 (흰색 원형)",
    check: (t) => t.includes("알약") || t.includes("식별") || t.includes("없습니다") || t.includes("미활성"),
  },
  {
    tool: searchDrugPatentTool,
    input: { ingrName: "아세트아미노펜", pageNo: 1, numOfRows: 3 },
    label: "의약품 특허 (아세트아미노펜)",
    check: (t) => t.includes("특허") || t.includes("아세트아미노펜"),
  },
  {
    tool: checkDurTool,
    input: { drugs: ["타이레놀", "이부프로펜"] },
    label: "DUR 병용금기 확인 (타이레놀 + 이부프로펜)",
    check: (t) => t.includes("DUR") || t.includes("금기") || t.includes("✅") || t.includes("미활성"),
  },
  // ── 법제처 ───────────────────────────────────────────────────────
  {
    tool: searchMedicalLawTool,
    input: { query: "응급의료에 관한 법률", searchType: "law", display: 3 },
    label: "의료법령 검색 (응급의료법)",
    check: (t) => t.includes("응급") || t.includes("법률") || t.includes("법령"),
  },
  {
    tool: searchMedicalLawTool,
    input: { query: "의료과오", searchType: "precedent", display: 3 },
    label: "판례 검색 (의료과오)",
    check: (t) => t.includes("판례") || t.includes("사건") || t.includes("없음"),
  },
  {
    tool: searchMedicalLawTool,
    input: { query: "의료기관 행정처분", searchType: "admin_appeal", display: 3 },
    label: "행정심판례 검색 (의료기관 처분)",
    check: (t) => t.includes("행정") || t.includes("심판") || t.includes("없음"),
  },
  // ── 국가암정보센터 ───────────────────────────────────────────────
  {
    tool: searchCancerInfoTool,
    input: { cancerType: "갑상선암" },
    label: "암 정보 검색 (갑상선암)",
    check: (t) => t.includes("암") || t.includes("갑상선"),
  },
  {
    tool: getCancerPreventionTool,
    input: { topic: "금연" },
    label: "암 예방 정보 (금연)",
    check: (t) => t.includes("예방") || t.includes("검진") || t.includes("금연"),
  },
  {
    tool: searchCancerFaqTool,
    input: { query: "항암" },
    label: "암 FAQ (항암 관련)",
    check: (t) => t.includes("FAQ") || t.includes("항암") || t.includes("없음"),
  },
  {
    tool: searchCancerDictionaryTool,
    input: { term: "항암제" },
    label: "암정보사전 (항암제)",
    check: (t) => t.includes("항암제") || t.includes("정의") || t.includes("없음"),
  },
  {
    tool: getCancerStatisticsTool,
    input: {},
    label: "암 통계 (전체)",
    check: (t) => t.includes("통계") || t.includes("암") || t.includes("발생"),
  },
  {
    tool: getCancerLifeGuideTool,
    input: {},
    label: "암환자 생활백서 (전체)",
    check: (t) => t.includes("생활") || t.includes("암") || t.includes("없습니다"),
  },
]

async function runAll() {
  console.log(`\n${BOLD}korean-med-mcp 전체 도구 테스트${RESET}`)
  console.log(`${"─".repeat(60)}`)
  console.log(`API 키: DATA_GO_KR_API_KEY=${process.env.DATA_GO_KR_API_KEY ? "✔ 설정됨" : "✘ 없음"}, LAW_OC=${process.env.LAW_OC ? "✔ 설정됨" : "✘ 없음"}`)
  console.log(`${"─".repeat(60)}\n`)

  const results = []

  for (const t of TESTS) {
    process.stdout.write(`  ${YELLOW}⏳${RESET} ${t.label} ... `)
    const start = Date.now()
    try {
      const res = await t.tool.handler(t.input)
      const text = res.content[0]?.text ?? ""
      const ms = Date.now() - start
      const ok = !res.isError && t.check(text)

      if (ok) {
        console.log(`${GREEN}✅ OK${RESET} (${ms}ms)`)
        const preview = text.split("\n")[0]?.slice(0, 70)
        console.log(`     ${YELLOW}↳${RESET} ${preview}`)
      } else {
        console.log(`${RED}❌ FAIL${RESET} (${ms}ms)`)
        console.log(`     ${RED}↳${RESET} ${text.slice(0, 120)}`)
      }
      results.push({ label: t.label, ok, ms })
    } catch (err) {
      const ms = Date.now() - start
      console.log(`${RED}❌ ERROR${RESET} (${ms}ms)`)
      console.log(`     ${RED}↳${RESET} ${err.message}`)
      results.push({ label: t.label, ok: false, ms, err: err.message })
    }
    console.log()
  }

  const passed = results.filter((r) => r.ok).length
  const failed = results.length - passed
  console.log(`${"─".repeat(60)}`)
  console.log(`${BOLD}결과: ${GREEN}${passed}개 성공${RESET}${BOLD} / ${RED}${failed}개 실패${RESET} (총 ${results.length}개)`)

  if (failed > 0) {
    console.log(`\n${RED}실패 도구:${RESET}`)
    results.filter((r) => !r.ok).forEach((r) => {
      console.log(`  ✘ ${r.label}${r.err ? ` — ${r.err}` : ""}`)
    })
  }
  console.log()
}

runAll().catch(console.error)
