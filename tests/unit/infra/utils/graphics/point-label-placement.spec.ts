import { describe, expect, it } from 'vitest'

import {
  pointLabelPlacement,
  svgPointLabelAttrs,
} from '@/infra/utils/graphics/point-label-placement'

describe('pointLabelPlacement', () => {
  it('centres a bottom label under the dot', () => {
    expect(pointLabelPlacement('b')).toEqual({
      offset: [0, -11],
      anchorX: 'middle',
      anchorY: 'top',
    })
  })

  it('anchors a left label by its right edge', () => {
    expect(pointLabelPlacement('l')).toEqual({
      offset: [-11, 0],
      anchorX: 'right',
      anchorY: 'middle',
    })
  })

  it('splits the gap across both axes on diagonals', () => {
    expect(pointLabelPlacement('tl')).toEqual({
      offset: [-8, 8],
      anchorX: 'right',
      anchorY: 'bottom',
    })
  })

  it('centres the label on the dot for m', () => {
    expect(pointLabelPlacement('m')).toEqual({
      offset: [0, 0],
      anchorX: 'middle',
      anchorY: 'middle',
    })
  })

  it('uses the fallback for missing or unknown positions', () => {
    expect(pointLabelPlacement()).toEqual(pointLabelPlacement('r'))
    expect(pointLabelPlacement('nope')).toEqual(pointLabelPlacement('r'))
    expect(pointLabelPlacement(undefined, { fallback: 'tr' })).toEqual(pointLabelPlacement('tr'))
  })

  it('honours a custom gap', () => {
    expect(pointLabelPlacement('b', { gapPx: 14 }).offset).toEqual([0, -14])
    expect(pointLabelPlacement('tr', { gapPx: 14 }).offset).toEqual([10, 10])
  })
})

describe('svgPointLabelAttrs', () => {
  it('flips y for a top label', () => {
    expect(svgPointLabelAttrs(pointLabelPlacement('t'))).toEqual({
      dx: 0,
      dy: -11,
      textAnchor: 'middle',
      dominantBaseline: 'auto',
    })
  })

  it('flips y for a bottom-left label', () => {
    expect(svgPointLabelAttrs(pointLabelPlacement('bl'))).toEqual({
      dx: -8,
      dy: 8,
      textAnchor: 'end',
      dominantBaseline: 'hanging',
    })
  })
})
