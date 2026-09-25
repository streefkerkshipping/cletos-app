// Kopieer naar config.js (staat in .gitignore). De anon-sleutel is publiek: de database beschermt zichzelf met RLS.
window.KRING_CONFIG = {
  opslag: 'supabase',                 // 'supabase' of 'mock' (alleen voor tests via tests/dev-server.mjs)
  supabaseUrl: 'https://<project>.supabase.co',
  supabaseAnonKey: '<anon of publishable key>',
  verversSeconden: 5,
};
