import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase project configuration
const SUPABASE_URL = 'https://ynlnrvuqypmwpevabtdc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlubG5ydnVxeXBtd3BldmFidGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NzM0NjQsImV4cCI6MjA2ODE0OTQ2NH0.dvRTW9S7ZRCcjYJgEx-Adw1QnRV2Gv6jqCpAhPt-qoE';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
