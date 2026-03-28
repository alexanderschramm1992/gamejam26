import { beforeEach, describe, expect, it } from 'vitest'

describe('Client Shell', () => {
  let canvas: HTMLCanvasElement | null
  let joinForm: HTMLFormElement | null

  beforeEach(() => {
    canvas = document.querySelector<HTMLCanvasElement>('#canvas')
    joinForm = document.querySelector<HTMLFormElement>('#join-form')
  })

  it('stellt ein Canvas bereit', () => {
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
  })

  it('stellt ein Join-Formular bereit', () => {
    expect(joinForm).toBeInstanceOf(HTMLFormElement)
  })
})
