/**
 * Next.js middleware: переиспользует логику из proxy.ts (CSP, CSRF, rate limit).
 */
import { proxy, config } from "@/proxy";

export default proxy;
export { config };
