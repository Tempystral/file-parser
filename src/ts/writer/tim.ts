import { toFillColour } from "../colour";
import { FileScribe, PixelMode, TimImage } from "../types";

export class TIMScribe extends FileScribe<TimImage> {
  public write(data: TimImage, pal = 0): void {
    const { flags, id, pixels, clut } = data;

    let width = pixels.w;
    let height = pixels.h;

    if (flags.cf && clut) {
      if (flags.pmode === PixelMode.CLUT8) {
        width *= 2;
      } else if (flags.pmode === PixelMode.CLUT4) {
        width *= 4;
      }
    }

    this.canvas.width = width * 2;
    this.canvas.height = height * 2;

    this.ctx.scale(2, 2);
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, width, height);

    // Draw pxl
    // TODO: Draw this less jankily
    // Create a canvas writer interface for each format
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        if (flags.cf && clut) {
          if (flags.pmode === PixelMode.CLUT8) {
            const byte = i + j * width;
            const p = pixels.data[byte] as number;
            const palette = clut.clut[p];
            this.drawPixel(toFillColour(palette), i, j);
          }
          if (flags.pmode === PixelMode.CLUT4) {
            const byte = i + j * width;
            const p = pixels.data[byte] as number;
            const palette = clut.clut[p];
            this.drawPixel(toFillColour(palette), i, j);
          }
        }
      }
    }

    // Draw clt
    // TODO: Draw this based on its location and size in the file
    // Maybe also draw it in its own segment of the canvas or another canvas
    /* let pi = 0;
    for (let clut of palettes) {
      for (let x = 0; x < clut.w; x++) {
        for (let y = 0; y < clut.h; y++) {
          const pixel = x + y * clut.w;
          const c = clut.clut[pixel];
          ctx.fillStyle = toFillColour(c);
          ctx.fillRect(x, pxl.h + pi + y, 1, 1);
        }
      }
      pi++;
    } */
  }
}
