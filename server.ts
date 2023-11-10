import app from "./index";
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

mongoose
  .connect(process.env.MONGODB_URL!)
  .then(() => {
    app.listen(port, "0.0.0.0", () => {
      console.log(`db connected and server now listening on port ${port}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
