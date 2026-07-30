// Lets non-component modules (apiClient's axios interceptor, which can't call
// useAuth()) trigger a full logout + user-facing message from AuthContext,
// which owns the actual session state and storage.
type SessionInvalidHandler = (message?: string) => void;

let handler: SessionInvalidHandler = () => {};

export function setSessionInvalidHandler(fn: SessionInvalidHandler) {
  handler = fn;
}

export function notifySessionInvalid(message?: string) {
  handler(message);
}
