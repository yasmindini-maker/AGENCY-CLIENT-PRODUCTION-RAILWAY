import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portalRouter from "./portal";
import accountRouter from "./account";
import filesRouter from "./files";

const router: IRouter = Router();

router.use(healthRouter);
router.use(accountRouter);
router.use(filesRouter);
router.use(portalRouter);

export default router;
