import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import openapi from "../docs/openapi.json";

const router = Router();

router.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(openapi, { explorer: true })
);

export default router;
