/**
 * User roles and permissions utilities
 * Controls access to different parts of the application based on user email
 */

export type UserRole = 'admin' | 'viewer';

/**
 * Admin users - Full access to all features
 */
const ADMIN_EMAILS = [
  'patricio.passtor@desasa.com.ar',
];

/**
 * Determines if a user has admin role based on their email
 */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Gets the user role based on their email
 */
export function getUserRole(email?: string | null): UserRole {
  return isAdmin(email) ? 'admin' : 'viewer';
}

/**
 * Checks if a user can access a specific route
 */
export function canAccessRoute(email?: string | null, route?: string): boolean {
  if (!route) return false;

  // Admins can access everything
  if (isAdmin(email)) return true;

  // Viewers can only access the phones report page
  const allowedViewerRoutes = [
    '/reports/phones',
    '/login',
  ];

  return allowedViewerRoutes.some(allowedRoute =>
    route === allowedRoute || route.startsWith(allowedRoute + '/')
  );
}

/**
 * Gets navigation items filtered by user role
 */
export function getNavigationForUser(email?: string | null) {
  const role = getUserRole(email);

  // Admin sees all navigation items
  if (role === 'admin') {
    return 'all';
  }

  // Viewer only sees phones report
  return 'reports-only';
}
