import app from "./index";
import dotenv from "dotenv";
dotenv.config();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`db connected and server now listening on port ${port}`);
});
