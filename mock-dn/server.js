import express from 'express';

const app = express();
app.use(express.json());

app.get('/orders', (req, res) => {
  res.json([
    { id: 'ORD-1', status: 'OPEN', updatedAt: new Date().toISOString() },
    { id: 'ORD-2', status: 'OPEN', updatedAt: new Date().toISOString() }
  ]);
});

app.get('/products', (req, res) => {
  res.json([
    { id: 'PROD-1', name: 'Shirt', updatedAt: new Date().toISOString() }
  ]);
});

app.get('/inventory', (req, res) => {
  res.json([
    { id: 'INV-1', sku: 'SKU-1', quantity: 100, updatedAt: new Date().toISOString() }
  ]);
});
// Inventory events search (POST) - supports pagination via body: { page, limit }
// Returns { events: [...], nextPage }
app.post('/inventory/events', (req, res) => {
  const body = req.body || {};
  const page = Number(body.page || 1);
  const limit = Number(body.limit || 3);

  // Deterministic fixtures with adversarial cases
  const all = [
    // Page 1: duplicate within page (E1 twice), out-of-order timestamps
    { EventID: 'E1', Type: 'ADJUSTMENT', SKU: 'SKU-A', Location: 'LOC-1', OldQty: 10, NewQty: 12, CreatedAt: '2026-02-23T10:05:00Z' },
    { EventID: 'E1', Type: 'ADJUSTMENT', SKU: 'SKU-A', Location: 'LOC-1', OldQty: 10, NewQty: 12, CreatedAt: '2026-02-23T10:05:00Z' },
    { EventID: 'E2', Type: 'SALE', SKU: 'SKU-B', Location: 'LOC-2', OldQty: 5, NewQty: 4, CreatedAt: '2026-02-23T09:59:00Z' },
    // Page 2: duplicate across pages (E3 appears later again), event referencing unmapped variant SKU-X
    { EventID: 'E3', Type: 'ADJUSTMENT', SKU: 'SKU-C', Location: 'LOC-1', OldQty: 20, NewQty: 22, CreatedAt: '2026-02-23T10:10:00Z' },
    { EventID: 'E4', Type: 'CORRECTION', SKU: 'SKU-X', Location: 'LOC-3', OldQty: 0, NewQty: 5, CreatedAt: '2026-02-23T10:20:00Z' },
    { EventID: 'E3', Type: 'ADJUSTMENT', SKU: 'SKU-C', Location: 'LOC-1', OldQty: 22, NewQty: 21, CreatedAt: '2026-02-23T10:11:00Z' },
    // Page 3: later duplicate winner for E4 (correction should win deterministically by later CreatedAt)
    { EventID: 'E5', Type: 'SALE', SKU: 'SKU-A', Location: 'LOC-1', OldQty: 12, NewQty: 11, CreatedAt: '2026-02-23T10:30:00Z' },
    { EventID: 'E4', Type: 'CORRECTION', SKU: 'SKU-X', Location: 'LOC-3', OldQty: 5, NewQty: 7, CreatedAt: '2026-02-23T10:25:00Z' }
  ];

  const start = (page - 1) * limit;
  const pageItems = all.slice(start, start + limit);
  const nextPage = start + limit < all.length ? page + 1 : null;
  res.json({ events: pageItems, nextPage });
});

// Backwards-compatible alias
app.post('/inventory-events/search', (req, res) => {
  return app._router.handle(req, res);
});

const PORT = process.env.MOCK_PORT || process.env.PORT || 5050;
app.listen(Number(PORT), () => {
  console.log(`Mock DN server running at http://localhost:${PORT}`);
});
