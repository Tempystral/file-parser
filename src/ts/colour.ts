import { ColourWithAlpha } from "./types";

export function toRBG888(c: ColourWithAlpha): ColourWithAlpha {
  return {
    r: Math.floor((c.r * 255) / 31),
    g: Math.floor((c.g * 255) / 31),
    b: Math.floor((c.b * 255) / 31),
    stp: c.stp,
  };
}

export function toHex(c: ColourWithAlpha) {
  let trans = "FF";
  if (c.r || c.g || c.b) {
    if (c.stp == 1) trans = "7F"; // semi-transparent
  } else {
    if (c.stp == 0) trans = "00"; // fully transparent
  }
  return `#${toHexPart(c.r)}${toHexPart(c.g)}${toHexPart(c.b)}${trans}`;
}

export function toHexPart(colour: number) {
  return colour ? colour.toString(16) : "00";
}

export function toFillColour(c: ColourWithAlpha) {
  return `${toHex(toRBG888(c))}`;
}
