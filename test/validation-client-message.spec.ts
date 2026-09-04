import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  validate,
  ValidateNested,
  ValidationError,
} from 'class-validator';
import { ClientMessageField } from '../src/common/decorators/client-message-field.decorator';
import { ClientMessage } from '../src/common/errors/client-message';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { translateValidationErrors } from '../src/common/validation/validation-error-translator';
import { validationExceptionFactory } from '../src/bootstrap';

class RequiredNameDto {
  @ClientMessageField('Takım Adı')
  @IsNotEmpty()
  name!: string;
}

class StringNameDto {
  @ClientMessageField('Takım Adı')
  @IsString()
  name!: string;
}

class UuidDto {
  @ClientMessageField('Şube Id')
  @IsUUID('4')
  branchId!: string;
}

class EmailDto {
  @ClientMessageField('E-posta Adresi')
  @IsEmail()
  email!: string;
}

class UnlabeledDto {
  @IsNotEmpty()
  username!: string;
}

class AddressDto {
  @ClientMessageField('Şehir')
  @IsNotEmpty()
  cityId!: string;
}

class NestedDto {
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}

async function translate(dto: object) {
  return translateValidationErrors(await validate(dto));
}

describe('validation client-message infrastructure', () => {
  it('generates required and string messages from field metadata', async () => {
    const required = new RequiredNameDto();
    required.name = '';
    await expect(translate(required)).resolves.toEqual({
      message: 'name should not be empty',
      clientMessage: 'Takım Adı Boş Bırakılamaz.',
    });

    const string = new StringNameDto();
    string.name = 1 as unknown as string;
    await expect(translate(string)).resolves.toEqual({
      message: 'name must be a string',
      clientMessage: 'Takım Adı Metin Formatında Olmalıdır.',
    });
  });

  it('generates UUID and email messages', async () => {
    const uuid = new UuidDto();
    uuid.branchId = 'invalid';
    expect((await translate(uuid)).clientMessage).toBe(
      'Şube Id Geçerli Değildir.',
    );

    const email = new EmailDto();
    email.email = 'invalid';
    expect((await translate(email)).clientMessage).toBe(
      'E-posta Adresi Geçerli Bir E-posta Adresi Olmalıdır.',
    );
  });

  it('falls back to the property name when metadata is absent', async () => {
    const dto = new UnlabeledDto();
    dto.username = '';

    expect((await translate(dto)).clientMessage).toBe(
      'username Boş Bırakılamaz.',
    );
  });

  it('uses a dedicated safe message for forbidden unknown fields', async () => {
    const dto = Object.assign(new StringNameDto(), {
      name: 'valid',
      unexpected: true,
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(translateValidationErrors(errors)).toEqual({
      message: 'property unexpected should not exist',
      clientMessage: 'unexpected Alanı Bu İstek İçin Desteklenmiyor.',
    });
  });

  it('resolves metadata on a nested DTO field', async () => {
    const child = new AddressDto();
    child.cityId = '';
    const dto = new NestedDto();
    dto.address = child;

    expect((await translate(dto)).clientMessage).toBe('Şehir Boş Bırakılamaz.');
  });

  it('uses the generic bad-request message for unknown constraints', () => {
    const error: ValidationError = {
      property: 'custom',
      constraints: { customConstraint: 'custom failed' },
    };

    expect(translateValidationErrors([error])).toEqual({
      message: 'custom failed',
      clientMessage: ClientMessage.BadRequest,
    });
  });

  it('flows through ApplicationException and the standard error envelope', async () => {
    const dto = new RequiredNameDto();
    dto.name = '';
    const exception = validationExceptionFactory(await validate(dto));
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ originalUrl: '/api/v1/test' }),
      }),
    } as never;

    new HttpExceptionFilter().catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      success: false,
      timestamp: expect.any(String),
      path: '/api/v1/test',
      data: null,
      error: {
        message: 'name should not be empty',
        type: 'BAD_REQUEST',
        clientMessage: 'Takım Adı Boş Bırakılamaz.',
      },
    });
  });
});
