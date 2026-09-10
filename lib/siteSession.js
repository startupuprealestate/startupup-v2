// Firebase's first auth observer event arrives AFTER persisted credentials restore.
// Never start an anonymous login by inspecting currentUser during page startup.
const guestRequests = new WeakMap();

export function subscribeSiteSession({ auth, hostEmail, observeAuth, observeRole, signInGuest, onSession, onError = console.error }) {
  let disposed = false;
  let generation = 0;
  let stopRole = () => {};
  let retryTimer;
  let session = { user: null, userRole: null, userEmail: '', authReady: false };
  const publish = (changes) => {
    session = { ...session, ...changes };
    onSession(session);
  };

  const stopAuth = observeAuth(auth, (user) => {
    if (disposed) return;
    const currentGeneration = ++generation;
    stopRole();
    clearTimeout(retryTimer);
    const isCurrent = () => !disposed && generation === currentGeneration;
    const email = user && !user.isAnonymous ? String(user.email || '').toLowerCase() : '';
    publish({ user, userRole: null, userEmail: '', authReady: !email });

    if (!user) {
      // Deduplicate React Strict Mode mounts and check again before starting login.
      if (!guestRequests.has(auth)) {
        const request = Promise.resolve().then(() => {
          if (!auth.currentUser) return signInGuest(auth);
        }).catch(onError).finally(() => guestRequests.delete(auth));
        guestRequests.set(auth, request);
      }
      return;
    }
    if (!email) return;
    if (email === hostEmail.toLowerCase()) {
      publish({ userRole: 'host', userEmail: email, authReady: true });
      return;
    }

    const watchRole = () => {
      if (!isCurrent()) return;
      stopRole = observeRole(email, (role) => {
        if (!isCurrent()) return;
        clearTimeout(retryTimer);
        const allowed = role === 'admin' || role === 'host';
        publish({ userRole: allowed ? role : null, userEmail: allowed ? email : '', authReady: true });
      }, (error) => {
        if (!isCurrent()) return;
        onError(error);
        // A denied read revokes access. A transient failure must not discard an
        // already verified role for this same user or sign their account out.
        if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
          clearTimeout(retryTimer);
          publish({ userRole: null, userEmail: '', authReady: true });
        } else {
          publish({ authReady: true });
          retryTimer = setTimeout(watchRole, 5000);
        }
      });
    };
    watchRole();
  });

  return () => {
    disposed = true;
    generation += 1;
    clearTimeout(retryTimer);
    stopRole();
    stopAuth();
  };
}
