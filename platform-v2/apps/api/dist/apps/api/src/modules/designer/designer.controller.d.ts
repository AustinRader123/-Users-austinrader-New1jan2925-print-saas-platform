import { DesignerService } from './designer.service';
import { SaveDesignDto } from './designer.dto';
export declare class DesignerController {
    private readonly service;
    constructor(service: DesignerService);
    save(tenantId: string, storeId: string, userId: string, body: SaveDesignDto): {
        version: number;
        createdAt: string;
        updatedAt: string;
        name: string;
        canvasWidth: number;
        canvasHeight: number;
        layers: Array<{
            type: string;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation?: number;
            content: Record<string, unknown>;
        }>;
        previewUrl?: string;
        id: string;
        tenantId: string;
        storeId: string;
        userId: string;
    };
    list(tenantId: string): any[];
}
