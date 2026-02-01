import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uiyiwgkpchnvuvpsjfxv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpeWl3Z2twY2hudnV2cHNqZnh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NjkwNDgsImV4cCI6MjA4NTI0NTA0OH0.GV9zeRh5eJrbJyNY-ma1N9KUQaMGxdcn0FR6u-9vOLg'

export const supabase = createClient(supabaseUrl, supabaseKey)