declare namespace Express {
  export interface Request {
    /** Set from the gateway-verified X-User-Id header. */
    userId?: string;
  }
}
