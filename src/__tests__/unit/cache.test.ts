import { describe, it, expect, beforeEach } from "vitest"
import { TTLCache } from "../../lib/cache.js"

describe("TTLCache", () => {
  let cache: TTLCache<string, string>

  beforeEach(() => {
    cache = new TTLCache()
  })

  it("returns value for non-expired entries", () => {
    cache.set("key", "value", 60_000)
    expect(cache.get("key")).toBe("value")
  })

  it("returns undefined for expired entries", async () => {
    cache.set("key", "value", 10)
    await new Promise((r) => setTimeout(r, 20))
    expect(cache.get("key")).toBeUndefined()
  })

  it("has() returns true for valid entries", () => {
    cache.set("key", "value", 60_000)
    expect(cache.has("key")).toBe(true)
  })

  it("has() returns false for expired entries", async () => {
    cache.set("key", "value", 10)
    await new Promise((r) => setTimeout(r, 20))
    expect(cache.has("key")).toBe(false)
  })

  it("delete() removes entry", () => {
    cache.set("key", "value", 60_000)
    cache.delete("key")
    expect(cache.get("key")).toBeUndefined()
  })

  it("clear() removes all entries", () => {
    cache.set("a", "1", 60_000)
    cache.set("b", "2", 60_000)
    cache.clear()
    expect(cache.get("a")).toBeUndefined()
    expect(cache.get("b")).toBeUndefined()
  })
})
