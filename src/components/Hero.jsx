export default function Hero() {
  return (
    <div className="cell hero-structural">
      <svg className="svg-diagram" preserveAspectRatio="none" viewBox="0 0 1000 400">
        <path
          d="M 500,0 L 0,400 M 500,0 L 100,400 M 500,0 L 200,400 M 500,0 L 300,400 M 500,0 L 400,400 M 500,0 L 500,400 M 500,0 L 600,400 M 500,0 L 700,400 M 500,0 L 800,400 M 500,0 L 900,400 M 500,0 L 1000,400"
          strokeOpacity="0.2"
        />
        <g transform="translate(500, 200)">
          <polygon points="0,-100 -150,0 0,50 150,0" fill="white" stroke="black" />
          <polygon points="-150,0 -150,40 0,90 0,50" fill="#E8E8E8" stroke="black" />
          <polygon points="150,0 150,40 0,90 0,50" fill="#E8E8E8" stroke="black" />
          <polygon points="0,-60 -100,20 0,60 100,20" fill="white" stroke="black" />
          <polygon points="-100,20 -100,50 0,90 0,60" fill="#E8E8E8" stroke="black" />
          <polygon points="100,20 100,50 0,90 0,60" fill="#E8E8E8" stroke="black" />
        </g>
      </svg>

      <div className="hero-content">
        <span className="label">Mission</span>
        <h2 className="title-cn" style={{ fontSize: '2rem', marginBottom: '1rem' }}>在別處尋找故鄉</h2>
        <p className="text" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
          Architecture of Thought. <br />
          Minimalist curation of literature, <br />
          philosophy, and spatial design.
        </p>
      </div>
    </div>
  )
}
