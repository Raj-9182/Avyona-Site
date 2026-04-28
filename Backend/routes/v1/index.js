import { Router } from "express";
import { pingDatabase } from "../../config/db.js";
import adminAuthRoutes from "./adminAuthRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import customerRoutes from "./customerRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import orderRoutes from "./orderRoutes.js";
import productRoutes from "./productRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import variantGroupRoutes from "./variantGroupRoutes.js";

const router = Router();

router.get("/health", async (_request, response) => {
  let database = "connected";

  try {
    await pingDatabase();
  } catch {
    database = "unavailable";
  }

  response.json({
    success: true,
    message: "Avyona backend is running",
    services: {
      api: "ok",
      database
    }
  });
});

router.use("/admin/auth", adminAuthRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/variant-groups", variantGroupRoutes);
router.use("/customers", customerRoutes);
router.use("/orders", orderRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/settings", settingsRoutes);
router.use("/uploads", uploadRoutes);

export default router;
