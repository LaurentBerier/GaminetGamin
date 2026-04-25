import { Router, type IRouter } from "express";
import healthRouter from "./health";
import soumissionsRouter from "./soumissions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(soumissionsRouter);

export default router;
