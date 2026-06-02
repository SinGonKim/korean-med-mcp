export function maskSensitiveUrl(url: string): string {
  if (!url) return url
  return url.replace(
    /([?&](?:serviceKey|ServiceKey|apikey|apiKey|api_key|authKey|OC|oc)=)[^&]+/g,
    "$1***"
  )
}

export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
  retryOn?: number[]
}

const DEFAULT_TIMEOUT = 30000
const DEFAULT_RETRIES = 3
const DEFAULT_RETRY_DELAY = 1000
const DEFAULT_RETRY_ON = [429, 503, 504]

const DEFAULT_USER_AGENT =
  process.env.MED_USER_AGENT ||
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    retryOn = DEFAULT_RETRY_ON,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const headers = new Headers(fetchOptions.headers)
    if (!headers.has("user-agent")) headers.set("user-agent", DEFAULT_USER_AGENT)

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok || !retryOn.includes(response.status)) {
        return response
      }

      if (attempt < retries) {
        const delay = getRetryDelay(response, retryDelay, attempt)
        await sleep(delay)
        continue
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        if (error.name === "AbortError") {
          lastError = new Error(`Request timeout after ${timeout}ms for ${maskSensitiveUrl(url)}`)
        } else {
          const masked = maskSensitiveUrl(error.message)
          lastError = masked !== error.message ? new Error(masked) : error
        }
      }

      if (attempt < retries) {
        const delay = getRetryDelay(null, retryDelay, attempt)
        await sleep(delay)
        continue
      }
    }
  }

  throw lastError || new Error("Request failed after retries")
}

function getRetryDelay(response: Response | null, retryDelay: number, attempt: number): number {
  if (response) {
    const retryAfter = response.headers.get("Retry-After")
    if (retryAfter) {
      const seconds = Number(retryAfter)
      if (!isNaN(seconds) && seconds > 0) return seconds * 1000
    }
  }
  const baseDelay = retryDelay * Math.pow(2, attempt)
  return baseDelay + Math.random() * baseDelay * 0.5
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
