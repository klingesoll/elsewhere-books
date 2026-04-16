/**
 * Elsewhere Books — Shared constants
 *
 * Single source of truth for categories, content, and config.
 * No hardcoded secrets — all sensitive values come from env vars.
 */

// ── Book categories (used in Sidebar, POS, Scanner prompts) ──
export const CATEGORIES = [
  '小说', '漫画', '日本文学', '诗歌', '艺术', '纪实文学',
  '心灵疗愈', '文化研究', '散文', '摄影', '音乐', '黑胶',
  '福袋盲盒', '哲学', '历史', '政治', '东南亚文学', '台湾文学',
  '女性主义', '科普', '社科', '文艺批评', '中国研究', '传记',
  '建筑', '其他',
]

// ── Luma integration ──
export const LUMA_PROFILE_URL = 'https://luma.com/elsewherebooks'

// ── Volunteer groups ──
export const VOLUNTEER_GROUPS = [
  { role: '選書組',     en: 'CURATION',    tagline: '每一本書都是一次遠行' },
  { role: '觀影組',     en: 'FILM',        tagline: '銀幕裡的另一個別處' },
  { role: '海報設計組', en: 'DESIGN',      tagline: '把想法摺疊成一張紙' },
  { role: '讀書會',     en: 'BOOK CLUB',   tagline: '用聲音交換孤獨' },
  { role: 'IT 小組',    en: 'TECH',        tagline: '用 code 搭建別處' },
]

// ── Marquee quotes ──
export const QUOTES = [
  { text: '上了船，就是一生。', from: '龍應台' },
  { text: 'We shape our buildings; thereafter they shape us.', from: 'Churchill' },
  { text: '美存在於物體與物體產生的陰影之間。', from: '谷崎潤一郎' },
  { text: '文字是人類所創造最偉大的幾何學。', from: 'Müller-Brockmann' },
  { text: '書是一把斧子，劈開我們內心的冰海。', from: 'Kafka' },
  { text: '閱讀是孤獨者的狂歡。', from: '別處書社' },
]

// ── Curated reading lists ──
export const READING_LISTS = [
  {
    id: 'exile',
    title: '流離與歸屬',
    titleEn: 'Exile & Belonging',
    description: '離散書寫，身份追尋',
    books: ['大江大海一九四九', '目送', '橄欖樹下的情人'],
    color: 'var(--highlight-purple)',
  },
  {
    id: 'space',
    title: '空間與建築',
    titleEn: 'Space & Architecture',
    description: '從圖紙到生活的距離',
    books: ['建築十書', '網格系統', '設計的設計'],
    color: 'var(--highlight-blue)',
  },
  {
    id: 'aesthetics',
    title: '東方美學',
    titleEn: 'Eastern Aesthetics',
    description: '陰翳之中，見光之美',
    books: ['陰翳禮讚', '物哀與幽玄', '長物志'],
    color: 'var(--pure-white)',
  },
]

// ── Static fallback books (when Supabase is offline) ──
export const STATIC_BOOKS = [
  {
    sku: 'B-001', price: '¥79.00', titleCn: '大江大海一九四九', author: '龍應台',
    excerpt: '「所有的顛沛流離，最後都由大江走向大海，所有的生離死別，都發生在某一個碼頭——上了船，就是一生。」',
  },
  {
    sku: 'B-084', price: '¥128.00', titleCn: '五四女性', author: '王政 Wang Zheng',
    excerpt: '「縱使困境反復出現，總有人起身打破。」',
  },
  {
    sku: 'B-211', price: '¥150.00', titleCn: '建築十書', author: 'Vitruvius',
    excerpt: '「我們建造建築，然後建築塑造我們。」',
  },
  {
    sku: 'B-105', price: '¥110.00', titleCn: '網格系統', author: 'Josef Müller-Brockmann',
    excerpt: '「文字是人類所創造最偉大的幾何學。」',
  },
  {
    sku: 'B-072', price: '¥88.00', titleCn: '陰翳禮讚', author: "Jun'ichirō Tanizaki",
    excerpt: '「美存在於物體與物體產生的陰影之間。」',
  },
]
