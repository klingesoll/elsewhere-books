export const BOOK_TOPICS = {
  diaspora: {
    title: '关于离散',
    image: '/images/diaspora-queer-hk-books.png',
    intro: '关于亚裔离散、身份命名、自我书写与跨语言经验。',
    books: [
      {
        title: 'Queering the Asian Diaspora',
        author: 'Hongwei Bao',
        note: '从酷儿视角重新理解亚洲离散经验、身份政治与文化归属。',
      },
      {
        title: 'Self-portrait as a Banana',
        author: 'Hongwei Bao',
        note: '以"香蕉"作为种族化身份隐喻，书写移民、自我凝视与文化错位。',
      },
    ],
  },
  queerness: {
    title: '关于酷儿',
    image: '/images/diaspora-queer-hk-books.png',
    intro: '关于身体、欲望、神话、酷儿文化与华语经验。',
    books: [
      {
        title: 'The Passion of the Rabbit God',
        author: 'Hongwei Bao',
        note: '以兔儿神为文化意象，将诗歌、信仰与酷儿欲望连接起来。',
      },
      {
        title: 'Queering the Asian Diaspora',
        author: 'Hongwei Bao',
        note: '讨论亚裔离散语境中的酷儿身份、文化生产与社群经验。',
      },
    ],
  },
  hongKongMemory: {
    title: '关于香港的记忆',
    image: '/images/diaspora-queer-hk-books.png',
    intro: '关于香港政治隐喻、抗争影像、城市创伤与后抗争时期的记忆整理。',
    books: [
      {
        title: 'How to Select a Chief Executive and Other Metaphors of Hong Kong Politics',
        author: 'Jennifer Eagleton',
        note: '以政治隐喻进入香港制度、语言与权力结构。',
      },
      {
        title: 'Umbrella Uprising',
        author: '作者 / 编者待补',
        note: '关于 2019 香港抗争的视觉档案。',
      },
      {
        title: 'Lamentations: Hong Kong 2019–2025',
        author: '作者待补',
        note: '关于香港 2019–2025 的城市哀悼、影像记忆与时代创伤。',
      },
    ],
  },
};

export const SHELVES = [
  {
    id: 'S-001',
    label: '店员在读',
    title: 'KELLY is reading',
    items: ['《大路》', '《台湾漫游录》', '《大江大海1949》'],
  },
  {
    id: 'S-002',
    label: '租借书架',
    title: '书社创始人',
    items: ['《单读》', '《我还能看到多少次满月升起》', '《始于极限》'],
  },
  {
    id: 'S-003',
    label: '本月主题',
    title: '离散、酷儿与香港记忆',
    items: [
      { label: '关于离散', topicId: 'diaspora' },
      { label: '关于酷儿', topicId: 'queerness' },
      { label: '关于香港的记忆', topicId: 'hongKongMemory' },
    ],
  },
];
