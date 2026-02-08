export type IncidentSseOptions = {
  baseUrl: string;
  apiKey: string;
  params?: Record<string, string | number | undefined>;
  onReady?: (payload: any) => void;
  onIncidents: (payload: { cursor: string; items: any[] }) => void;
  onError?: (error: unknown) => void;
  reconnectMs?: number;
};

export type IncidentWsOptions = {
  wsUrl: string;
  apiKey: string;
  subscribe?: Record<string, unknown>;
  onReady?: (payload: any) => void;
  onIncidents: (payload: { cursor: string; items: any[] }) => void;
  onError?: (error: unknown) => void;
  reconnectMs?: number;
};

function withQuery(url: string, params: Record<string, string>) {
  const u = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value) u.searchParams.set(key, value);
  }
  return u.toString();
}

export function createIncidentSseClient(options: IncidentSseOptions) {
  let es: EventSource | null = null;
  let closed = false;
  let cursor = "";
  const reconnectMs = Math.max(500, options.reconnectMs ?? 1500);

  const connect = () => {
    if (closed) return;
    const query: Record<string, string> = {
      apiKey: options.apiKey,
      ...(options.params
        ? Object.fromEntries(
            Object.entries(options.params)
              .filter(([, value]) => value !== undefined)
              .map(([k, v]) => [k, String(v)])
          )
        : {}),
    };
    if (cursor) query.updatedAfter = cursor;

    es = new EventSource(withQuery(`${options.baseUrl}/api/incidents/stream`, query));

    es.addEventListener("ready", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (payload.cursor) cursor = String(payload.cursor);
        options.onReady?.(payload);
      } catch (err) {
        options.onError?.(err);
      }
    });

    es.addEventListener("incidents", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data);
        if (payload.cursor) cursor = String(payload.cursor);
        options.onIncidents(payload);
      } catch (err) {
        options.onError?.(err);
      }
    });

    es.addEventListener("error", () => {
      if (es) es.close();
      if (!closed) {
        setTimeout(connect, reconnectMs);
      }
    });
  };

  connect();

  return {
    close() {
      closed = true;
      es?.close();
      es = null;
    },
    getCursor() {
      return cursor;
    },
  };
}

export function createIncidentWsClient(options: IncidentWsOptions) {
  let ws: WebSocket | null = null;
  let closed = false;
  let cursor = "";
  const reconnectMs = Math.max(500, options.reconnectMs ?? 1500);

  const connect = () => {
    if (closed) return;
    const url = new URL(options.wsUrl);
    url.searchParams.set("apiKey", options.apiKey);
    if (cursor) url.searchParams.set("updatedAfter", cursor);
    ws = new WebSocket(url.toString());

    ws.onopen = () => {
      if (options.subscribe && ws) {
        ws.send(
          JSON.stringify({
            action: "subscribe",
            ...options.subscribe,
            ...(cursor ? { updatedAfter: cursor } : {}),
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data));
        if (payload.cursor) cursor = String(payload.cursor);
        if (payload.event === "ready") options.onReady?.(payload);
        if (payload.event === "incidents") options.onIncidents(payload);
      } catch (err) {
        options.onError?.(err);
      }
    };

    ws.onerror = (err) => {
      options.onError?.(err);
    };

    ws.onclose = () => {
      if (!closed) {
        setTimeout(connect, reconnectMs);
      }
    };
  };

  connect();

  return {
    close() {
      closed = true;
      ws?.close();
      ws = null;
    },
    getCursor() {
      return cursor;
    },
  };
}
