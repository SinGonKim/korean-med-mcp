import { describe, it, expect } from "vitest"
import { extractItems } from "../../lib/public-api-client.js"

describe("extractItems", () => {
  it("extracts array of items from standard response", () => {
    const data = {
      response: {
        body: {
          items: {
            item: [{ yadmNm: "강남병원" }, { yadmNm: "서초의원" }],
          },
        },
      },
    }
    const items = extractItems(data)
    expect(items).toHaveLength(2)
    expect(items[0].yadmNm).toBe("강남병원")
  })

  it("wraps single item in array", () => {
    const data = {
      response: {
        body: {
          items: {
            item: { yadmNm: "단일병원" },
          },
        },
      },
    }
    const items = extractItems(data)
    expect(items).toHaveLength(1)
  })

  it("returns empty array when items is null", () => {
    const data = { response: { body: { items: null } } }
    expect(extractItems(data)).toEqual([])
  })

  it("returns empty array for malformed response", () => {
    expect(extractItems(null)).toEqual([])
    expect(extractItems({})).toEqual([])
  })
})
