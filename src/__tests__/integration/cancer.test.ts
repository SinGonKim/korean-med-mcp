import { describe, it, expect } from "vitest"
const SKIP = !process.env.CANCER_API_KEY

describe.skipIf(SKIP)("국가암정보센터 API integration", () => {
  it("cancer.do returns cancer type list", async () => {
    const key = process.env.CANCER_API_KEY!
    const res = await fetch(`https://www.cancer.go.kr/api/cancer.do?Key=${key}`)
    expect(res.ok).toBe(true)
    const json = await res.json() as { result?: unknown[] }
    expect(Array.isArray(json.result)).toBe(true)
    expect(json.result!.length).toBeGreaterThan(0)
  }, 15_000)

  it("faq.do returns FAQ list", async () => {
    const key = process.env.CANCER_API_KEY!
    const res = await fetch(`https://www.cancer.go.kr/api/faq.do?Key=${key}`)
    expect(res.ok).toBe(true)
    const json = await res.json() as { result?: unknown[] }
    expect(Array.isArray(json.result)).toBe(true)
  }, 15_000)

  it("dictionaryworks.do returns dictionary items", async () => {
    const key = process.env.CANCER_API_KEY!
    const res = await fetch(`https://www.cancer.go.kr/api/dictionaryworks.do?Key=${key}`)
    expect(res.ok).toBe(true)
    const json = await res.json() as { result?: unknown[] }
    expect(Array.isArray(json.result)).toBe(true)
  }, 15_000)
})
