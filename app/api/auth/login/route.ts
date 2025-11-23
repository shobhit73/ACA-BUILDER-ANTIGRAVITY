import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createToken, verifyPassword } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("[Login API] Login attempt received")
    const body = await request.json()
    const { username, password } = body // username is email
    console.log(`[Login API] Username: ${username}`)

    // Initialize Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch user by email
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, password_hash, role, tenant_id')
      .eq('email', username)
      .single()

    if (fetchError || !user) {
      console.log('[Login API] User not found or error:', fetchError)
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash)
    if (!passwordValid) {
      console.log('[Login API] Invalid password')
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
    }

    // Create JWT token
    console.log('[Login API] Creating token...')
    const token = await createToken({
      user_id: user.id,
      email: user.email,
      role: user.role as any,
      tenant_id: user.tenant_id,
    })
    console.log('[Login API] Token created successfully')

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    console.log('[Login API] Cookie set, returning success')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Login API] Error:', error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
