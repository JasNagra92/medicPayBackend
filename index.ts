import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + Typescript Server test to see nodemon");
});

app.listen(port, () => {
  console.log(`[server]: Server is running on port ${port}`);
});
