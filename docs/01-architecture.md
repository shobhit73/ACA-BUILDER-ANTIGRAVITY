# 01 - System Architecture & Design

## Executive Summary
The ACA-1095 Builder is a **Multi-Tenant SaaS Application** designed to automate ACA (Affordable Care Act) reporting. It leverages a **Serverless Architecture** to minimize operational overhead while providing high availability through managed services.

## High-Level Architecture
The system follows a typical 3-tier web architecture, modernized for the cloud:

```mermaid
graph TD
    Client[Client Browser] <-->|HTTPS / JSON| NextJS[Next.js App Server (Vercel)]
    NextJS <-->|Supabase Client| Supabase[Supabase Platform]
    
    subgraph "Supabase (Backend-as-a-Service)"
        Auth[GoTrue Auth]
        Postgres[PostgreSQL Database]
        RLS[Row Level Security Policies]
        Edge[Edge Functions (Optional)]
    end
    
    NextJS -->|Server Actions| Postgres
    Client -->|Client Components| Auth
```

## Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend/App** | **Next.js 14 (App Router)** | Provides Server-Side Rendering (SSR) for performance and SEO, plus Server Actions for secure backend logic without a separate API layer. |
| **Database** | **PostgreSQL (via Supabase)** | The industry standard for relational data. Robust data integrity, ACID compliance, and powerful stored procedures (PL/pgSQL) are essential for complex ACA calculations. |
| **Authentication** | **Supabase Auth** | built-in support for JWTs, OAuth, and secure session management. Integrates natively with RLS. |
| **Hosting** | **Vercel** (Recommended) | Native Next.js support, global edge network, and automatic scaling. |

---

## Critical Analysis: Scalability, Reliability & Robustness

### 1. Strengths (Why this works)
*   **Multi-Tenancy via RLS**: Data isolation is enforced at the *database engine level* using Row Level Security (RLS). This is far more robust than application-level `.where(company_id == ...)` filters, which developers might forget.
*   **Database-Heavy Logic**: ACA calculations (Line 14/15/16) are performed via Stored Procedures (`generate_aca_final_report`). This keeps data processing close to the data, significantly reducing network latency compared to pulling 10k rows to a Node.js server to process loop-by-loop.
*   **High Availability (HA)**: By using Supabase (managed Postgres) and Vercel, we offload HA responsibilities to cloud providers who guarantee 99.9%+ uptime.

### 2. Limitations & Challenges (The "Architecture Gap")

#### A. Database Connection Limits (Scalability Risk)
*   **Challenge**: Serverless functions (like Next.js Server Actions) are stateless and can scale to thousands of concurrent instances. PostgreSQL, however, has a finite limit on connection counts (e.g., 500 connections). A traffic spike could exhaust the connection pool, throwing `500 Errors`.
*   **Resolution Strategy**: Use **Supabase Transaction Pooler (Supavisor)**. Connect to the database using port `6543` (Transaction Mode) instead of `5432` (Session Mode) for production applications.

#### B. Complex Calculation Timeouts (Robustness Risk)
*   **Challenge**: The `generate_aca_final_report` function currently processes *all* employees for a company in a single transaction. For a company with 50,000 employees, this SQL query might exceed the standard request timeout (e.g., 10-60 seconds), causing the UI to crash even if the DB is still working.
*   **Resolution Strategy**: Convert to **Batch Processing**.
    *   Update the function to accept `limit` and `offset`.
    *   The UI should call the API in chunks: "Process 0-1000", then "Process 1001-2000".
    *   Alternatively, move this to a **Background Job Queue** (e.g., QStash or BullMQ) that runs asynchronously and updates a status table.

#### C. Database "Hot Spots" (Performance Risk)
*   **Challenge**: The `aca_final_report` table will grow effectively infinite as more years and companies are added. A single monolithic table can become slow to query.
*   **Resolution Strategy**: **Table Partitioning**.
    *   Partition `aca_final_report` by `tax_year`. Old years (2020, 2021) are rarely accessed and can be moved to cheaper storage or just logically separated to keep indices small for the current year.

## Schema Highlights
*   **`company_details`**: The tenant root. All business data flows from here.
*   **`modules` (Array)**: Replaces the legacy `company_module` join table for faster lookups (O(1) vs O(N) join).
*   **`aca_employee_monthly_offer`**: The "Fact Table" for ACA. It breaks down eligibility *per month*, allowing for exact Line 14 calculation even if an employee switches plans mid-year.

## Data Flow Security
1.  **Authentication**: User logs in -> receives JWT.
2.  **Authorization**: JWT contains `sub` (User ID).
3.  **Access Control**: Every query to the DB includes the JWT.
    *   Postgres checks `public.is_system_admin()` or `public.has_company_access()`.
    *   If check fails, the query returns 0 rows (RLS), effectively making the data invisible to unauthorized users.

---

*This architecture is sufficient for SMB to Mid-Market usage (up to ~10,000 employees per tenant). For Enterprise scale (>100k employees), the Batch Processing and Partitioning strategies listed above are mandatory.*
