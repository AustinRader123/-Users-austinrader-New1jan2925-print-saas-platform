import { Injectable } from '@nestjs/common';

@Injectable()
export class StoresService {
  list(tenantId: string) {
    return [
      { id: 's_default', tenantId, slug: 'default', name: 'Default Store', updatedAt: new Date().toISOString() },
    ];
  }
}
