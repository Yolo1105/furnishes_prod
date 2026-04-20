-- Rate limiting now uses lib/rate-limit.ts (Upstash / in-memory); DB table unused.
DROP TABLE IF EXISTS "RateLimitEvent";
