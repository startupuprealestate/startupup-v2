import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeSiteSession } from '../lib/siteSession.js';

const admin = { uid: 'admin-1', email: 'Admin@Example.com', isAnonymous: false };
function harness() {
  const auth = { currentUser: null };
  const sessions = [];
  const roles = [];
  let authListener;
  let guestCalls = 0;
  const options = {
    auth, hostEmail: 'host@example.com',
    observeAuth: (_auth, callback) => { authListener = callback; return () => {}; },
    observeRole: (email, onRole, onError) => {
      const listener = { email, onRole, onError, stopped: false };
      roles.push(listener);
      return () => { listener.stopped = true; };
    },
    signInGuest: async () => { guestCalls += 1; },
    onSession: session => sessions.push(session), onError: () => {},
  };
  return {
    options, auth, roles, sessions,
    emit: user => { auth.currentUser = user; authListener(user); },
    get guestCalls() { return guestCalls; },
    get session() { return sessions.at(-1); },
  };
}

test('slow persisted admin restoration never starts an anonymous login', async () => {
  const h = harness();
  const stop = subscribeSiteSession(h.options);
  await Promise.resolve();
  assert.equal(h.guestCalls, 0);
  h.emit(admin);
  assert.equal(h.session.authReady, false);
  h.roles[0].onRole('admin');
  assert.equal(h.session.authReady, true);
  assert.equal(h.session.userRole, 'admin');
  assert.equal(h.session.userEmail, 'admin@example.com');
  assert.equal(h.guestCalls, 0);
  stop();
});

test('guest login only starts after Firebase confirms there is no saved session', async () => {
  const h = harness();
  const stop = subscribeSiteSession(h.options);
  h.emit(null);
  await Promise.resolve();
  assert.equal(h.guestCalls, 1);
  assert.equal(h.session.authReady, true);
  stop();
});

test('Strict Mode remounts deduplicate the pending guest login', async () => {
  const h = harness();
  const stop = subscribeSiteSession(h.options);
  h.emit(null);
  stop();
  const stopAgain = subscribeSiteSession(h.options);
  h.emit(null);
  await Promise.resolve();
  assert.equal(h.guestCalls, 1);
  stopAgain();
});

test('a queued guest request cannot overwrite a Google login', async () => {
  const h = harness();
  const stop = subscribeSiteSession(h.options);
  h.emit(null);
  h.emit(admin);
  await Promise.resolve();
  assert.equal(h.guestCalls, 0);
  stop();
});

test('stale role responses cannot authorize another account or undo logout', () => {
  const h = harness();
  const stop = subscribeSiteSession(h.options);
  h.emit(admin);
  const previous = h.roles[0];
  h.emit({ uid: 'guest', isAnonymous: true });
  previous.onRole('admin');
  assert.equal(previous.stopped, true);
  assert.equal(h.session.userRole, null);
  assert.equal(h.session.user.uid, 'guest');
  stop();
  previous.onRole('host');
  assert.equal(h.session.userRole, null);
});

test('temporary read errors retain verified access, but explicit denial revokes it', () => {
  const h = harness();
  const stop = subscribeSiteSession(h.options);
  h.emit(admin);
  h.roles[0].onRole('admin');
  h.roles[0].onError({ code: 'unavailable' });
  assert.equal(h.session.userRole, 'admin');
  assert.equal(h.session.user, admin);
  h.roles[0].onError({ code: 'permission-denied' });
  assert.equal(h.session.userRole, null);
  stop();
});

test('role suspension takes effect without reloading and does not sign out Firebase', () => {
  const h = harness();
  const stop = subscribeSiteSession(h.options);
  h.emit(admin);
  h.roles[0].onRole('admin');
  h.roles[0].onRole('pending');
  assert.equal(h.session.userRole, null);
  assert.equal(h.session.user, admin);
  assert.equal(h.guestCalls, 0);
  stop();
});

test('host restoration does not depend on a Firestore role request', () => {
  const h = harness();
  const stop = subscribeSiteSession(h.options);
  h.emit({ uid: 'host', email: 'HOST@example.com', isAnonymous: false });
  assert.equal(h.session.userRole, 'host');
  assert.equal(h.session.authReady, true);
  assert.equal(h.roles.length, 0);
  stop();
});
