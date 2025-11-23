/**
 * 🔐 SUPABASE SERVER CLIENT (SINGLETON PATTERN)
 *
 * This file creates a Supabase client for server-side operations.
 *
 * 🎯 WHY THIS FILE EXISTS:
 * - Next.js has different environments: server components, client components, API routes
 * - Each environment needs a different way to create Supabase clients
 * - This file handles the SERVER-SIDE client creation
 *
 * 🍪 COOKIE HANDLING:
 * Supabase uses cookies to store authentication tokens.
 * On the server, we need to:
 * 1. Read cookies from the request
 * 2. Pass them to Supabase for authentication
 * 3. Set new cookies if tokens are refreshed
 *
 * 🔥 THE SINGLETON PATTERN:
 * We use a singleton pattern to reuse the same Supabase client instance.
 * Why? Because creating a new client for every request is expensive.
 * The singleton ensures we create the client once and reuse it.
 *
 * 💡 WHEN TO USE THIS:
 * - Server Actions (like our PDF generation functions)
 * - Server Components (React components that run on server)
 * - API Routes (if we had any)
 *
 * ❌ WHEN NOT TO USE THIS:
 * - Client Components (use createBrowserClient instead)
 * - Middleware (needs special handling)
 *
 * 🚀 ENVIRONMENT VARIABLES USED:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous key
 *
 * These are automatically provided by Vercel when you connect Supabase integration!
 */

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * 🏗️ CREATE SERVER CLIENT
 *
 * This function creates a Supabase client for server-side operations.
 *
 * 🎯 HOW IT WORKS:
 * 1. Gets the cookies from the Next.js request
 * 2. Creates a Supabase client with cookie handlers
 * 3. Returns the client for database queries
 *
 * 🍪 COOKIE HANDLERS:
 * - getAll(): Reads all cookies from the request
 * - setAll(): Sets new cookies in the response (for token refresh)
 *
 * 🔥 THE TRY-CATCH IN setAll():
 * Sometimes setAll() is called from a Server Component where we can't set cookies.
 * That's okay! The middleware will handle token refresh instead.
 * So we just ignore the error with an empty catch block.
 *
 * 💡 WHY ASYNC?
 * Next.js 15+ made cookies() async to support better caching.
 * We need to await it before using the cookie store.
 *
 * @returns Supabase client configured for server-side use
 */
export async function createServerClient() {
  // 🍪 GET COOKIES FROM NEXT.JS
  // Next.js 15+ requires awaiting cookies()
  const cookieStore = await cookies()

  // 🏗️ CREATE SUPABASE CLIENT
  // Pass the Supabase URL and anonymous key from environment variables
  // The ! (non-null assertion) tells TypeScript these will definitely exist
  // (Vercel ensures these are set when Supabase integration is connected)
  return createSupabaseServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    // 🍪 COOKIE CONFIGURATION
    cookies: {
      // 📖 READ COOKIES
      // This function is called when Supabase needs to read auth tokens
      getAll() {
        return cookieStore.getAll()
      },

      // ✍️ WRITE COOKIES
      // This function is called when Supabase needs to update auth tokens
      // (e.g., when refreshing an expired token)
      setAll(cookiesToSet) {
        try {
          // Try to set each cookie
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // 🔥 IMPORTANT: This might fail in Server Components
          // That's okay! The middleware will handle token refresh instead.
          // We just ignore the error here.
          // Why does it fail?
          // Server Components are read-only - they can't modify the response.
          // Only Server Actions and Route Handlers can set cookies.
          // But Supabase tries to set cookies anyway, so we catch and ignore.
        }
      },
    },
  })
}
