import { setPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "./firebase";

let persistenceReadyPromise = null;

/**
 * Idempotent: safe to call every time before a login attempt.
 * Returns the same in-flight/completed promise on repeated calls.
 */
export function ensureSessionPersistence() {
  if (!persistenceReadyPromise) {
    persistenceReadyPromise = setPersistence(auth, browserSessionPersistence);
  }
  return persistenceReadyPromise;
}