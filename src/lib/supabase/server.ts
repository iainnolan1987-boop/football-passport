// src/lib/supabase/server.ts
// Use this in Server Components and Route Handlers

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
const cookieStore = cookies()

return createServerClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
{
cookies: {
get(name: string) {
return cookieStore.get(name)?.value
},
set(name: string, value: string, options: any) {
try {
cookieStore.set({ name, value, ...options })
} catch {
// Server Component cookie setting can fail safely
}
},
remove(name: string, options: any) {
try {
cookieStore.set({ name, value: '', ...options })
} catch {
// Server Component cookie removal can fail safely
}
},
},
}
)
}