const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const hasPrefix = (buffer, signature) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < signature.length) {
    return false;
  }

  return signature.every((value, index) => buffer[index] === value);
};

const detectImageMimeFromBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 3) {
    return null;
  }

  if (hasPrefix(buffer, [0xFF, 0xD8, 0xFF])) {
    return 'image/jpeg';
  }

  if (hasPrefix(buffer, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
    return 'image/png';
  }

  if (
    buffer.length >= 12
    &&
    hasPrefix(buffer, [0x52, 0x49, 0x46, 0x46])
    && buffer[8] === 0x57
    && buffer[9] === 0x45
    && buffer[10] === 0x42
    && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
};

const validateUploadedImageFile = (file, allowedMimeTypes = ALLOWED_IMAGE_MIME_TYPES) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    return 'Image file payload is invalid.';
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return 'Only JPEG, PNG, and WEBP image files are allowed.';
  }

  const detectedMimeType = detectImageMimeFromBuffer(file.buffer);
  if (!detectedMimeType || !allowedMimeTypes.includes(detectedMimeType)) {
    return 'Uploaded file content is not a valid JPEG, PNG, or WEBP image.';
  }

  if (detectedMimeType !== file.mimetype) {
    return 'Uploaded image type does not match the provided file MIME type.';
  }

  return null;
};

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  detectImageMimeFromBuffer,
  validateUploadedImageFile
};
