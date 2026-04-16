import { geminiUrl, getGeminiKey } from './_shared.js'

export default async function handler(req, res) {
  const { title, author, isbn } = req.query
  if (!title && !isbn) return res.status(400).json({ error: 'title or isbn required' })

  let apiKey
  try { apiKey = getGeminiKey() } catch {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const query = isbn
      ? `ISBN ${isbn} 书 定价 官方售价`
      : `《${title}》${author || ''} 书 定价 官方售价 人民币`

    const response = await fetch(
      geminiUrl(apiKey),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `搜索「${query}」，从搜索结果中找出这本书的官方定价（人民币）。只返回JSON：{"price":"数字","source":"来源网站"}。找不到则price填空字符串。` }]
          }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                price:  { type: 'STRING' },
                source: { type: 'STRING' },
              },
              required: ['price'],
            },
          },
        }),
      }
    )

    const data = await response.json()
    console.log('[price-lookup] status:', response.status)

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Gemini error' })
    }

    const parts = data.candidates?.[0]?.content?.parts || []
    const textPart = parts.find(p => !p.thought && p.text) ?? parts[parts.length - 1]
    const text = textPart?.text || ''

    let parsed = null
    try { parsed = JSON.parse(text) } catch {}
    if (!parsed) {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) try { parsed = JSON.parse(match[0]) } catch {}
    }

    if (parsed?.price) {
      console.log('[price-lookup] found:', parsed.price, 'from', parsed.source)
      return res.json({ ok: true, price: parsed.price, source: parsed.source })
    }

    return res.json({ ok: false, price: '' })

  } catch (err) {
    console.error('[price-lookup] error:', err)
    return res.status(500).json({ error: err.message })
  }
}
