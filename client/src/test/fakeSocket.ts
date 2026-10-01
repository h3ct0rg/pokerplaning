import type { AppSocket } from '../lib/socket';

type Handler = (...args: any[]) => void;

/** Socket falso mínimo para probar componentes sin servidor. */
export class FakeSocket {
  connected = true;
  active = true;
  emitted: { event: string; args: any[] }[] = [];
  /** Respuesta automática a eventos con ack: event -> payload de ack. */
  responders: Record<string, (...args: any[]) => any> = {};
  private handlers = new Map<string, Set<Handler>>();
  private ioHandlers = new Map<string, Set<Handler>>();

  io = {
    on: (ev: string, h: Handler) => this.add(this.ioHandlers, ev, h),
    off: (ev: string, h: Handler) => this.ioHandlers.get(ev)?.delete(h),
  };

  private add(map: Map<string, Set<Handler>>, ev: string, h: Handler) {
    if (!map.has(ev)) map.set(ev, new Set());
    map.get(ev)!.add(h);
  }

  on(ev: string, h: Handler) {
    this.add(this.handlers, ev, h);
    return this;
  }
  off(ev: string, h: Handler) {
    this.handlers.get(ev)?.delete(h);
    return this;
  }
  connect() {
    return this;
  }

  emit(event: string, ...args: any[]) {
    this.emitted.push({ event, args });
    const ack = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;
    const responder = this.responders[event];
    if (ack && responder) ack(responder(...args.slice(0, -1)));
    return this;
  }

  timeout(_ms: number) {
    return {
      emit: (event: string, ...args: any[]) => {
        const ack = args[args.length - 1] as Handler;
        this.emitted.push({ event, args });
        const responder = this.responders[event];
        if (responder) ack(null, responder(...args.slice(0, -1)));
      },
    };
  }

  /** Simula un evento del servidor o de conexión. */
  serverEmit(ev: string, ...args: any[]) {
    for (const h of [...(this.handlers.get(ev) ?? [])]) h(...args);
  }

  count(event: string) {
    return this.emitted.filter((e) => e.event === event).length;
  }

  asSocket(): AppSocket {
    return this as unknown as AppSocket;
  }
}
