// JWT Utility Functions for Multi-Tenant Authentication
// ============================================================

import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-me"

export interface UserPayload {
    user_id: string
    email: string
    role: "admin" | "employer_admin" | "employer_user"
    tenant_id: string | null
    tenant_name?: string
}

/**
 * Create a JWT token for a user
 */
export function createToken(payload: UserPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: "7d", // 7 days
    })
}

/**
 * Verify and decode a JWT token
 * Returns null if invalid or expired
 */
export function verifyToken(token: string): UserPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as UserPayload
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
