import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('une dos clases simples', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('ignora valores falsy (false, undefined, null)', () => {
    expect(cn('foo', false && 'hidden', undefined, null, 'bar')).toBe('foo bar')
  })

  it('ignora strings vacíos', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar')
  })

  it('aplica tailwind-merge: la última clase gana en conflicto', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('no colapsa clases que no conflictan', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
  })

  it('acepta objetos de clases condicionales (clsx syntax)', () => {
    expect(cn({ 'font-bold': true, italic: false })).toBe('font-bold')
  })

  it('acepta arrays de clases', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('retorna string vacío sin argumentos', () => {
    expect(cn()).toBe('')
  })
})
