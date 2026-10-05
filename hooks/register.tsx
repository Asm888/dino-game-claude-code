import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const isHidden = atom({ plugin: 'dino', key: 'isHidden' } as const, false)
const best = atom({ plugin: 'dino', key: 'best' } as const, 0)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'dino',
      description: 'Show or hide the dinosaur game above the prompt',
    })
    const saved = Number((await $.store.get('best')) ?? 0)
    const hidden = (await $.store.get('isHidden')) === true
    await update($, best, () => saved)
    await update($, isHidden, () => hidden)

    return next(e)
  })

  on('command.run', { command: 'dino' }, async $ => {
    const now = !(await read($, isHidden))
    await update($, isHidden, () => now)
    await $.store.set('isHidden', now)

    return { text: now ? 'Dino hidden. /dino to bring it back.' : 'Dino is back above the prompt.' }
  })

  on('ui.message', async ($, e, next) => {
    const data = e.data as { best?: unknown } | null
    const score = typeof data?.best === 'number' ? Math.floor(data.best) : 0
    const current = await read($, best)

    if (score > current) {
      await update($, best, () => score)
      await $.store.set('best', score)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) {
      return next(e)
    }

    if (e.surface !== 'terminal' && e.surface !== 'desktop') {
      return next(e)
    }

    const { Client } = $.ui.resolve(e)
    const hi = await read($, best)

    return (
      <Client
        key="dino"
        module="./game.tsx"
        props={{ best: hi, cols: e.props.bodyColumns }}
        width={e.props.bodyColumns}
        height={10}
      />
    )
  })
}
