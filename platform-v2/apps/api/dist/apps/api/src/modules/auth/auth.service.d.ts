import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly jwt;
    constructor(jwt: JwtService);
    login(email: string, password: string, tenantId: string): Promise<{
        token: string;
        refreshToken: string;
        tenantId: string;
        permissions: string[];
    }>;
}
