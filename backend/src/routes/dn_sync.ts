import { Router } from "express";

const router = Router();

router.post("/dn/sync/bootstrap", (_req, res) => res.json({ ok: true }));

export default router;

