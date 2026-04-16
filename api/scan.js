import { geminiUrl, getGeminiKey, setCorsHeaders, verifyAdmin } from './_shared.js'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let apiKey
  try { apiKey = getGeminiKey() } catch {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const { imageBase64, mimeType = 'image/jpeg', mode = 'spine' } = req.body
    if (!imageBase64) return res.status(400).json({ error: 'Missing image data' })

    // ── mode: spine — identify book info from spine/cover
    // ── mode: price — extract price from price tag / back cover
    const isSpine = mode === 'spine'

    const prompt = isSpine
      ? '識別圖片中的書封或書脊資訊。excerpt 請用中文寫一句體現此書精髓的語句（不超過60字）。category 從以下選一：文學/哲學/建築/攝影/藝術/設計/其他。'
      : '從圖片中提取書的定價。只看價格標籤、條碼區域或封底定價。price 填阿拉伯數字，不含貨幣符號。若完全看不到價格，price 填空字串。'

    const schema = isSpine
      ? {
          type: 'OBJECT',
          properties: {
            titleCn:   { type: 'STRING' },
            titleEn:   { type: 'STRING' },
            author:    { type: 'STRING' },
            publisher: { type: 'STRING' },
            year:      { type: 'STRING' },
            isbn:      { type: 'STRING' },
            category:  { type: 'STRING' },
            excerpt:   { type: 'STRING' },
          },
          required: ['titleCn', 'titleEn', 'author'],
        }
      : {
          type: 'OBJECT',
          properties: {
            price:    { type: 'STRING' },
            currency: { type: 'STRING' },
          },
          required: ['price'],
        }

    const response = await fetch(
      geminiUrl(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: prompt },
          ]}],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        }),
      }
    )

    const data = await response.json()
    console.log('[scan] mode:', mode, 'status:', response.status)

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini error' })
    }

    const candidate = data.candidates?.[0]
    if (!candidate || candidate.finishReason === 'SAFETY') {
      return res.status(500).json({ error: '內容被安全過濾', reason: candidate?.finishReason })
    }

    const parts = candidate.content?.parts || []
    const rawText = (parts.find(p => !p.thought && p.text) ?? parts[parts.length - 1])?.text
    if (!rawText) return res.status(500).json({ error: '模型回傳內容為空' })

    const parsed = JSON.parse(rawText)
    return res.json({ ok: true, result: parsed })

  } catch (err) {
    console.error('[scan] crash:', err)
    return res.status(500).json({ error: err.message })
  }
}
