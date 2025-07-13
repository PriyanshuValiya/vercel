import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import projectRoutes from "./routes/projectRoutes";

const app = express();
const PORT = 4500;

app.use(cors());
app.use(express.json());

app.use("/api", projectRoutes);

app.get("/", (req, res) => {
  res.send("Server running successfully...");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
