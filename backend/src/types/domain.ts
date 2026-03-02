export type EntityId = string;
export type ISODateString = string;

export type Org = { id: EntityId; name: string; createdAt: ISODateString };
export type Store = { id: EntityId; orgId: EntityId; name: string; slug: string; createdAt: ISODateString };

export type Role = 'ADMIN' | 'STORE_OWNER' | 'PRODUCTION_MANAGER' | 'ACCOUNTING' | 'CUSTOMER';
export type Permission = { key: string; description?: string };
export type User = { id: EntityId; storeId: EntityId; email: string; name?: string; role: Role; permissions?: string[] };

export type Customer = { id: EntityId; storeId: EntityId; name: string; email?: string; phone?: string; createdAt: ISODateString };

export type Product = { id: EntityId; storeId: EntityId; name: string; sku?: string; status?: string; createdAt: ISODateString };
export type Variant = { id: EntityId; productId: EntityId; sku: string; color?: string; size?: string; createdAt: ISODateString };
export type Supplier = { id: EntityId; name: string; createdAt: ISODateString };
export type SupplierMapping = { id: EntityId; productId: EntityId; supplierId: EntityId; supplierSku?: string; createdAt: ISODateString };

export type Quote = { id: EntityId; storeId: EntityId; quoteNumber: string; status: string; customerId?: EntityId; total: number; createdAt: ISODateString };
export type QuoteLine = { id: EntityId; quoteId: EntityId; productId: EntityId; variantId?: EntityId; quantity: number; unitPrice: number; total: number };
export type TaxQuote = { id: EntityId; quoteId: EntityId; provider: string; amount: number; currency: string };

export type Order = { id: EntityId; storeId: EntityId; orderNumber: string; status: string; quoteId?: EntityId; total: number; createdAt: ISODateString };
export type OrderLine = { id: EntityId; orderId: EntityId; productId: EntityId; variantId?: EntityId; quantity: number; unitPrice: number; total: number };
export type PaymentIntent = { id: EntityId; orderId?: EntityId; amount: number; status: string; provider?: string; createdAt: ISODateString };
export type Invoice = { id: EntityId; orderId?: EntityId; invoiceNumber: string; status: string; total: number; createdAt: ISODateString };

export type ProductionJob = { id: EntityId; orderId: EntityId; status: string; createdAt: ISODateString };
export type ProductionStep = { id: EntityId; jobId: EntityId; stepKey: string; status: string; createdAt: ISODateString };
export type Proof = { id: EntityId; orderId?: EntityId; quoteId?: EntityId; status: string; createdAt: ISODateString };
export type Asset = { id: EntityId; url: string; kind: string; createdAt: ISODateString };

export type InventoryItem = { id: EntityId; storeId: EntityId; sku: string; onHand: number; reserved: number; available: number; reorderLevel?: number; createdAt: ISODateString };
export type InventoryLedgerEntry = { id: EntityId; itemId: EntityId; type: 'RESERVE' | 'RELEASE' | 'CONSUME' | 'RECEIPT' | 'ADJUSTMENT'; quantity: number; createdAt: ISODateString; referenceId?: EntityId };

export type PurchaseOrder = { id: EntityId; storeId: EntityId; poNumber: string; status: string; supplierId?: EntityId; createdAt: ISODateString };
export type POItem = { id: EntityId; purchaseOrderId: EntityId; sku?: string; quantityOrdered: number; quantityReceived: number; createdAt: ISODateString };
export type Receipt = { id: EntityId; purchaseOrderId: EntityId; receivedAt: ISODateString; notes?: string };

export type Shipment = { id: EntityId; storeId: EntityId; orderId?: EntityId; status: string; trackingNumber?: string; createdAt: ISODateString };
export type ShipmentRate = { id: EntityId; shipmentId?: EntityId; carrier: string; serviceLevel: string; amount: number; currency: string };
export type Label = { id: EntityId; shipmentId: EntityId; url: string; createdAt: ISODateString };

export type WebhookEvent = { id: EntityId; eventId: string; topic: string; payload: unknown; idempotencyKey?: string; processedAt?: ISODateString; createdAt: ISODateString };
export type NotificationEvent = { id: EntityId; storeId: EntityId; type: string; status: string; createdAt: ISODateString };
export type AuditLog = { id: EntityId; actorId?: EntityId; action: string; entityType: string; entityId: EntityId; createdAt: ISODateString; metadata?: unknown };
