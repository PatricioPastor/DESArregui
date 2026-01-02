/**
 * User roles and permissions utilities
 * Controls access to different parts of the application based on user email
 *
 * Principles applied:
 * - Single Responsibility: Each function has one clear purpose
 * - Open/Closed: Easy to extend with new roles without modifying existing code
 * - Liskov Substitution: Functions can be used interchangeably
 * - Interface Segregation: Clear, focused interfaces
 * - Dependency Inversion: Depends on abstractions (configs) not concrete implementations
 */

// ============================================
// Types (Interface Segregation)
// ============================================

export type UserRole = 'admin' | 'sims-viewer' | 'viewer';

export interface RouteAccess {
  readonly path: string;
  readonly allowedRoles: readonly UserRole[];
}

// ============================================
// Configuration (Single Responsibility)
// ============================================

/**
 * Admin users - Full access to all features
 */
const ADMIN_EMAILS: readonly string[] = [
  'patricio.pastor@desasa.com.ar',
  'santiago.bailez@desasa.com.ar',
  'gianfranco.petrella@desasa.com.ar',
  'leotosso@gmail.com',
] as const;

/**
 * SIMs page authorized users - Access to SIMs management
 */
const SIMS_AUTHORIZED_EMAILS: readonly string[] = [
  'patricio.pastor@desasa.com.ar',
  'leotosso@gmail.com',
  'leonardo.tosso@desasa.com.ar',
  'santiago.bailez@desasa.com.ar',
  'ayelen.ramos@edelap.com.ar',
  'bautista.ingtoledo@gmail.com',
  'carolina.muraca@edelap.com.ar',
  'cristian.sarena@edelap.com.ar',
  'diego.dangelo@desasa.com.ar',
  'fernando.carvatchi@edelap.com.ar',
  'florencia.crena@edelap.com.ar',
  'franco.vega@edensa.com.ar',
  'gustavo.magnetti@edelap.com.ar',
  'intranetg@edensa.com.ar',
  'johana.ingtoledo@gmail.com',
  'juan.coto@edelap.com.ar',
  'juan.gutierrez@edensa.com.ar',
  'juancruz.gonzalez@edensa.com.ar',
  'gestionoperativadelasareas@edensa.com.ar',
  'juancruz.merlo@desasa.com.ar',
  'karina.molina@edelap.com.ar',
  'lautaro.crena@edelap.com.ar',
  'mario.diaz@edelap.com.ar',
  'oscar.rojas@edensa.com.ar',
  'sergio.lemos@desasa.com.ar',
] as const;

/**
 * Route access configuration
 */
const ROUTE_ACCESS_CONFIG: readonly RouteAccess[] = [
  { path: '/', allowedRoles: ['admin'] },
  { path: '/soti', allowedRoles: ['admin'] },
  { path: '/stock', allowedRoles: ['admin'] },
  { path: '/sims', allowedRoles: ['admin', 'sims-viewer'] },
  { path: '/reports/phones', allowedRoles: ['admin', 'viewer'] },
  { path: '/admin/users', allowedRoles: ['admin'] },
] as const;

// ============================================
// Email Utilities (Single Responsibility)
// ============================================

/**
 * Normalizes an email address to lowercase for consistent comparison
 */
const normalizeEmail = (email?: string | null): string => {
  if (!email) return '';
  return email.toLowerCase().trim();
};

/**
 * Checks if an email exists in a list of emails
 */
const isEmailInList = (
  email: string,
  emailList: readonly string[]
): boolean => {
  if (!email) return false;
  return emailList.includes(email);
};

// ============================================
// Role Checking (Single Responsibility)
// ============================================

/**
 * Determines if a user has admin role based on their email
 * @returns true if user is an admin
 */
export const isAdmin = (email?: string | null): boolean => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  return isEmailInList(normalizedEmail, ADMIN_EMAILS);
};

/**
 * Determines if a user can access SIMs page
 * @returns true if user is authorized for SIMs
 */
export const canAccessSims = (email?: string | null): boolean => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  return isEmailInList(normalizedEmail, SIMS_AUTHORIZED_EMAILS);
};

/**
 * Gets the user role based on their email
 * Uses early returns for clarity
 */
export const getUserRole = (email?: string | null): UserRole => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return 'viewer';

  // Early return for admin
  if (isAdmin(normalizedEmail)) return 'admin';

  // Early return for SIMs viewer
  if (canAccessSims(normalizedEmail)) return 'sims-viewer';

  // Default role
  return 'viewer';
};

// ============================================
// Route Access (Single Responsibility)
// ============================================

/**
 * Finds route configuration for a given path
 */
const findRouteConfig = (route: string): RouteAccess | undefined => {
  if (!route) return undefined;

  return ROUTE_ACCESS_CONFIG.find(
    (config) => route === config.path || route.startsWith(`${config.path}/`)
  );
};

/**
 * Checks if a user role can access a specific route
 */
const canRoleAccessRoute = (
  role: UserRole,
  routeConfig?: RouteAccess
): boolean => {
  // If no route config, allow access (public route)
  if (!routeConfig) return true;

  return routeConfig.allowedRoles.includes(role);
};

/**
 * Checks if a user can access a specific route
 * @param email User's email address
 * @param route Route path to check
 * @returns true if user can access the route
 */
export const canAccessRoute = (
  email?: string | null,
  route?: string
): boolean => {
  if (!route) return false;

  const role = getUserRole(email);
  const routeConfig = findRouteConfig(route);

  return canRoleAccessRoute(role, routeConfig);
};

// ============================================
// Navigation Utilities (Single Responsibility)
// ============================================

export interface NavigationItem {
  label: string;
  href: string;
  icon?: any;
  current?: boolean;
}

/**
 * Filters navigation items based on user's role
 */
export const filterNavigationByRole = (
  items: NavigationItem[],
  email?: string | null
): NavigationItem[] => {
  if (!items || items.length === 0) return [];

  const role = getUserRole(email);

  return items.filter((item) => {
    const routeConfig = findRouteConfig(item.href);
    return canRoleAccessRoute(role, routeConfig);
  });
};

/**
 * Gets navigation items filtered by user role
 * @deprecated Use filterNavigationByRole instead
 */
export const getNavigationForUser = (email?: string | null): 'all' | 'reports-only' | 'sims-only' => {
  const role = getUserRole(email);

  if (role === 'admin') return 'all';
  if (role === 'sims-viewer') return 'sims-only';
  return 'reports-only';
};

// ============================================
// Authorization Error Messages
// ============================================

/**
 * Gets a human-readable error message for unauthorized access
 */
export const getUnauthorizedMessage = (
  email?: string | null,
  route?: string
): string => {
  if (!email) return 'Authentication required';
  if (!route) return 'Invalid route';

  const role = getUserRole(email);

  if (role === 'viewer') {
    return 'You do not have permission to access this page. Contact your administrator.';
  }

  if (role === 'sims-viewer') {
    return 'Your access is limited to the SIMs page only.';
  }

  return 'Access denied';
};
