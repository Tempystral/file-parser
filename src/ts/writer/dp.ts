import { toFillColour } from "../colour";
import { ClutInfo, FileScribe, PixelInfo } from "../types";

export class DPScribe extends FileScribe<{
  palettes: ClutInfo[];
  pxl: PixelInfo;
}> {
  public write(data: { palettes: ClutInfo[]; pxl: PixelInfo }, pal = 0): void {
    const { pxl: pixels, palettes } = data;
    this.canvas.width = pixels.w * 2;
    this.canvas.height = pixels.h * 2;

    this.ctx.scale(2, 2);
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, pixels.w, pixels.h);

    // Draw pxl
    // TODO: Draw this less jankily
    // Create a canvas writer interface for each format
    for (let i = 0; i < pixels.w; i++) {
      for (let j = 0; j < pixels.h; j++) {
        const byte = i + j * pixels.w;
        const p = pixels.data[byte] as number;
        let pi = pal;
        if (byte >= 0x8000 && byte <= 0x10000) {
          pi = 3;
        }
        const palette = palettes[pi];
        const colour = toFillColour(
          //palette.clut[p * (1 + Math.floor(i / (pixels.w / 4)))],
          palette.clut[p],
        );
        this.drawPixel(colour, i, j);
      }
    }

    // Draw clt
    // TODO: Draw this based on its location and size in the file
    // Maybe also draw it in its own segment of the canvas or another canvas
    let pi = 0;
    for (let clut of palettes) {
      for (let x = 0; x < clut.w; x++) {
        for (let y = 0; y < clut.h; y++) {
          const pixel = x + y * clut.w;
          const c = clut.clut[pixel];
          this.drawPixel(toFillColour(c), x, pixels.h + y + pi);

          /* console.log(
                `Filled ${i},${pxl.h + pal + j} with ${toHex(toRBG888(c))}`,
              ); */
        }
      }
      pi++;
    }
  }
}
