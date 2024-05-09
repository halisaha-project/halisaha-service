const router = require("express").Router();
const userRouter = require("./user.router");
const authRouter = require("./auth.router");
const groupRouter = require("./group.router");
const matchRouter = require("./match.router");

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/groups", groupRouter);
router.use("/matches", matchRouter);

module.exports = router;
