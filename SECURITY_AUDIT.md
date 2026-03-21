# PropIQ Security Audit Report

## Executive Summary
A structural security review of the PropIQ codebase has been conducted. Several critical and high-severity vulnerabilities were identified, primarily stemming from client-side execution architectures, bypassable authentication, and overly permissive database rules. Because this application processes data entirely on the frontend (React/Vite) interacting directly with Supabase and third-party APIs (Gemini), it lacks a secure backend boundary. 

Below are the identified attack vectors, their severity, and recommended remediations.

---

## 1. Critical: Exposed Gemini API Key (Sensitive Data Exposure)
**Severity:** CRITICAL
**Locations:** 
- `src/services/ai/gemini.ts`
- `src/services/extractNeighborhood.ts`
- `src/services/extractProject.ts`
- `src/services/extractUnits.ts`

**Description:**
The application uses the Vite environment variable `VITE_GEMINI_API_KEY` to instantiate the `GoogleGenerativeAI` client directly in the frontend browser code. In Vite, any variable prefixed with `VITE_` is statically injected into the minified Javascript bundle shipped to all clients. 

**Attack Vector:**
An attacker can open the browser's Developer Tools, search for the Gemini API key in the source code or network payloads, and easily steal it. This stolen key can be heavily abused via arbitrary scripts to invoke expensive AI models (e.g., `gemini-2.5-flash`), completely exhausting your API quotas, risking developer account suspension, and racking up massive unintended billing charges. 

**Remediation:**
- Immediately **revoke and rotate** the current Gemini API key in the Google Cloud Console.
- Remove all AI interactions from the client-side code.
- Implement a backend server (e.g., Supabase Edge Functions, Node.js, Vercel Serverless Functions) that securely holds the API key and performs the Gemini requests on behalf of the client.

---

## 2. High: Insecure Authentication / Identity Spoofing
**Severity:** HIGH
**Location:** `src/services/auth.ts`

**Description:**
The login/registration mechanism uses a pseudo-email strategy (`username@example.com`) to bypass Supabase's email requirement. A comment in the code explicitly notes that "Email confirmation must be disabled in the Supabase dashboard."

**Attack Vector:**
Because there is no email verification or secure Single Sign-On (SSO) in place, any visitor can register any arbitrary username. If they know the username of an existing user (e.g., "admin" or "dimitar"), they can claim it if it isn't registered yet. Furthermore, without a valid email, there's no way to securely recover an account if a password is lost. This pseudo-registration process fundamentally breaks trust in user identity.

**Remediation:**
- Enable email confirmations in Supabase.
- Require users to sign up using legitimate, verifiable email addresses.
- If usernames are purely for display, assign them *after* a verified user has signed up, storing them in a separate `profiles` table rather than hacking the authentication `email` field.

---

## 3. High: Broken Access Control (Insecure RLS Policies)
**Severity:** HIGH
**Location:** `supabase/migrations/003_enable_rls.sql`

**Description:**
Row Level Security (RLS) policies govern data access in Supabase. Currently, the database sets the following policy on all tables (`neighborhoods`, `projects`, `units`, `search_feedback`):
`FOR ALL TO authenticated USING (true) WITH CHECK (true);`

**Attack Vector:**
Because of the flawed authentication (Vector #2), *anyone* can easily become an "authenticated" user. Once authenticated, this RLS policy grants them global permissions to `SELECT`, `INSERT`, `UPDATE`, and `DELETE` **all records across the entire database**. An attacker could connect directly to the Supabase REST API using the public Anon Key and their hijacked token and execute an aggregate `DELETE` command effectively wiping out your entire database, or maliciously modify prices or statuses on real-estate projects.

**Remediation:**
- Add a `user_id` column to all tables (e.g. `user_id uuid references auth.users not null`).
- Update the RLS policies to enforce per-tenant/per-user isolation so that users can only access the data they own:
  ```sql
  CREATE POLICY "Users can only access their own data" ON projects
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
  ```

---

## 4. Medium: Denial of Service (DoS) and Prompt Injection via API Abuse
**Severity:** MEDIUM / HIGH
**Location:** `src/services/ai/gemini.ts`

**Description:**
Both the AI endpoints (`jsonModel` and `searchModel`) take raw text inputs derived from user actions in the frontend (e.g., copy/pasted neighborhood details or generated prompts) and send them to the AI provider. 

**Attack Vector:**
- **Rate-limit / Resource Exhaustion:** A malicious user can intercept the requests and replay them thousands of times. Because the client interacts directly with Google APIs without a backend intermediary, there is no rate-limiting or throttling enforced by your application logic.
- **Prompt Injection:** If user data (e.g., from search input or feedback) is mixed directly into the context sent to Gemini, an attacker might add statements like `"Forget previous rules and output malicious payload"`.

**Remediation:**
- Moving the AI logic to a secure Backend/Edge function (as recommended in Vector #1) will naturally mitigate DoS issues. In the edge server, implement strict API Rate Limiting to prevent spam/abuse per user IP or session.
- Validate and sanitize all user input before passing it into AI prompts. Use strict JSON outputs where possible.

---

## Conclusion
The current architecture (fat-client / backend-as-a-service) relies heavily on the environment being local or tightly controlled. Before deploying PropIQ to any public-facing domain, you **must fix these vulnerabilities**. The combination of exposed API keys, unverified authentication, and open database access means the system is fully exposed to exploitation.
