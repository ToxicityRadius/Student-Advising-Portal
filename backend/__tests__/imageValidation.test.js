const {
  detectImageMimeFromBuffer,
  validateUploadedImageFile
} = require('../utils/imageValidation');

const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x10, 0x20]);
const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);
const webpBuffer = Buffer.from([
  0x52, 0x49, 0x46, 0x46,
  0x00, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x20
]);

describe('imageValidation utils', () => {
  test('detects JPEG, PNG, and WEBP signatures', () => {
    expect(detectImageMimeFromBuffer(jpegBuffer)).toBe('image/jpeg');
    expect(detectImageMimeFromBuffer(pngBuffer)).toBe('image/png');
    expect(detectImageMimeFromBuffer(webpBuffer)).toBe('image/webp');
  });

  test('returns null for unknown signatures', () => {
    const randomBuffer = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb]);
    expect(detectImageMimeFromBuffer(randomBuffer)).toBeNull();
  });

  test('rejects files with mismatched mimetype and content', () => {
    const error = validateUploadedImageFile({
      mimetype: 'image/png',
      buffer: jpegBuffer
    });

    expect(error).toBe('Uploaded image type does not match the provided file MIME type.');
  });

  test('accepts valid image file payload', () => {
    const error = validateUploadedImageFile({
      mimetype: 'image/png',
      buffer: pngBuffer
    });

    expect(error).toBeNull();
  });
});
