import { describe, it, expect } from "vitest"
import { maskSensitiveUrl } from "../../lib/fetch-with-retry.js"

describe("maskSensitiveUrl", () => {
  it("masks serviceKey parameter", () => {
    const url = "http://apis.data.go.kr/B551182?serviceKey=SECRET123&pageNo=1"
    expect(maskSensitiveUrl(url)).toBe("http://apis.data.go.kr/B551182?serviceKey=***&pageNo=1")
  })

  it("masks OC parameter (법제처)", () => {
    const url = "https://www.law.go.kr/DRF/lawSearch.do?OC=MYKEY&target=law"
    expect(maskSensitiveUrl(url)).toBe("https://www.law.go.kr/DRF/lawSearch.do?OC=***&target=law")
  })

  it("returns unchanged url when no sensitive params", () => {
    const url = "https://example.com?query=의료법&page=1"
    expect(maskSensitiveUrl(url)).toBe(url)
  })

  it("handles empty string", () => {
    expect(maskSensitiveUrl("")).toBe("")
  })
})
