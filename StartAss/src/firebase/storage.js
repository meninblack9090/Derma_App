import * as FileSystem from 'expo-file-system/legacy';

// ─── ImgBB free API key ─────────────────────────────────────────────────────
// Get yours at: https://api.imgbb.com/
const IMGBB_API_KEY = '7df594957fcd6c6a3cc6d608851f17c0';

// ─── Upload a scan image via ImgBB (free, no Firebase Storage needed) ────────
export const uploadScanImage = async (uid, uri, onProgress) => {
  try {
    onProgress?.(10);
    onProgress?.(30);

    // 2. Upload to ImgBB natively using the file URI
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);
    
    // In React Native, append a file to FormData by passing an object with uri, name, and type
    formData.append('image', {
      uri: uri,
      name: `scan_${uid}_${Date.now()}.jpg`,
      type: 'image/jpeg',
    });

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    onProgress?.(80);

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'Image upload failed');
    }

    const url = result.data.url;

    onProgress?.(100);

    return { url, path: result.data.id };
  } catch (err) {
    throw err;
  }
};

// ─── Delete not supported on ImgBB free tier ─────────────────────────────────
export const deleteScanImage = () => Promise.resolve();
