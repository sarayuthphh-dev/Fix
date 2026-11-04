declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SUPPORT_ADMIN_EMAILS?: string;
    PUBLIC_APP_ORIGIN?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    LINE_SETTINGS_KEY?: string;
    LINE_API_BASE_URL?: string;
  }
}
