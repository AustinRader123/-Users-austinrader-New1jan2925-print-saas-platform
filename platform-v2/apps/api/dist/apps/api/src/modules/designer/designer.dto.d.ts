export declare class SaveDesignDto {
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
}
