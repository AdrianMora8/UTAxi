import { describe, it, expect } from 'vitest'
import { CAMPUSES, findCampusById, findCampusByLabel } from './campuses'

describe('CAMPUSES', () => {
  it('contiene exactamente 3 campus', () => {
    expect(CAMPUSES).toHaveLength(3)
  })

  it('cada campus tiene id, label, shortLabel, lat y lng', () => {
    for (const campus of CAMPUSES) {
      expect(campus.id).toBeTruthy()
      expect(campus.label).toBeTruthy()
      expect(campus.shortLabel).toBeTruthy()
      expect(typeof campus.lat).toBe('number')
      expect(typeof campus.lng).toBe('number')
    }
  })
})

describe('findCampusById', () => {
  it('retorna el campus correcto por id', () => {
    const campus = findCampusById('huachi')
    expect(campus).toBeDefined()
    expect(campus?.label).toBe('Campus Huachi')
  })

  it('retorna undefined para un id inexistente', () => {
    expect(findCampusById('inexistente')).toBeUndefined()
  })

  it('retorna undefined para string vacío', () => {
    expect(findCampusById('')).toBeUndefined()
  })

  it('encuentra los tres campus por id', () => {
    expect(findCampusById('huachi')).toBeDefined()
    expect(findCampusById('querocochamba')).toBeDefined()
    expect(findCampusById('ingahurco')).toBeDefined()
  })
})

describe('findCampusByLabel', () => {
  it('encuentra por label completo', () => {
    const campus = findCampusByLabel('Campus Huachi')
    expect(campus).toBeDefined()
    expect(campus?.id).toBe('huachi')
  })

  it('encuentra por shortLabel', () => {
    const campus = findCampusByLabel('Huachi')
    expect(campus).toBeDefined()
    expect(campus?.id).toBe('huachi')
  })

  it('encuentra Campus Querochamba por shortLabel', () => {
    const campus = findCampusByLabel('Querochamba')
    expect(campus?.id).toBe('querocochamba')
  })

  it('encuentra Campus Ingahurco por label completo', () => {
    const campus = findCampusByLabel('Campus Ingahurco')
    expect(campus?.id).toBe('ingahurco')
  })

  it('retorna undefined para label inexistente', () => {
    expect(findCampusByLabel('Campus Fantasma')).toBeUndefined()
  })

  it('retorna undefined para string vacío', () => {
    expect(findCampusByLabel('')).toBeUndefined()
  })

  it('es case-sensitive — no encuentra con casing incorrecto', () => {
    expect(findCampusByLabel('campus huachi')).toBeUndefined()
    expect(findCampusByLabel('huachi')).toBeUndefined()
  })
})
