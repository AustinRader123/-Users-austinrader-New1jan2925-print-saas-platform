import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  list(tenantId: string) {
    return [
      { id: 'u_admin', tenantId, email: 'admin@example.com', role: 'admin', updatedAt: new Date().toISOString() },
      { id: 'u_sales', tenantId, email: 'sales@example.com', role: 'sales', updatedAt: new Date().toISOString() },
    ].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.id < b.id ? 1 : -1));
  }
}
