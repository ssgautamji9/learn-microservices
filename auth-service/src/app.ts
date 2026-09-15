import express from "express";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((_req, res, next) => { res.setHeader("Server-Tag", "auth-service"); next(); });
app.use(authRoutes);
app.use(healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
