import logger from '../../logger.js';
import queueManager from '../../services/QueueManager.js';
import { getDecryptedCredentials } from './repositories/dn-connection.repository.js';
import { createSyncRun, finishSyncRun, recordSyncError } from './repositories/dn-sync-run.repository.js';
import { upsertProductFromDn } from './repositories/products.repository.js';
import { upsertOrderFromDn } from './repositories/orders.repository.js';
import { saveSnapshot } from './repositories/dn-snapshot.repository.js';
import { upsertCursor } from './repositories/dn-cursor.repository.js';
import { upsertInventoryEventsForConnection } from './repositories/inventory.repository.js';

// Import DN SDK clients dynamically inside processors to avoid static ESM resolution errors
function registerProcessors() {
  queueManager.processQueue('dn:bootstrap', async (job) => {
    const { connectionId } = job.data;
    const run = await createSyncRun(connectionId, 'bootstrap');
    try {
      const conn = await (await import('./repositories/dn-connection.repository.js')).getConnection(connectionId);
      if (!conn) throw new Error('Connection not found');
      const creds = await getDecryptedCredentials(connectionId);
      if (!creds) throw new Error('Credentials decrypt failed');
      const { DNApiClient } = await import('../../integrations/dn-sdk/src/DNApiClient.js');
      const { DnProductsClient } = await import('../../integrations/dn-sdk/src/productsClient.js');
      const { DnOrdersClient } = await import('../../integrations/dn-sdk/src/ordersClient.js');
      const { DnInventoryEventsClient } = await import('../../integrations/dn-sdk/src/inventoryEventsClient.js');
      const api = new DNApiClient(conn.baseUrl, { username: creds.username, password: creds.password });
      const productsClient = new DnProductsClient(api);
      const ordersClient = new DnOrdersClient(api);
      const eventsClient = new DnInventoryEventsClient(api);

      let prodCount = 0;
      for await (const p of productsClient.searchProducts()) {
        const hash = JSON.stringify(p);
        await saveSnapshot(connectionId, 'product', p.ProductID || p.id || null, p, hash);
        await upsertProductFromDn(connectionId, p.ProductID || p.id || `${prodCount}`, p);
        prodCount++;
      }

      let orderCount = 0;
      for await (const o of ordersClient.searchOrders()) {
        const hash = JSON.stringify(o);
        await saveSnapshot(connectionId, 'order', o.OrderID || o.id || null, o, hash);
        await upsertOrderFromDn(connectionId, o.OrderID || o.id || `${orderCount}`, o);
        orderCount++;
      }

      // Inventory events: use pagination (page, limit) pattern from mock
      let page = 1;
      const limit = 3;
      let evtCount = 0;
      while (true) {
        // using api client directly to fetch page
        const url = '/inventory/events';
        const resp = await api.post(url, { page, limit }).then((r: any) => r.data).catch((e: any) => { throw e; });
        const events = (resp && resp.events) || [];
        // Save snapshots
        for (const ev of events) {
          const hash = JSON.stringify(ev);
          await saveSnapshot(connectionId, 'inventory_event', ev.EventID || ev.id || null, ev, hash);
        }
        // upsert events for this page
        await upsertInventoryEventsForConnection({ connectionId, storeId: conn.storeId, events });
        evtCount += events.length;
        if (!resp || !resp.nextPage) break;
        page = resp.nextPage;
      }

      await upsertCursor(connectionId, 'products', { lastCount: prodCount, lastRunAt: new Date().toISOString() });
      await upsertCursor(connectionId, 'orders', { lastCount: orderCount, lastRunAt: new Date().toISOString() });
      await upsertCursor(connectionId, 'inventory_events', { lastCount: evtCount, lastRunAt: new Date().toISOString() });

      await finishSyncRun(run.id, 'COMPLETED', { products: prodCount, orders: orderCount, inventoryEvents: evtCount });
      logger.info(`DN bootstrap completed for ${connectionId}: products=${prodCount} orders=${orderCount} inventoryEvents=${evtCount}`);
    } catch (err) {
      const e: any = err;
      logger.error('DN bootstrap failed', e?.message || String(e));
      try {
        if (e && e.isAxiosError) {
          logger.error('Axios error details', { url: e.config?.url, method: e.config?.method, status: e.response?.status, data: e.response?.data });
        }
      } catch (ex) {
        logger.error('Failed to extract axios error details', (ex as any)?.message || String(ex));
      }
      await recordSyncError(run.id, connectionId, 'bootstrap', null, e?.message || String(e), e?.stack);
      await finishSyncRun(run.id, 'FAILED', {});
      throw err;
    }
  }, 1);
}

registerProcessors();
export default { registerProcessors };
