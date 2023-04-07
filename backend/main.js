import express from "express";
import * as dotenv from "dotenv";
import { seedDb, getAllProductsFromDb, createPgConnection } from "./db.js";
import cors from "cors";
import compression from "compression";
import SSE from "express-sse";

const sse = new SSE();

dotenv.config();

// setup and seed database
const pgClient = createPgConnection();
await pgClient.connect();
await seedDb(pgClient);

const server = express();

// compress responses
server.use(compression());
server.use(cors());

const { PORT } = process.env;

server.get("/", async (req, res) => {
    const products = await getAllProductsFromDb(pgClient);
    res.json(products);
});

// sse endpoint
server.get("/stream", sse.init);

//listen to chanel name in postgres
await pgClient.query("LISTEN pubchanel;");

// handle notification from postgres
pgClient.on("notification", (data) => {
    sse.send("prices updated");
});

server.listen(PORT, () => {
    console.log("server is listening on port: " + PORT);
});
