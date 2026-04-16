export default function handler(req, res) {
  res.status(200).json({
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasSupabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
    hasAdminSecret: !!process.env.ADMIN_SECRET,
    time: new Date().toISOString(),
  })
}
