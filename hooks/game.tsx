import type { ClientModule, ClientSurface } from 'claude-code'

// The scene is a pixel bitmap; each text row shows two pixel rows with ▀ ▄ █.
const ROWS = 10
const PX_H = ROWS * 2
const FLOOR = PX_H - 3 // pixel row the feet stand on
const DINO_X = 4
const TICK = 50
const GRAVITY = 0.55
const JUMP_V = 3.15

type Sprite = { w: number; h: number; px: [number, number][] }

function sprite(art: string[]): Sprite {
  const px: [number, number][] = []
  art.forEach((line, y) => {
    Array.from(line).forEach((ch, x) => {
      if (ch === '#') px.push([x, y])
    })
  })

  return { w: Math.max(...art.map(l => l.length)), h: art.length, px }
}

const DINO_TOP = [
  '......#####',
  '.....##.###',
  '.....######',
  '.....###...',
  '#...######.',
  '##.#####.#.',
  '#######....',
  '.#####.....',
]
const DINO_STAND = sprite([...DINO_TOP, '..#..#.....', '..##.##....'])
const DINO_RUN = [
  sprite([...DINO_TOP, '..#..#.....', '..##.......']),
  sprite([...DINO_TOP, '..#..#.....', '.....##....']),
]
const DINO_DEAD = sprite([
  '......#####',
  '.....#.#.##',
  '.....##.###',
  '.....######',
  '#...######.',
  '##.#####.#.',
  '#######....',
  '.#####.....',
  '..#..#.....',
  '..##.##....',
])
const CACTI = [
  sprite(['..#..', '#.#..', '#.#.#', '###.#', '..###', '..#..']),
  sprite(['..#..', '..#.#', '#.#.#', '#.#.#', '#####', '..#..', '..#..']),
  sprite(['..#....#..', '#.#..#.#.#', '#.#..#.#.#', '###..#####', '..#....#..', '..#....#..']),
]
const BIRD = [
  sprite(['...#.....', '...##....', '.##.####.', '#########', '....#####']),
  sprite(['.........', '.........', '.##.####.', '#########', '...###...', '...##....']),
]
// Bottom of the bird above the floor: jump over the low one, run under the high one.
const BIRD_LIFT = [1, 12]

type Obstacle = { x: number; kind: number; lift: number; isBird: boolean }
type Cloud = { x: number; row: number }

type Game = {
  mode: 'idle' | 'run' | 'over'
  y: number
  vy: number
  t: number
  speed: number
  score: number
  best: number
  obstacles: Obstacle[]
  clouds: Cloud[]
  nextSpawn: number
  overAt: number
  ground: number
  width: number
}

type State = { g: Game }
type Props = { best?: number; cols?: number }

function fresh(best: number, width: number): Game {
  return {
    mode: 'idle',
    y: 0,
    vy: 0,
    t: 0,
    speed: 2.4,
    score: 0,
    best,
    obstacles: [],
    clouds: [
      { x: Math.floor(width * 0.3), row: 1 },
      { x: Math.floor(width * 0.7), row: 2 },
    ],
    nextSpawn: 60,
    overAt: 0,
    ground: 0,
    width,
  }
}

function dinoSprite(g: Game): Sprite {
  const step = Math.floor(g.t / 2) % 2
  if (g.mode === 'over') return DINO_DEAD
  if (g.y > 0) return DINO_STAND
  if (g.mode === 'idle') return DINO_STAND

  return DINO_RUN[step]
}

function obstacleSprite(o: Obstacle, t: number): Sprite {
  return o.isBird ? BIRD[Math.floor(t / 5) % 2] : CACTI[o.kind]
}

// Absolute pixels of a sprite whose bottom row sits `lift` pixels above the floor.
function place(s: Sprite, x: number, lift: number): [number, number][] {
  const left = Math.round(x)
  const top = FLOOR - Math.round(lift) - (s.h - 1)

  return s.px.map(([px, py]) => [left + px, top + py])
}

function start(g: Game) {
  if (g.mode === 'over' && g.t - g.overAt < 8) return
  Object.assign(g, fresh(g.best, g.width), { mode: 'run', t: g.t })
}

function jump(g: Game) {
  if (g.mode !== 'run') return start(g)
  if (g.y === 0) {
    g.vy = JUMP_V
  }
}

function tick(g: Game, post: (d: { best: number }) => void): boolean {
  g.t += 1
  if (g.mode !== 'run') return false

  g.speed = Math.min(5, 2.4 + g.score / 600)
  g.score += g.speed / 12
  g.ground += g.speed

  if (g.y > 0 || g.vy > 0) {
    g.y += g.vy
    g.vy -= GRAVITY
    if (g.y <= 0) {
      g.y = 0
      g.vy = 0
    }
  }

  for (const o of g.obstacles) o.x -= g.speed * (o.isBird ? 1.2 : 1)
  g.obstacles = g.obstacles.filter(o => o.x > -20)
  for (const c of g.clouds) c.x -= g.speed * 0.2
  g.clouds = g.clouds.filter(c => c.x > -8)
  if (g.clouds.length < Math.max(2, Math.floor(g.width / 40)) && Math.random() < 0.02) {
    g.clouds.push({ x: g.width + 2, row: 1 + Math.floor(Math.random() * 3) })
  }

  g.nextSpawn -= g.speed
  if (g.nextSpawn <= 0) {
    const isBird = g.score > 200 && Math.random() < 0.3
    const lift = isBird ? BIRD_LIFT[Math.floor(Math.random() * BIRD_LIFT.length)] : 0
    const kind = isBird ? 0 : Math.floor(Math.random() * (g.score > 100 ? CACTI.length : 2))
    g.obstacles.push({ x: g.width + 2, kind, lift, isBird })
    g.nextSpawn = 45 + Math.random() * 60 + g.speed * 10
  }

  const dino = new Set(place(dinoSprite(g), DINO_X, g.y).map(([x, y]) => x * 100 + y))
  for (const o of g.obstacles) {
    if (o.x > DINO_X + 20) continue
    for (const [x, y] of place(obstacleSprite(o, g.t), o.x, o.lift)) {
      if (!dino.has(x * 100 + y)) continue
      g.mode = 'over'
      g.overAt = g.t
      const score = Math.floor(g.score)
      if (score > g.best) {
        g.best = score
        post({ best: score })
      }

      return true
    }
  }

  return true
}

const HALF = [' ', '▀', '▄', '█']

function draw(g: Game): string[] {
  const width = g.width
  const px = Array.from({ length: PX_H }, () => new Uint8Array(width))
  const dot = (x: number, y: number) => {
    if (x >= 0 && x < width && y >= 0 && y < PX_H) px[y][x] = 1
  }

  // Ground: a line under the feet, pebbles scrolling below it.
  const offset = Math.floor(g.ground)
  for (let x = 0; x < width; x++) {
    dot(x, FLOOR + 1)
    const n = ((x + offset) * 2654435761) >>> 0
    if (n % 13 === 0) dot(x, FLOOR + 2)
    if (n % 29 === 0) dot(x, FLOOR)
  }

  for (const o of g.obstacles) {
    for (const [x, y] of place(obstacleSprite(o, g.t), o.x, o.lift)) dot(x, y)
  }
  for (const [x, y] of place(dinoSprite(g), DINO_X, g.y)) dot(x, y)

  const lines = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: width }, (_, x) => HALF[px[r * 2][x] + px[r * 2 + 1][x] * 2]),
  )

  const put = (row: number, text: string, at: number, onlyBlank = false) => {
    Array.from(text).forEach((ch, i) => {
      const x = at + i
      if (x < 0 || x >= width) return
      if (onlyBlank && lines[row][x] !== ' ') return
      lines[row][x] = ch
    })
  }

  for (const c of g.clouds) put(c.row, '░▒▒░', Math.round(c.x), true)

  const pad = (n: number) => String(Math.floor(n)).padStart(5, '0')
  const score = `HI ${pad(g.best)}  ${pad(g.score)}`
  put(0, score, width - score.length - 1)

  const center = (row: number, text: string) =>
    put(row, text, Math.max(0, Math.floor((width - text.length) / 2)))
  if (g.mode === 'idle') {
    center(3, 'Click here, then Space or ↑ to jump')
  } else if (g.mode === 'over') {
    center(3, 'G A M E   O V E R')
    center(5, 'Space or click to restart')
  }

  return lines.map(row => row.join(''))
}

const Dino: ClientModule<Props, State> = (props, surface: ClientSurface<State>) => {
  const { Box, Text } = surface.elements
  const width = Math.max(40, props?.cols || surface.columns || 80)

  let state = surface.state
  if (!state) {
    const g = fresh(props?.best ?? 0, width)
    state = { g }
    const redraw = () => surface.setState({ g })
    surface.every(TICK, () => {
      if (tick(g, d => surface.post(d))) redraw()
    })
    surface.onKey(k => {
      const isJump = [' ', 'space', 'up', 'w', 'return', 'enter'].includes(k.key.toLowerCase())
      if (!isJump) return
      jump(g)
      redraw()
    })
    surface.onPointer(p => {
      if (p.type !== 'down') return
      jump(g)
      redraw()
    })
    surface.setState(state)
  }

  const g = state.g
  g.width = width
  if ((props?.best ?? 0) > g.best) g.best = props.best ?? 0

  // The desktop draws Text in a proportional font, where a space is narrower than
  // a block glyph, so a row of spaces cannot carry a sprite's column. Each run of
  // glyphs is pinned at its column instead; the layout's cells are monospace.
  const runs: { row: number; col: number; text: string }[] = []
  draw(g).forEach((line, row) => {
    const re = /[^ ]+/g
    let m: RegExpExecArray | null
    while ((m = re.exec(line))) runs.push({ row, col: m.index, text: m[0] })
  })

  return (
    <Box position="relative" width={width} height={ROWS} overflow="hidden">
      {runs.map(r => (
        <Box position="absolute" top={r.row} left={r.col}>
          <Text>{r.text}</Text>
        </Box>
      ))}
    </Box>
  )
}

export default Dino
