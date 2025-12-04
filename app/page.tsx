import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const role = user.user_metadata.role

  if (role === "super_admin") {
    redirect("/aca-penalties")
  } else {
    // Regular users go to their PDF page
    redirect("/pdf-1095c")
  }
}
