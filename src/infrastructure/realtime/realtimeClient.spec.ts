import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRealtimeClient } from './realtimeClient';

type SocketHandler = (() => void) | ((event: { data: string }) => void) | null;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  onopen: SocketHandler = null;
  onmessage: SocketHandler = null;
  onerror: SocketHandler = null;
  onclose: SocketHandler = null;
  readonly sent: string[] = [];

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) {
      return;
    }
    this.readyState = FakeWebSocket.CLOSED;
    const handler = this.onclose;
    if (typeof handler === 'function') {
      handler();
    }
  }

  openNow(): void {
    this.readyState = FakeWebSocket.OPEN;
    const handler = this.onopen;
    if (typeof handler === 'function') {
      handler();
    }
  }
}

describe('createRealtimeClient', () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.stubGlobal('WebSocket', originalWebSocket);
    vi.useRealTimers();
  });

  it('does not reconnect when open() supersedes a previous socket', async () => {
    const client = createRealtimeClient({
      url: 'ws://test/realtime',
      token: async () => 'tok',
      logger: {
        child: () => ({
          warn: vi.fn(),
          info: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        }),
      } as never,
      onReconnected: vi.fn(),
    });

    client.connect('space-1', ['scene', 'timeline']);
    await Promise.resolve();
    expect(FakeWebSocket.instances).toHaveLength(1);
    FakeWebSocket.instances[0]?.openNow();

    client.connect('space-1', ['scene', 'timeline']);
    await Promise.resolve();
    expect(FakeWebSocket.instances).toHaveLength(2);
    FakeWebSocket.instances[1]?.openNow();

    await vi.advanceTimersByTimeAsync(5_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});
