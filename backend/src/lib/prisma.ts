import { PrismaClient } from '@prisma/client';
import { getTenantId } from './tenantContext.js';

// Central Prisma client singleton used across services
// Prefer importing `prisma` from this module instead of creating new PrismaClient() instances.
const prisma = new PrismaClient();

// Models that include `tenantId` and should be automatically scoped when a tenant is present.
const TENANT_SCOPED_MODELS = new Set([
	'TenantUser',
	'Role',
	'AuditLog',
	'Store',
	'DecoNetworkConnection',
	'TenantSubscription',
	'BillingEvent',
	'BillingInvoice',
	'FeatureOverride',
	'Network',
]);

prisma.$use(async (params, next) => {
	try {
		const tenantId = getTenantId();
		if (!tenantId) return next(params);

		const model = params.model;
		if (!model || !TENANT_SCOPED_MODELS.has(model)) return next(params);

		// For read operations, augment `where` to include tenantId unless already present.
		const readActions = new Set(['findMany', 'findUnique', 'findFirst', 'count']);
		const updateWhereActions = new Set(['update', 'updateMany', 'delete', 'deleteMany']);

		if (readActions.has(params.action)) {
			params.args = params.args ?? {};
			params.args.where = params.args.where ?? {};
			if (!('tenantId' in params.args.where)) {
				params.args.where = { AND: [params.args.where, { tenantId }] };
			}
		}

		// For create, inject tenantId into data if not provided.
		if (params.action === 'create') {
			params.args = params.args ?? {};
			if (params.args.data && !('tenantId' in params.args.data)) {
				params.args.data.tenantId = tenantId;
			}
		}

		if (updateWhereActions.has(params.action)) {
			params.args = params.args ?? {};
			params.args.where = params.args.where ?? {};
			if (!('tenantId' in params.args.where)) {
				params.args.where = { AND: [params.args.where, { tenantId }] };
			}
		}

		return next(params);
	} catch (err) {
		return next(params);
	}
});

export default prisma;
