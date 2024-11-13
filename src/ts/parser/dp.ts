import { ByteReader } from "../reader.js";
import {
  ClutInfo,
  ColourWithAlpha,
  FileParser,
  Flags,
  FormatInfo,
  PixelData,
  PixelInfo,
  PixelMode,
} from "../types.js";

export class DPParser extends FileParser {
  constructor() {
    super();
  }

  public getName(): string {
    return "DPParser";
  }

  /**
   * Extracts the TIM format information (id, version) from the `reader`. Assumes
   * that the `reader` is in the correct position.
   *
   * If the parsed id is not `0x10`, throws an error.
   *
   * @param {ByteReader} reader - a ByteReader object
   * @returns {FormatInfo} format information, including the id and version
   */
  private parseFormatInfo(reader: ByteReader): FormatInfo {
    // Bits 0-7 are our ID value. For TIM images, it must be 0x10
    const id = reader.readByte();
    if (id !== 0x10) {
      throw new Error(
        `parsed ID does not match TIM spec. Expected 0x10, got ${id}`,
      );
    }

    // Bits 8-15 are the version. This will be 0x00 on the PSX
    const version = reader.readByte();

    // Bits 16-32 are Reserved. There shouldn't be anything in there.
    const reservedSpace = reader.readHalf();

    return {
      id,
      version,
      reservedSpace,
    };
  }

  /**
   * Extracts the file flags from the `reader`. Assumes `reader` is in the correct
   * position.
   *
   * @param {ByteReader} reader - a ByteReader object
   * @returns {Flags}  flag information, including how to read the CLUT
   */
  private parseFlags(reader: ByteReader): Flags {
    const data = reader.readWord();

    // Bits 0-3 are the pmode (Pixel Mode)
    const pmode = this.retrieveBits(data, 0, 3);

    // Bit 4 is the cf (CLUT flag)
    const cf = this.retrieveBits(data, 3, 1);

    // Remainder is reserved space.
    const reservedSpace = this.retrieveBits(data, 4, 28);

    return {
      pmode,
      cf,
      reservedSpace,
    };
  }

  /**
   * Extracts the CLUT information from the `reader`. Assumes the `reader` is in
   * the correct position, and that a CLUT exists.
   *
   * @param {ByteReader} reader - a ByteReader object.
   * @returns {ClutInfo} the CLUT
   */
  private parseClutInfo(reader: ByteReader): ClutInfo {
    const [bnum, dx, dy, w, h] = [0x200, 0x0, 0x1e0, 0x100, 0x1];

    const endPosition = reader.position() + bnum;

    const clut: ColourWithAlpha[] = [];

    while (reader.position() < endPosition) {
      const data = reader.readHalf();

      const r = this.retrieveBits(data, 0, 5);
      const g = this.retrieveBits(data, 5, 5);
      const b = this.retrieveBits(data, 10, 5);
      const stp = this.retrieveBits(data, 15, 1);

      clut.push({
        r,
        g,
        b,
        stp,
      });
    }

    return {
      bnum,
      dx,
      dy,
      w,
      h,
      clut,
    };
  }

  /**
   * Extracts the Pixel information for the image from the `reader`. Assumes that
   * the `reader` is in the correct place.
   * @param {ByteReader} reader - a ByteReader object
   * @param {PixelMode} pixelMode - the pixel mode, parsed from the Flags block.
   * @returns {PixelInfo} information on the pixel layout
   */
  private parsePixelInfo(reader: ByteReader, pixelMode: PixelMode): PixelInfo {
    const [bnum, dx, dy, w, h] = [0xa000, 0, 0, 256, 320];

    const data: PixelData[] = [];

    while (reader.position() < bnum) {
      // The reader will blow up if we've ended on a nibble, but deferring
      // that until I have an adequate test image for it.
      const four = reader.readByte();
      data.push(this.retrieveBits(four, 0, 4));
      data.push(this.retrieveBits(four, 4, 4));
    }

    return {
      bnum,
      dx,
      dy,
      w,
      h,
      data,
    };
  }

  /**
   * Given `data`, parses a TIM image file.
   * @param {ArrayBuffer} data - input data
   */
  public parse(data: ArrayBuffer) {
    const reader = new ByteReader(data);
    const pxl = this.parsePixelInfo(reader, PixelMode.CLUT4);
    const palettes = [0, 1, 2, 3].map((i) => this.parseClutInfo(reader));
    return {
      palettes,
      pxl,
    };
  }
}
