import express from "express";
import postRoutes from "./routes/post.routes";
import healthRoutes from "./routes/health.routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((_req, res, next) => { res.setHeader("Server-Tag", "post-service"); next(); });
app.use(healthRoutes); // before postRoutes so /health isn't captured by /:postId
app.use(postRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
