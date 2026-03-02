"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestIdInterceptor = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
let RequestIdInterceptor = class RequestIdInterceptor {
    intercept(context, next) {
        const http = context.switchToHttp();
        const req = http.getRequest();
        const res = http.getResponse();
        const incoming = req.headers?.['x-request-id'];
        const requestId = incoming && String(incoming).trim() ? String(incoming) : (0, crypto_1.randomUUID)();
        req.requestId = requestId;
        res.setHeader('x-request-id', requestId);
        return next.handle();
    }
};
exports.RequestIdInterceptor = RequestIdInterceptor;
exports.RequestIdInterceptor = RequestIdInterceptor = __decorate([
    (0, common_1.Injectable)()
], RequestIdInterceptor);
//# sourceMappingURL=request-id.interceptor.js.map