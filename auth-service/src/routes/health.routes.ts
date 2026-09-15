import { Router } from "express";

const router = Router();

// Deliberately unauthenticated; can later report Postgres/RabbitMQ dependency health here.
router.get(["/",'/health'], (_req, res) => {
  res.status(200).json({ status: "healthy", service: "auth-service" });
});

export default router;
