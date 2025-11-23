import { NextRequest, NextResponse } from "next/server"
import { hashPassword } from "@/lib/auth"

/**
 * Helper API to generate password hashes
 * Usage: POST /api/admin/hash-password with { "password": "your-password" }
 */
export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json()

        if (!password) {
            return NextResponse.json({ error: "Password is required" }, { status: 400 })
        }

        const hash = await hashPassword(password)

        return NextResponse.json({
            password,
            hash,
            sql: `'${hash}'`
        })
    } catch (error) {
        console.error("Hash generation error:", error)
        return NextResponse.json({ error: "Failed to generate hash" }, { status: 500 })
    }
}
