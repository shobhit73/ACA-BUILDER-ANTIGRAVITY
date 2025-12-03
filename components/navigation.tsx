import Link from "next/link"

export function Navigation() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              1095-C Builder
            </Link>
            <div className="flex gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Import
              </Link>
              <Link
                href="/interim"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Interim Tables
              </Link>
              <Link
                href="/data-viewer"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Data Viewer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
