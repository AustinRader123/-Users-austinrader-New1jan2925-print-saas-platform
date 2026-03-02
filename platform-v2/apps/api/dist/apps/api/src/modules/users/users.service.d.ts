export declare class UsersService {
    list(tenantId: string): {
        id: string;
        tenantId: string;
        email: string;
        role: string;
        updatedAt: string;
    }[];
}
