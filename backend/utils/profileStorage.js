const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_PROFILE_BUCKET = 'profile-pictures';

let supabaseClient = null;
let bucketReady = false;

const getBucketName = () => process.env.SUPABASE_PROFILE_BUCKET || DEFAULT_PROFILE_BUCKET;

const getSupabaseClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseClient;
};

const isBucketNotFoundError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('bucket not found') || message.includes('not found');
};

const ensureBucketExists = async () => {
  if (bucketReady) {
    return;
  }

  const bucket = getBucketName();
  const client = getSupabaseClient();

  const { data: existingBuckets, error: listError } = await client.storage.listBuckets();
  if (!listError && Array.isArray(existingBuckets) && existingBuckets.some((b) => b?.name === bucket)) {
    bucketReady = true;
    return;
  }

  const { error: createError } = await client.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: '2MB'
  });

  if (createError && !String(createError.message || '').toLowerCase().includes('already exists')) {
    throw new Error(`Failed to ensure Supabase bucket "${bucket}": ${createError.message}`);
  }

  bucketReady = true;
};

const getExtensionForMimeType = (mimetype, originalName = '') => {
  const extensionByMimeType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  };

  return extensionByMimeType[mimetype] || path.extname(originalName) || '.img';
};

const buildObjectPath = (file, userId) => {
  const extension = getExtensionForMimeType(file?.mimetype, file?.originalname);
  const safeUserId = String(userId || 'user').replace(/[^a-z0-9_-]/gi, '_');
  const uniquePart = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `profiles/${safeUserId}-${uniquePart}${extension}`;
};

const uploadProfilePicture = async (file, userId) => {
  if (!file || !Buffer.isBuffer(file.buffer)) {
    throw new Error('Invalid profile image file payload');
  }

  const bucket = getBucketName();
  const objectPath = buildObjectPath(file, userId);
  const client = getSupabaseClient();

  let { error: uploadError } = await client.storage
    .from(bucket)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
      cacheControl: '3600'
    });

  if (uploadError && isBucketNotFoundError(uploadError)) {
    await ensureBucketExists();

    ({ error: uploadError } = await client.storage
      .from(bucket)
      .upload(objectPath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600'
      }));

    // Supabase bucket visibility can take a moment right after creation.
    if (uploadError && isBucketNotFoundError(uploadError)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      ({ error: uploadError } = await client.storage
        .from(bucket)
        .upload(objectPath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
          cacheControl: '3600'
        }));
    }
  }

  if (uploadError) {
    throw new Error(`Failed to upload profile image to Supabase: ${uploadError.message}`);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    throw new Error('Failed to build public URL for uploaded profile image');
  }

  return data.publicUrl;
};

const getLocalUploadPath = (publicPath) => {
  if (!publicPath || !String(publicPath).startsWith('/uploads/')) {
    return null;
  }

  const normalized = String(publicPath).replace(/\\/g, '/');
  const relative = normalized.replace(/^\/uploads\//, '');
  return path.join(__dirname, '../uploads', relative);
};

const extractSupabaseObjectPath = (storedPath) => {
  if (!storedPath || typeof storedPath !== 'string') {
    return null;
  }

  const bucket = getBucketName();
  const normalized = storedPath.trim();

  if (!normalized) {
    return null;
  }

  if (/^https?:\/\//i.test(normalized)) {
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`
    ];

    for (const marker of markers) {
      const markerIndex = normalized.indexOf(marker);
      if (markerIndex !== -1) {
        const rawObjectPath = normalized.slice(markerIndex + marker.length).split('?')[0];
        return decodeURIComponent(rawObjectPath);
      }
    }

    return null;
  }

  if (normalized.startsWith('profiles/')) {
    return normalized;
  }

  if (normalized.startsWith(`${bucket}/`)) {
    return normalized.slice(bucket.length + 1);
  }

  return null;
};

const deleteProfilePictureAsset = async (storedPath) => {
  if (!storedPath) {
    return;
  }

  const localPath = getLocalUploadPath(storedPath);
  if (localPath) {
    try {
      await fs.promises.unlink(localPath);
    } catch {
      // Ignore cleanup failures.
    }
    return;
  }

  const objectPath = extractSupabaseObjectPath(storedPath);
  if (!objectPath) {
    return;
  }

  try {
    const client = getSupabaseClient();
    const bucket = getBucketName();
    await client.storage.from(bucket).remove([objectPath]);
  } catch {
    // Ignore cleanup failures.
  }
};

module.exports = {
  uploadProfilePicture,
  deleteProfilePictureAsset
};
