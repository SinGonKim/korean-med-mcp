interface CacheEntry<V> {
  value: V
  expiresAt: number
}

export class TTLCache<K, V> {
  private store = new Map<K, CacheEntry<V>>()

  set(key: K, value: V, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value
  }

  has(key: K): boolean {
    return this.get(key) !== undefined
  }

  delete(key: K): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

// TTL constants (ms)
export const TTL = {
  ER_STATUS: 2 * 60 * 1000,           // 2분 — 응급실 실시간
  HOSPITAL: 6 * 60 * 60 * 1000,       // 6시간 — 병원 정보
  PHARMACY: 6 * 60 * 60 * 1000,       // 6시간 — 약국 정보
  DRUG: 6 * 60 * 60 * 1000,           // 6시간 — 의약품 정보
  MEDICAL_LAW: 24 * 60 * 60 * 1000,   // 24시간 — 법령 조문
}
