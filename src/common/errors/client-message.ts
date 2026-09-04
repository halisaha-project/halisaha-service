import { ErrorType } from './error-type';

export enum ClientMessage {
  BadRequest = 'Geçersiz İstek.',
  Unauthorized = 'Oturum Doğrulanamadı.',
  Forbidden = 'Bu İşlem İçin Yetkiniz Bulunmamaktadır.',
  NotFound = 'İstenen Kayıt Bulunamadı.',
  Conflict = 'İşlem Mevcut Verilerle Çakışmaktadır.',
  UnprocessableEntity = 'İşlem Gerçekleştirilemedi.',
  TooManyRequests = 'Çok Fazla İstek Gönderildi. Lütfen Daha Sonra Tekrar Deneyin.',
  InternalServerError = 'Beklenmeyen Bir Hata Oluştu.',
}

const FALLBACK_MESSAGES: Record<ErrorType, ClientMessage> = {
  [ErrorType.BadRequest]: ClientMessage.BadRequest,
  [ErrorType.Unauthorized]: ClientMessage.Unauthorized,
  [ErrorType.Forbidden]: ClientMessage.Forbidden,
  [ErrorType.NotFound]: ClientMessage.NotFound,
  [ErrorType.Conflict]: ClientMessage.Conflict,
  [ErrorType.UnprocessableEntity]: ClientMessage.UnprocessableEntity,
  [ErrorType.TooManyRequests]: ClientMessage.TooManyRequests,
  [ErrorType.InternalServerError]: ClientMessage.InternalServerError,
};

export function clientMessageForErrorType(type: ErrorType): ClientMessage {
  return FALLBACK_MESSAGES[type];
}
