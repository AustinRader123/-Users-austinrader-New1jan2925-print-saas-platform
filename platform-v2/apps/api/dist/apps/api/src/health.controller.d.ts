export declare class HealthController {
    health(): {
        ok: boolean;
        service: string;
        ts: string;
    };
    version(): {
        version: string;
        commit: string;
        buildTime: string;
        env: string;
    };
}
