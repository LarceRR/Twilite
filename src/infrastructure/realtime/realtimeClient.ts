import { realtimeConfig } from '@/app/config/constants';
import type { RealtimeChannel, RealtimeServerMessageDto } from '@/shared/contracts';
import type { Logger } from '@/shared/logger';

export type RealtimeStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export type RealtimeClient = {
  connect(spaceId: string, channels: readonly RealtimeChannel[]): void;
  disconnect(): void;
  onMessage(listener: (message: RealtimeServerMessageDto) => void): () => void;
  onStatus(listener: (status: RealtimeStatus) => void): () => void;
  status(): RealtimeStatus;
};

function isServerMessage(value: unknown): value is RealtimeServerMessageDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { type?: unknown; spaceId?: unknown };

  return (
    typeof candidate.type === 'string' &&
    (candidate.spaceId === undefined || typeof candidate.spaceId === 'string')
  );
}

/** Realtime only delivers changes; HTTP remains the source of truth. */
export function createRealtimeClient(options: {
  readonly url: string;
  readonly token: () => Promise<string | null>;
  readonly logger: Logger;
  readonly onReconnected: () => void;
}): RealtimeClient {
  const log = options.logger.child('realtime');
  const messageListeners = new Set<(message: RealtimeServerMessageDto) => void>();
  const statusListeners = new Set<(status: RealtimeStatus) => void>();

  let socket: WebSocket | null = null;
  let status: RealtimeStatus = 'idle';
  let attempts = 0;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let subscription: { spaceId: string; channels: readonly RealtimeChannel[] } | null = null;
  let hadOpenConnection = false;
  let shouldNotifyReconnect = false;
  let intentionallyClosed = false;
  let lastConnectAttemptAt = 0;

  const setStatus = (next: RealtimeStatus): void => {
    if (status === next) {
      return;
    }
    status = next;
    for (const listener of statusListeners) {
      listener(next);
    }
  };

  const stopTimers = (): void => {
    if (heartbeat !== null) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = (): void => {
    if (intentionallyClosed || subscription === null) {
      return;
    }
    const delay = Math.min(
      realtimeConfig.reconnectBaseDelayMs * 2 ** attempts,
      realtimeConfig.reconnectMaxDelayMs,
    );
    attempts += 1;
    shouldNotifyReconnect = hadOpenConnection && Date.now() - lastConnectAttemptAt > 1000;
    setStatus('reconnecting');
    reconnectTimer = setTimeout(() => {
      if (subscription !== null) {
        void open(subscription.spaceId, subscription.channels);
      }
    }, delay);
  };

  function detachSocket(target: WebSocket | null): void {
    if (target === null) {
      return;
    }
    // Drop handlers before close so a superseded socket cannot schedule reconnect.
    target.onopen = null;
    target.onmessage = null;
    target.onerror = null;
    target.onclose = null;
    if (target.readyState === WebSocket.OPEN || target.readyState === WebSocket.CONNECTING) {
      target.close();
    }
  }

  async function open(spaceId: string, channels: readonly RealtimeChannel[]): Promise<void> {
    stopTimers();
    const previous = socket;
    socket = null;
    detachSocket(previous);

    const token = await options.token();
    if (intentionallyClosed || subscription?.spaceId !== spaceId) {
      return;
    }

    const url = token === null ? options.url : `${options.url}?token=${encodeURIComponent(token)}`;
    setStatus(hadOpenConnection ? 'reconnecting' : 'connecting');
    const next = new WebSocket(url);
    socket = next;

    next.onopen = () => {
      if (socket !== next) {
        return;
      }
      attempts = 0;
      lastConnectAttemptAt = Date.now();
      setStatus('open');
      next.send(JSON.stringify({ type: 'subscribe', spaceId, channels }));
      if (shouldNotifyReconnect) {
        options.onReconnected();
      }
      shouldNotifyReconnect = false;
      hadOpenConnection = true;
      heartbeat = setInterval(() => {
        if (next.readyState === WebSocket.OPEN) {
          next.send(JSON.stringify({ type: 'ping' }));
        }
      }, realtimeConfig.heartbeatIntervalMs);
    };

    next.onmessage = (event) => {
      if (socket !== next || typeof event.data !== 'string') {
        return;
      }
      try {
        const parsed: unknown = JSON.parse(event.data);
        if (!isServerMessage(parsed)) {
          return;
        }
        for (const listener of messageListeners) {
          listener(parsed);
        }
      } catch (error) {
        log.warn('Некорректное realtime-сообщение', { error: String(error) });
      }
    };

    next.onerror = () => {
      if (socket !== next) {
        return;
      }
      log.warn('Ошибка realtime-соединения');
    };

    next.onclose = () => {
      if (socket !== next) {
        return;
      }
      stopTimers();
      socket = null;
      if (!intentionallyClosed) {
        scheduleReconnect();
        return;
      }
      setStatus('closed');
    };
  }

  return {
    connect(spaceId, channels) {
      intentionallyClosed = false;
      subscription = { spaceId, channels };
      void open(spaceId, channels);
    },
    disconnect() {
      intentionallyClosed = true;
      subscription = null;
      stopTimers();
      detachSocket(socket);
      socket = null;
      setStatus('closed');
    },
    onMessage(listener) {
      messageListeners.add(listener);
      return () => {
        messageListeners.delete(listener);
      };
    },
    onStatus(listener) {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
    status() {
      return status;
    },
  };
}
