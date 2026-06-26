export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string;
  isPremium: boolean;
  createdAt: string;
}

export interface DownloadRecord {
  id: string;
  url: string;
  downloadUrl: string;
  title: string;
  platform: "youtube" | "instagram" | "unknown";
  quality: string;
  downloadedAt: string;
}

export interface DownloadState {
  isDownloading: boolean;
  progress: number;
  statusText: string;
  error: string | null;
  downloadUrl: string | null;
  title: string | null;
  platform: "youtube" | "instagram" | "unknown";
  quality: string;
}
export interface VideoInfo {
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string;
  uploadDate: string;
  viewCount: number;
  webpageUrl: string;

  formats: {
    quality: number;
    ext: string;
    filesize?: number;
  }[];
}