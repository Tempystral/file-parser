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
  TimImage,
} from "../types.js";

export class TIMParser extends FileParser {
  constructor() {
    super();
  }

  public getName(): string {
    return "TIMParser";
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
    const bnum = reader.readWord();

    const dx = reader.readHalf();
    const dy = reader.readHalf();

    const w = reader.readHalf();
    const h = reader.readHalf();

    // bnum - 12, as we've just parsed 12 bytes.
    const endPosition = reader.position() + (bnum - 12);

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
   *
   * Requires `pixelMode` parsed from `parseFlags` to correctly interpret the
   * `PixelData` parts.
   *
   * Note, parsing Mixed mode is not supported. PSX docs are rather unclear on
   * _how_ you might parse mixed TIM data.
   *
   * @param {ByteReader} reader - a ByteReader object
   * @param {PixelMode} pixelMode - the pixel mode, parsed from the Flags block.
   * @returns {PixelInfo} information on the pixel layout
   */
  private parsePixelInfo(reader: ByteReader, pixelMode: PixelMode): PixelInfo {
    const bnum = reader.readWord();
    const dx = reader.readHalf();
    const dy = reader.readHalf();
    const w = reader.readHalf();
    const h = reader.readHalf();

    // bnum - 12, as we've just parsed 12 bytes.
    const endPosition = reader.position() + (bnum - 12);

    const data: PixelData[] = [];

    while (reader.position() < endPosition) {
      switch (pixelMode) {
        case PixelMode.CLUT4:
          // The reader will blow up if we've ended on a nibble, but deferring
          // that until I have an adequate test image for it.
          const four = reader.readByte();
          data.push(this.retrieveBits(four, 0, 4));
          data.push(this.retrieveBits(four, 4, 4));
          break;
        case PixelMode.CLUT8:
          // The docs indicate that the 8-bit CLUT operates on words, but in
          // reality, you can actually end up on a half-word (as per our test)
          // so, this'll end up with more iterations, but handle those half-word
          // cases.
          const eight = reader.readHalf();
          data.push(this.retrieveBits(eight, 0, 8));
          data.push(this.retrieveBits(eight, 8, 8));
          break;
        case PixelMode.Direct15:
          const fifteen = reader.readWord();
          const r = this.retrieveBits(fifteen, 0, 5);
          const g = this.retrieveBits(fifteen, 15, 5);
          const b = this.retrieveBits(fifteen, 10, 5);
          const stp = this.retrieveBits(fifteen, 15, 1);

          data.push({
            r,
            g,
            b,
            stp,
          });

          break;
        case PixelMode.Direct24:
          const x = reader.readHalf();
          const y = reader.readHalf();
          const z = reader.readHalf();

          data.push({
            r: this.retrieveBits(x, 0, 8),
            g: this.retrieveBits(x, 8, 8),
            b: this.retrieveBits(y, 0, 8),
          });

          data.push({
            r: this.retrieveBits(y, 8, 8),
            g: this.retrieveBits(z, 0, 8),
            b: this.retrieveBits(z, 8, 8),
          });
          break;
        case PixelMode.Mixed:
          throw new Error("Mixed pixel mode not supported.");
      }
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
   * @returns {TimImage} an object representing the TIM image
   */
  public parse(data: ArrayBuffer): TimImage {
    const reader = new ByteReader(data);
    const id = this.parseFormatInfo(reader);
    const flags = this.parseFlags(reader);
    if (flags.cf === 1) {
      return {
        id,
        flags,
        clut: this.parseClutInfo(reader),
        pixels: this.parsePixelInfo(reader, flags.pmode),
      };
    }

    return {
      id,
      flags,
      pixels: this.parsePixelInfo(reader, flags.pmode),
    };
  }
}
