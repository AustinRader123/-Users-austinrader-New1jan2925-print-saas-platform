import { StoresService } from './stores.service';
export declare class StoresController {
    private readonly service;
    constructor(service: StoresService);
    list(tenantId: string): {
        id: string;
        tenantId: string;
        slug: string;
        name: string;
        updatedAt: string;
    }[];
}
