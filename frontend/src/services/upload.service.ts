import { apiUpload } from './api';

export interface UploadResponse {
  url: string;
  key?: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload<UploadResponse>('/uploads/images', formData);
}
