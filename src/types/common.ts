export type ApiError = {
  code: string
  message: string
  field?: string
  detail: string
}

export interface ApiErrorDetail {
  field: string;
  message: string;
  type: string;
}

export interface ApiErrorResponse {
  error_code: string;
  detail: string;
  request_id: string;
  errors: ApiErrorDetail[];
}