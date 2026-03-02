import { SaveDesignDto } from './designer.dto';
export declare class DesignerService {
    private readonly designs;
    save(tenantId: string, storeId: string, userId: string, input: SaveDesignDto): {
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
