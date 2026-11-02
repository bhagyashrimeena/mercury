declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    MERCURY_ADMIN_EMAIL?: string;
    MERCURY_SITE_ORIGIN?: string;
    MERCURY_PUBLIC_LAUNCH?: string;
    BUCKET?: R2Bucket;
  }
}
