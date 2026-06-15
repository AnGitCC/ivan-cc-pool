type ResolveWorkbenchSessionIdInput = {
  requestedSessionId?: string;
  fallbackSessionId: string | null;
};

export function resolveWorkbenchSessionId({
  requestedSessionId,
  fallbackSessionId,
}: ResolveWorkbenchSessionIdInput) {
  return requestedSessionId ?? fallbackSessionId;
}

export function buildSessionWorkbenchHref(sessionId: string) {
  return `/sessions/${sessionId}`;
}
