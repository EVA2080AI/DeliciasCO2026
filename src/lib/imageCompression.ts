import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  
  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert Blob to File to maintain compatibility with Supabase SDKs and FormData
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Fallback to original
  }
};
