import { describe, expect, test } from 'bun:test'

describe('package scripts', () => {
  test('includes a typecheck script', async () => {
    const pkgPath = new URL('../../package.json', import.meta.url)
    const pkg = JSON.parse(await Bun.file(pkgPath).text()) as {
      scripts?: Record<string, string>
    }

    expect(pkg.scripts).toBeDefined()
    expect(pkg.scripts?.typecheck).toBeDefined()
    expect(pkg.scripts?.typecheck).toContain('tsc')
  })
})
