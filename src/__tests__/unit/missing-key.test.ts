import { describe, it, expect, afterEach } from "vitest"
import { requireApiKey } from "../../lib/public-api-client.js"
import { MissingApiKeyError } from "../../types/index.js"

describe("requireApiKey", () => {
  const ORIG = process.env.TEST_KEY

  afterEach(() => {
    if (ORIG === undefined) delete process.env.TEST_KEY
    else process.env.TEST_KEY = ORIG
  })

  it("returns key when env var is set", () => {
    process.env.TEST_KEY = "my-secret"
    expect(requireApiKey("TEST_KEY", "테스트", "guide")).toBe("my-secret")
  })

  it("throws MissingApiKeyError when env var is missing", () => {
    delete process.env.TEST_KEY
    expect(() => requireApiKey("TEST_KEY", "테스트 API", "guide.url")).toThrow(
      MissingApiKeyError
    )
  })

  it("error message contains the env var name", () => {
    delete process.env.TEST_KEY
    try {
      requireApiKey("TEST_KEY", "테스트", "guide")
    } catch (e) {
      expect((e as Error).message).toContain("TEST_KEY")
    }
  })
})
