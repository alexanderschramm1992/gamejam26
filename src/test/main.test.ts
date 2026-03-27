import { describe, it, expect, beforeEach } from 'vitest'

describe('Canvas Rendering', () => {
  let canvas: HTMLCanvasElement

  beforeEach(() => {
    canvas = document.querySelector<HTMLCanvasElement>('#canvas')!
  })

  it('should have a canvas element in the DOM', () => {
    expect(canvas).toBeDefined()
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
  })
})
