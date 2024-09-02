import chroma from "chroma-js"
import _ from "lodash"
import { Action } from "./zustand"


export function updateObjectTypeColors(
  objectTypeSubset: string[],
  setObjectTypeColors: Action["setObjectTypeColors"]
) {
  setObjectTypeColors(prevColors => {
    // Only update colors if object type subset has changed
    const objectTypesWithColor = Object.keys(prevColors ?? {})
    if (prevColors && objectTypeSubset.length == objectTypesWithColor.length && objectTypeSubset.every(ot => objectTypesWithColor.includes(ot)))
      return prevColors
    // Generate new colors
    const palette = generateColorPalette(objectTypeSubset.length)
    return Object.fromEntries(objectTypeSubset.map((ot, i) => [ot, palette[i]]))
  })
}

export function generateColorPalette(numColors: number): chroma.Color[] {

  const offset = _.random(360)
  const hues = _.range(0, 360, 360 / numColors).map(h => (h + offset) % 360)
  const colors = hues.map(h => chroma.hsl(
    h + _.random(-3, 3),  // hue
    _.random(.6, .9),  // saturation
    _.random(.2, .5)  // value (brightness)
  ))
  return colors

}
