import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../dto/jwt-payload.dto';

export const Empresa = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.empresa;
  },
);
