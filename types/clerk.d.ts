export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "BUYER" | "SELLER" | "ADMIN"
    }
  }
}
