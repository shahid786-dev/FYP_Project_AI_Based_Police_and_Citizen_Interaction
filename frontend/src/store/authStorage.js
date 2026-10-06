const AUTH_STORAGE_KEY = 'pakverify_auth';
const ACTIVE_ROLE_KEY = 'pakverify_active_role';

const VALID_ROLES = new Set([
  'CITIZEN',
  'POLICE_STAFF',
  'POLICE_AUTHORITY',
  'SUPER_ADMIN',
]);

function getRoleFromPath(pathname) {
  if (pathname === '/login' || pathname.startsWith('/citizen/')) return 'CITIZEN';
  if (pathname === '/login/staff' || pathname.startsWith('/staff/')) return 'POLICE_STAFF';
  if (pathname.startsWith('/authority/')) return 'POLICE_AUTHORITY';
  if (pathname.startsWith('/admin/')) return 'SUPER_ADMIN';
  return null;
}

function readSessions() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    if (stored?.sessions && typeof stored.sessions === 'object') {
      return stored.sessions;
    }
    if (VALID_ROLES.has(stored?.role) && (stored.access || stored.token)) {
      return { [stored.role]: stored };
    }
  } catch {
    return {};
  }
  return {};
}

export function getActiveRole() {
  const roleFromRoute = getRoleFromPath(window.location.pathname);
  if (roleFromRoute) {
    setActiveRole(roleFromRoute);
    return roleFromRoute;
  }

  try {
    const role = sessionStorage.getItem(ACTIVE_ROLE_KEY);
    return VALID_ROLES.has(role) ? role : null;
  } catch {
    return null;
  }
}

export function setActiveRole(role) {
  if (!VALID_ROLES.has(role)) return;
  sessionStorage.setItem(ACTIVE_ROLE_KEY, role);
}

export function getStoredAuth(role = getActiveRole()) {
  if (!role || !VALID_ROLES.has(role)) return null;
  const stored = readSessions()[role];
  return stored?.role === role && (stored.access || stored.token) ? stored : null;
}

export function saveStoredAuth(auth) {
  if (!VALID_ROLES.has(auth?.role) || !auth.access) return;
  const sessions = readSessions();
  sessions[auth.role] = auth;
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ sessions }));
  setActiveRole(auth.role);
}

export function clearStoredAuth(role = getActiveRole()) {
  if (!role || !VALID_ROLES.has(role)) return;
  const sessions = readSessions();
  delete sessions[role];

  if (Object.keys(sessions).length) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ sessions }));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  if (sessionStorage.getItem(ACTIVE_ROLE_KEY) === role) {
    sessionStorage.removeItem(ACTIVE_ROLE_KEY);
  }
}
