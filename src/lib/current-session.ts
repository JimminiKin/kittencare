export interface SessionContext {
  userId: string;
  householdId: string;
}

let _session: SessionContext | null = null;

export function setSessionContext(ctx: SessionContext | null): void {
  _session = ctx;
}

export function getSessionContext(): SessionContext {
  if (!_session) throw new Error("No active session");
  return _session;
}

export function hasSession(): boolean {
  return _session !== null;
}
