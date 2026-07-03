import { Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { mixin } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Empresa } from '../auth/decorators/empresa.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { NotificationCronService } from './notification-cron.service';

export function NotificationCronController() {
  class MixinController {
    readonly service: NotificationCronService;

    @Post('lembretes/manual')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Dispara lembretes manualmente para a empresa logada' })
    dispararManual(@Empresa() empresa: JwtPayload) {
      return this.service.dispararLembretesManual(empresa.sub);
    }
  }

  return mixin(MixinController);
}
