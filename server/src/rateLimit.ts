// Limitador por clave (IP) de ventana fija. Puro y testeable con fake timers (usa Date.now por defecto).
export interface RateLimiterOptions {
  limit: number; // fallos permitidos por ventana; el siguiente intento queda bloqueado
  windowMs: number;
  now?: () => number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private entries = new Map<string, Entry>();
  private now: () => number;
  private lastPrune = 0;

  constructor(private opts: RateLimiterOptions) {
    this.now = opts.now ?? Date.now;
  }

  /** true si la clave superó el límite en la ventana vigente. */
  isLimited(key: string): boolean {
    const e = this.entries.get(key);
    if (!e) return false;
    if (e.resetAt <= this.now()) {
      this.entries.delete(key);
      return false;
    }
    return e.count >= this.opts.limit;
  }

  /** Claves registradas (incluye caducadas aún no purgadas). */
  get size(): number {
    return this.entries.size;
  }

  /** Registra un fallo para la clave. Purga las caducadas como mucho una vez por ventana. */
  hit(key: string): void {
    const t = this.now();
    if (t - this.lastPrune >= this.opts.windowMs) {
      this.prune(t);
      this.lastPrune = t;
    }
    const e = this.entries.get(key);
    if (!e || e.resetAt <= t) this.entries.set(key, { count: 1, resetAt: t + this.opts.windowMs });
    else e.count++;
  }

  private prune(t: number): void {
    for (const [k, e] of this.entries) if (e.resetAt <= t) this.entries.delete(k);
  }
}
