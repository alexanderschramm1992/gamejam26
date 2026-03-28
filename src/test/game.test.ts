import { describe, expect, it } from 'vitest'
import { circleIntersectsRect, distance, resolveCircleRectCollision } from '../../shared/game.js'

describe('Shared Geometrie', () => {
  it('berechnet Distanzen stabil', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('erkennt Kreis-Rechteck-Kollisionen', () => {
    expect(circleIntersectsRect({ x: 10, y: 10, radius: 8 }, { x: 0, y: 0, width: 12, height: 12 })).toBe(true)
  })

  it('schiebt kollidierende Kreise aus Gebaeuden heraus', () => {
    const entity = { x: 20, y: 20, radius: 10 }
    const rect = { x: 10, y: 10, width: 30, height: 30 }
    const collided = resolveCircleRectCollision(entity, rect)

    expect(collided).toBe(true)
    expect(circleIntersectsRect(entity, rect)).toBe(false)
  })
})
