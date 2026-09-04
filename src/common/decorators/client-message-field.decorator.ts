import 'reflect-metadata';

const CLIENT_MESSAGE_FIELD_METADATA = Symbol('client-message-field');

export function ClientMessageField(label: string): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Reflect.defineMetadata(
      CLIENT_MESSAGE_FIELD_METADATA,
      label,
      target,
      propertyKey,
    );
  };
}

export function getClientMessageField(
  target: object | undefined,
  property: string,
): string | undefined {
  if (!target) return undefined;

  return Reflect.getMetadata(
    CLIENT_MESSAGE_FIELD_METADATA,
    Object.getPrototypeOf(target) as object,
    property,
  ) as string | undefined;
}
