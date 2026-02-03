export const APPROVAL_TOPIC0 =
  '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

export function isApprovalOnlyFromEventNames(logs: Array<{ eventName?: string }>) {
  if (!logs || logs.length === 0) return false;
  return logs.every((l) => (l.eventName || '').toLowerCase() === 'approval');
}

export function isApprovalOnlyFromTopics(logs: Array<{ topics?: string[] }>) {
  if (!logs || logs.length === 0) return false;
  return logs.every((l) => (l.topics?.[0] || '').toLowerCase() === APPROVAL_TOPIC0);
}

export function extractUserFromEventArgs(args: Record<string, any>, userFieldPaths: string[]) {
  for (const p of userFieldPaths) {
    if (!p) continue;
    if (p in args && typeof args[p] === 'string') return args[p];
  }

  for (const p of userFieldPaths) {
    const parts = p.split('.');
    let cur: any = args;
    let ok = true;
    for (const part of parts) {
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch && cur && arrayMatch[1] in cur) {
        const arrVal = cur[arrayMatch[1]];
        const idx = Number(arrayMatch[2]);
        cur = Array.isArray(arrVal) ? arrVal[idx] : undefined;
      } else if (cur && part in cur) {
        cur = cur[part];
      } else {
        ok = false;
        break;
      }
    }
    if (ok && typeof cur === 'string') return cur;
  }

  if (Array.isArray(args)) {
    for (const p of userFieldPaths) {
      const idx = Number(p);
      if (!Number.isNaN(idx) && typeof args[idx] === 'string') return args[idx];
    }
  }
  return null;
}

export function extractUserFromLogHeuristic(topics: string[] | null, data: string | null, userFieldPaths: string[]) {
  const addrRegex = /0x[0-9a-fA-F]{40}/g;
  const lowered = userFieldPaths.map((p) => p.toLowerCase());

  if (topics && topics.length > 1) {
    for (const p of lowered) {
      const m = p.match(/^topic(\d)$/);
      if (m) {
        const idx = Number(m[1]);
        const t = topics[idx];
        if (t) {
          const m2 = t.match(/0*([0-9a-fA-F]{40})$/);
          if (m2) return '0x' + m2[1].toLowerCase();
        }
      }
    }

    for (let i = 1; i < topics.length; i++) {
      const t = topics[i];
      if (!t) continue;
      const m = t.match(/0*([0-9a-fA-F]{40})$/);
      if (m) {
        const addr = '0x' + m[1].toLowerCase();
        if (
          lowered.some((k) =>
            ['from', 'to', 'owner', 'recipient', 'user', 'account', 'sender'].some((n) => k.includes(n))
          )
        ) {
          return addr;
        }
      }
    }
  }

  if (data) {
    const found = data.match(addrRegex);
    if (found && found.length > 0) return found[0].toLowerCase();
  }

  return null;
}
