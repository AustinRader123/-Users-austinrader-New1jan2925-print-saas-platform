import { Injectable } from '@nestjs/common';
import { SaveDesignDto } from './designer.dto';

@Injectable()
export class DesignerService {
  private readonly designs = new Map<string, any>();

  save(tenantId: string, storeId: string, userId: string, input: SaveDesignDto) {
    const id = `des_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const created = {
      id,
      tenantId,
      storeId,
      userId,
      ...input,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.designs.set(id, created);
    return created;
  }

  list(tenantId: string) {
    return Array.from(this.designs.values())
      .filter((d) => d.tenantId === tenantId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.id < b.id ? 1 : -1));
  }
}
