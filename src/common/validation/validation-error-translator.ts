import { ValidationError } from '@nestjs/common';
import { getClientMessageField } from '../decorators/client-message-field.decorator';
import { ClientMessage } from '../errors/client-message';

interface SelectedValidationError {
  error: ValidationError;
  constraint: string;
  technicalMessage: string;
}

export interface TranslatedValidationError {
  message: string;
  clientMessage: string;
}

type ValidationMessageFactory = (field: string) => string;

const VALIDATION_CLIENT_MESSAGES: Record<string, ValidationMessageFactory> = {
  isNotEmpty: (field) => `${field} Boş Bırakılamaz.`,
  isString: (field) => `${field} Metin Formatında Olmalıdır.`,
  isNumber: (field) => `${field} Sayısal Bir Değer Olmalıdır.`,
  isInt: (field) => `${field} Tam Sayı Olmalıdır.`,
  isBoolean: (field) => `${field} Doğru veya Yanlış Değeri Olmalıdır.`,
  isEmail: (field) => `${field} Geçerli Bir E-posta Adresi Olmalıdır.`,
  isUUID: (field) => `${field} Geçerli Değildir.`,
  isUuid: (field) => `${field} Geçerli Değildir.`,
  isMongoId: (field) => `${field} Geçerli Değildir.`,
  isEnum: (field) => `${field} İzin Verilen Değerlerden Biri Olmalıdır.`,
  isArray: (field) => `${field} Liste Formatında Olmalıdır.`,
  arrayNotEmpty: (field) => `${field} Boş Bir Liste Olamaz.`,
  arrayMaxSize: (field) => `${field} İzin Verilen Liste Boyutunu Aşamaz.`,
  minLength: (field) => `${field} İzin Verilen En Az Uzunlukta Olmalıdır.`,
  maxLength: (field) => `${field} İzin Verilen En Fazla Uzunluğu Aşamaz.`,
  min: (field) => `${field} İzin Verilen En Küçük Değerden Az Olamaz.`,
  max: (field) => `${field} İzin Verilen En Büyük Değeri Aşamaz.`,
  isDateString: (field) => `${field} Geçerli Bir Tarih Olmalıdır.`,
  nestedValidation: (field) => `${field} Geçerli Değildir.`,
};

export function translateValidationErrors(
  errors: ValidationError[],
): TranslatedValidationError {
  const selected = selectValidationError(errors);
  if (!selected) {
    return {
      message: 'Validation failed',
      clientMessage: ClientMessage.BadRequest,
    };
  }

  if (selected.constraint === 'whitelistValidation') {
    return {
      message: selected.technicalMessage,
      clientMessage: `${selected.error.property} Alanı Bu İstek İçin Desteklenmiyor.`,
    };
  }

  const field =
    getClientMessageField(selected.error.target, selected.error.property) ??
    selected.error.property;
  const messageFactory = VALIDATION_CLIENT_MESSAGES[selected.constraint];

  return {
    message: selected.technicalMessage,
    clientMessage: messageFactory?.(field) ?? ClientMessage.BadRequest,
  };
}

function selectValidationError(
  errors: ValidationError[],
): SelectedValidationError | undefined {
  for (const error of errors) {
    const nested = selectValidationError(error.children ?? []);
    if (nested) return nested;

    const constraints = error.constraints ?? {};
    const constraint =
      Object.entries(constraints).find(([key]) => key === 'isNotEmpty') ??
      Object.entries(constraints)[0];
    if (constraint) {
      return {
        error,
        constraint: constraint[0],
        technicalMessage: constraint[1],
      };
    }
  }

  return undefined;
}
