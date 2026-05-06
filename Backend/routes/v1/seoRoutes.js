import { Router } from "express";
import { getPageSeo, getRobotsTxt, getSitemapXml } from "../../controllers/seoController.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/page", asyncHandler(getPageSeo));
router.get("/sitemap.xml", asyncHandler(getSitemapXml));
router.get("/robots.txt", getRobotsTxt);

export default router;
