import { ErrorType } from '../errors/error-type';

export interface ApiSuccessResponse<T> {
  statusCode: number;
  success: true;
  timestamp: string;
  path: string;
  data: T;
  error: null;
}

export interface ApiError {
  message: string;
  type: ErrorType;
  clientMessage: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  success: false;
  timestamp: string;
  path: string;
  data: null;
  error: ApiError;
}
