import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const VALID_USERNAME = "naveen"
const VALID_PASSWORD = "naveen-123"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Login attempt received")
    const body = await request.json()
    const { username, password } = body
    console.log("[v0] Username:", username)

    // Validate credentials
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      console.log("[v0] Credentials valid, setting cookie")
      // Set secure cookie
      const cookieStore = await cookies()
      cookieStore.set("auth-token", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      })

      console.log("[v0] Cookie set successfully")
      return NextResponse.json({ success: true })
    }

    console.log("[v0] Invalid credentials")
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
