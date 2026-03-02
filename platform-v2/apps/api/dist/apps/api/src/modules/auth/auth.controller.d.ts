import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto, tenantIdHeader?: string): Promise<{
        token: string;
        refreshToken: string;
        tenantId: string;
        permissions: string[];
    }>;
}
