import { z } from 'zod';
import { defaultDnEndpoints } from './dn-endpoints.js';
import type { DNApiClient } from './DNApiClient.js';

export const DnInventoryEventSchema = z.object({
  EventID: z.string().optional(),
  Type: z.string().optional(),
  OldQty: z.number().optional(),
  NewQty: z.number().optional(),
  CreatedAt: z.string().optional(),
  SKU: z.string().optional(),
  Location: z.string().optional(),
});

export class DnInventoryEventsClient {
  client: DNApiClient;
  endpoints: typeof defaultDnEndpoints;
  constructor(client: any, endpoints = defaultDnEndpoints) {
    this.client = client;
    this.endpoints = endpoints;
  }

  async *searchByDateRange(params: any = {}) {
    const p = { ...params };
    for await (const raw of this.client.paginate({ url: this.endpoints.inventoryEvents, params: p, pageSize: params.limit || 100, pathToItems: ['events'] })) {
      const parsed = DnInventoryEventSchema.safeParse(raw);
      if (parsed.success) yield parsed.data;
      else yield raw;
    }
  }

  async *searchByIdRange(params: any = {}) {
    const p = { ...params };
    for await (const raw of this.client.paginate({ url: this.endpoints.inventoryEvents, params: p, pageSize: params.limit || 100, pathToItems: ['events'] })) {
      const parsed = DnInventoryEventSchema.safeParse(raw);
      if (parsed.success) yield parsed.data;
      else yield raw;
    }
  }
}
