import { Controller, Get } from '@nestjs/common';

@Controller('api/roles')
export class RolesController {
  @Get('matrix')
  matrix() {
    return {
      roles: [
        { key: 'admin', permissions: ['*'] },
        { key: 'sales', permissions: ['quotes.read', 'quotes.write', 'orders.read'] },
        { key: 'production', permissions: ['production.read', 'production.write', 'inventory.read'] },
      ],
    };
  }
}
