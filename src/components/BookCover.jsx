// Designed SVG book covers — each one reflects the book's aesthetic
const COVERS = {
  'B-001': (
    // 大江大海一九四九 — 龍應台 — vast sea crossing, 1949 exodus
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <defs>
        <linearGradient id="sky49" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0e1a"/>
          <stop offset="55%" stopColor="#1a2340"/>
          <stop offset="100%" stopColor="#0d1520"/>
        </linearGradient>
        <linearGradient id="sea49" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1520"/>
          <stop offset="100%" stopColor="#050810"/>
        </linearGradient>
      </defs>
      {/* sky */}
      <rect width="200" height="300" fill="url(#sky49)"/>
      {/* horizon */}
      <line x1="0" y1="185" x2="200" y2="185" stroke="#1e3050" strokeWidth="0.5"/>
      {/* sea */}
      <rect x="0" y="185" width="200" height="115" fill="url(#sea49)"/>
      {/* wave lines */}
      {[0,1,2,3,4,5].map(i => (
        <path key={i}
          d={`M 0 ${192+i*14} Q 50 ${188+i*14} 100 ${192+i*14} Q 150 ${196+i*14} 200 ${192+i*14}`}
          fill="none" stroke="#1e3a5a" strokeWidth="0.6" opacity={0.8-i*0.1}/>
      ))}
      {/* boat silhouettes */}
      <ellipse cx="80" cy="183" rx="22" ry="3" fill="#0a0e1a"/>
      <rect x="70" y="168" width="20" height="15" fill="#0a0e1a"/>
      <line x1="80" y1="155" x2="80" y2="168" stroke="#0a0e1a" strokeWidth="1"/>
      <ellipse cx="135" cy="184" rx="14" ry="2.5" fill="#0a0e1a"/>
      <rect x="127" y="172" width="14" height="12" fill="#0a0e1a"/>
      <line x1="134" y1="162" x2="134" y2="172" stroke="#0a0e1a" strokeWidth="0.8"/>
      {/* red accent — year */}
      <text x="100" y="82" textAnchor="middle" fontFamily="serif" fontSize="32" fill="#cc2222" fontWeight="bold" letterSpacing="-1">1949</text>
      {/* main title */}
      <text x="100" y="118" textAnchor="middle" fontFamily="serif" fontSize="18" fill="#ffffff" letterSpacing="4">大江大海</text>
      {/* divider */}
      <line x1="40" y1="128" x2="160" y2="128" stroke="#cc2222" strokeWidth="0.8"/>
      {/* author */}
      <text x="100" y="148" textAnchor="middle" fontFamily="serif" fontSize="11" fill="#a0b0c0" letterSpacing="3">龍　應　台</text>
      {/* tagline */}
      <text x="100" y="265" textAnchor="middle" fontFamily="serif" fontSize="7.5" fill="#4a6080" letterSpacing="1">上了船，就是一生</text>
      {/* publisher */}
      <text x="100" y="280" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="6" fill="#2a3a50" letterSpacing="2">讀道社</text>
    </svg>
  ),
  'B-084': (
    // 五四女性 — Wang Zheng — vintage portrait, split large characters
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <defs>
        <linearGradient id="wz-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2530"/>
          <stop offset="55%" stopColor="#3d3040"/>
          <stop offset="100%" stopColor="#c8a090"/>
        </linearGradient>
        <linearGradient id="wz-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2530" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#2a2530" stopOpacity="0.75"/>
        </linearGradient>
      </defs>
      {/* background */}
      <rect width="200" height="300" fill="url(#wz-bg)"/>
      {/* subtle grain texture */}
      {[...Array(18)].map((_,i) => (
        <line key={i} x1="0" y1={i*17} x2="200" y2={i*17}
          stroke="white" strokeWidth="0.2" opacity="0.04"/>
      ))}
      {/* overlay fade */}
      <rect width="200" height="300" fill="url(#wz-fade)"/>
      {/* top quote */}
      <text x="100" y="28" textAnchor="middle" fontFamily="serif" fontSize="7.5"
        fill="white" opacity="0.7" letterSpacing="1">吾輩愛自由，勉勵自由一杯酒。</text>
      <line x1="30" y1="34" x2="170" y2="34" stroke="white" strokeWidth="0.4" opacity="0.3"/>
      {/* large split title — 五 四 / 女 性 */}
      <text x="38" y="145" fontFamily="serif" fontSize="60" fill="white" opacity="0.92" fontWeight="300">五</text>
      <text x="118" y="145" fontFamily="serif" fontSize="60" fill="white" opacity="0.92" fontWeight="300">四</text>
      <text x="38" y="215" fontFamily="serif" fontSize="60" fill="white" opacity="0.92" fontWeight="300">女</text>
      <text x="118" y="215" fontFamily="serif" fontSize="60" fill="white" opacity="0.92" fontWeight="300">性</text>
      {/* subtitle */}
      <text x="100" y="242" textAnchor="middle" fontFamily="serif" fontSize="7"
        fill="white" opacity="0.65" letterSpacing="2">現代中國女權主義先行者</text>
      <line x1="30" y1="250" x2="170" y2="250" stroke="white" strokeWidth="0.4" opacity="0.25"/>
      {/* author & publisher */}
      <text x="100" y="264" textAnchor="middle" fontFamily="serif" fontSize="8"
        fill="white" opacity="0.75" letterSpacing="3">王政 著</text>
      <text x="100" y="280" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="6"
        fill="white" opacity="0.45" letterSpacing="1">香港中文大學出版社</text>
    </svg>
  ),
  'B-211': (
    // 建築十書 — Vitruvius — classical column proportions
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <rect width="200" height="300" fill="#e8e4dc"/>
      {/* column */}
      <rect x="88" y="70" width="24" height="160" fill="none" stroke="#5a4a3a" strokeWidth="1"/>
      {/* capital */}
      <path d="M 78,70 L 122,70 L 118,80 L 82,80 Z" fill="#5a4a3a" opacity="0.8"/>
      {/* base */}
      <path d="M 82,230 L 118,230 L 122,240 L 78,240 Z" fill="#5a4a3a" opacity="0.8"/>
      {/* flutes */}
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={91+i*4} y1="80" x2={91+i*4} y2="230" stroke="#5a4a3a" strokeWidth="0.4" opacity="0.5"/>
      ))}
      {/* entablature lines */}
      <line x1="20" y1="60" x2="180" y2="60" stroke="#5a4a3a" strokeWidth="1.5"/>
      <line x1="20" y1="55" x2="180" y2="55" stroke="#5a4a3a" strokeWidth="0.5"/>
      <text x="100" y="38" textAnchor="middle" fontFamily="serif" fontSize="12" fill="#3a2a1a" letterSpacing="2">建築十書</text>
      <text x="100" y="22" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="7" fill="#8a7a5a" letterSpacing="3">DE ARCHITECTURA</text>
      <text x="100" y="270" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="7" fill="#8a7a5a" letterSpacing="2">VITRUVIUS</text>
    </svg>
  ),
  'B-105': (
    // 網格系統 — Müller-Brockmann — pure grid
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <rect width="200" height="300" fill="#ffffff"/>
      {/* grid lines vertical */}
      {[0,1,2,3,4,5,6,7,8].map(i => (
        <line key={'v'+i} x1={20+i*20} y1="20" x2={20+i*20} y2="280" stroke="#e0e0e0" strokeWidth="0.5"/>
      ))}
      {/* grid lines horizontal */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
        <line key={'h'+i} x1="20" y1={20+i*20} x2="180" y2={20+i*20} stroke="#e0e0e0" strokeWidth="0.5"/>
      ))}
      {/* bold accent blocks */}
      <rect x="20" y="20" width="60" height="60" fill="#000"/>
      <rect x="100" y="100" width="80" height="40" fill="#000"/>
      <rect x="20" y="180" width="40" height="80" fill="#000"/>
      <rect x="80" y="220" width="100" height="20" fill="#000"/>
      {/* title overlay */}
      <text x="110" y="58" textAnchor="middle" fontFamily="'Helvetica Neue',Helvetica,sans-serif" fontSize="9" fill="#000" fontWeight="700" letterSpacing="1">GRID SYSTEMS</text>
      <text x="110" y="70" textAnchor="middle" fontFamily="serif" fontSize="9" fill="#000" letterSpacing="1">網格系統</text>
      <text x="155" y="148" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="6" fill="#fff" letterSpacing="1">MÜLLER-BROCKMANN</text>
    </svg>
  ),
  'B-072': (
    // 陰翳禮讚 — Tanizaki — shadow and light
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <defs>
        <linearGradient id="shadow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0a0a0a"/>
          <stop offset="60%" stopColor="#2a2218"/>
          <stop offset="100%" stopColor="#c8a87a"/>
        </linearGradient>
      </defs>
      <rect width="200" height="300" fill="url(#shadow)"/>
      {/* paper texture lines */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <line key={i} x1="0" y1={30+i*26} x2="200" y2={30+i*26} stroke="#3a2e1e" strokeWidth="0.3" opacity="0.4"/>
      ))}
      <text x="160" y="80" textAnchor="middle" fontFamily="serif" fontSize="14" fill="#c8a87a" letterSpacing="6"
        style={{writingMode:'vertical-rl'}}>陰翳禮讚</text>
      <text x="32" y="270" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="6.5" fill="#8a7a5a" letterSpacing="2">JUN'ICHIRŌ TANIZAKI</text>
      <text x="32" y="258" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="6" fill="#6a5a4a" letterSpacing="2">IN PRAISE OF SHADOWS</text>
    </svg>
  ),
}

export default function BookCover({ sku, titleCn, author }) {
  const cover = COVERS[sku?.replace('SKU: ', '')]
  if (cover) return cover

  // Generic fallback for DB books without a cover image
  const hue = (titleCn?.charCodeAt(0) || 0) % 360
  const bg = `hsl(${hue}, 15%, 92%)`
  const fg = `hsl(${hue}, 20%, 30%)`
  return (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
      <rect width="200" height="300" fill={bg}/>
      <line x1="20" y1="20" x2="180" y2="20" stroke={fg} strokeWidth="1.5" opacity="0.4"/>
      <line x1="20" y1="280" x2="180" y2="280" stroke={fg} strokeWidth="1.5" opacity="0.4"/>
      <text x="100" y="148" textAnchor="middle" fontFamily="serif" fontSize="16" fill={fg} letterSpacing="2">
        {titleCn?.slice(0,4)}
      </text>
      {titleCn?.length > 4 && (
        <text x="100" y="168" textAnchor="middle" fontFamily="serif" fontSize="16" fill={fg} letterSpacing="2">
          {titleCn?.slice(4,8)}
        </text>
      )}
      <text x="100" y="200" textAnchor="middle" fontFamily="'Helvetica Neue',sans-serif" fontSize="7" fill={fg} opacity="0.6" letterSpacing="2">
        {author?.toUpperCase().slice(0,20)}
      </text>
    </svg>
  )
}
