// JWT Utility Functions for Multi-Tenant Authentication
// ============================================================

import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-me"
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET)

export interface UserPayload {
    user_id: string
    email: string
    role: "admin" | "employer_admin" | "employer_user"
    tenant_id: string | null
    tenant_name?: string
    [key: string]: any // Allow extra claims
}

/**
 * Create a JWT token for a user
 */
export async function createToken(payload: UserPayload): Promise<string> {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(SECRET_KEY)
}

/**
 * Verify and decode a JWT token
 * Returns null if invalid or expired
 */
export async function verifyToken(token: string): Promise<UserPayload | null> {
    try {
        const { payload } = await jwtVerify(token, SECRET_KEY)
        return payload as UserPayload
    } catch (error) {
        console.error("[Auth] Token verification failed:", error)
        return null
    }
}

/**
 * Hash a password using Node's crypto (bcrypt alternative for quick setup)
 * For production, use bcrypt!
 */
export async function hashPassword(password: string): Promise<string> {
    const crypto = await import("crypto")
    const salt = crypto.randomBytes(16).toString("hex")
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
    return `${salt}:${hash}`
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const crypto = await import("crypto")
    const [salt, hash] = storedHash.split(":")
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex")
    return hash === verifyHash
}
