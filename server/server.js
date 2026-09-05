import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import choiceRoutes from "./routes/choiceRoutes.js";
import responseRoutes from "./routes/responseRoutes.js";

const app = express();
const port = 3000;

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("", questionRoutes);
app.use("/api/choices", choiceRoutes);
app.use("/api/forms", responseRoutes);

app.listen(port, () => {
    console.log(`currently listening to port ${port}`);
});