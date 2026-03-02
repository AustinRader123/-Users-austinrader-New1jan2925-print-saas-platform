import { UsersService } from './users.service';
export declare class UsersController {
    private readonly service;
    constructor(service: UsersService);
    list(tenantId: string): {
        id: string;
        tenantId: string;
        email: string;
        role: string;
        updatedAt: string;
    }[];
}
