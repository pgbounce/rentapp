export interface ApiErrorDetail {
  code: string;
  message: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiMeta {
  requestId: string;
}

export interface ApiErrorResponse {
  error: ApiError;
  meta: ApiMeta;
}
