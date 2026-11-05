// Environment checks shared by browser modules. Pure, so they run under `node --test`.

export const PRODUCTION_HOST = 'csp-generator.shakiltech.com';

// Keeps local development and E2E runs out of the production analytics.
export function analyticsEnabled(hostname, search) {
  return hostname === PRODUCTION_HOST || new URLSearchParams(search).get('analytics') === 'on';
}
