// Status do vídeo retornado pela API do Bunny Stream (GET /videos/{id}).
export enum BunnyVideoStatus {
  Created = 0,
  Uploaded = 1,
  Processing = 2,
  Transcoding = 3,
  Finished = 4,
  Error = 5,
  UploadFailed = 6,
  JitSegmenting = 7,
  JitPlaylistsCreated = 8,
}

export interface BunnyVideo {
  guid: string;
  videoLibraryId: number;
  title: string;
  length: number;
  status: BunnyVideoStatus;
  encodeProgress: number;
  thumbnailFileName: string | null;
}

export interface BunnyWebhookPayload {
  VideoLibraryId: number;
  VideoGuid: string;
  Status: number;
}

export interface BunnyUploadCredentials {
  endpoint: string;
  headers: {
    AuthorizationSignature: string;
    AuthorizationExpire: string;
    VideoId: string;
    LibraryId: string;
  };
  expires_at: string;
}
