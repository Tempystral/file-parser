export abstract class FileParser {
  public abstract getName(): string;
  public abstract parse(data: ArrayBuffer): Object;

  public retrieveBits(input: number, index: number, bits: number) {
    const mask = ((1 << bits) - 1) << index;
    return (input & mask) >> index;
  }
}

export abstract class FileScribe<T extends Object> {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    let ctx = canvas.getContext("2d");
    if (ctx) {
      this.ctx = ctx;
    } else throw Error();
  }

  protected drawPixel(
    style: CanvasFillStrokeStyles["fillStyle"],
    x: number,
    y: number,
  ): void {
    this.ctx.fillStyle = style;
    this.ctx.fillRect(x, y, 1, 1);
  }

  public abstract write(data: T, palette?: number): void;
}

/**
 * PSX TIM Pixel Mode Flags
 */
export enum PixelMode {
  CLUT4 = 0,
  CLUT8 = 1,
  Direct15 = 2,
  Direct24 = 3,
  Mixed = 4,
}

export interface FormatInfo {
  id: number;
  version: number;
  reservedSpace: number;
}

export interface Flags {
  pmode: PixelMode;
  cf: number;
  reservedSpace: number;
}

export interface Colour {
  r: number;
  g: number;
  b: number;
}

export interface ColourWithAlpha extends Colour {
  stp: number;
}

export interface ClutInfo {
  bnum: number;
  dx: number;
  dy: number;
  w: number;
  h: number;
  clut: ColourWithAlpha[];
}

export type PixelData = Colour | ColourWithAlpha | number;

export interface PixelInfo {
  bnum: number;
  dx: number;
  dy: number;
  w: number;
  h: number;
  data: PixelData[];
}

export interface TimImage {
  id: FormatInfo;
  flags: Flags;
  clut?: ClutInfo;
  pixels: PixelInfo;
}
