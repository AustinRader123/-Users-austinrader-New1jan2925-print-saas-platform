import { Router } from "express";

const router = Router();

router.get("/dn/connections/health", (_req, res) => res.json({ ok: true }));

export default router;

