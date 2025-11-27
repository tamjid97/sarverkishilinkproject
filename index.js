const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World! love prema love you so mush/lo");
});

const uri =
  "mongodb+srv://krishlink-db-m:eAyyM6MqK8j4He3C@cluster0.tupoer8.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("krishilink-db-m");
    const cropsCollection = db.collection("crops");

    app.get("/crops", async (req, res) => {
      const result = await cropsCollection.find().toArray();

      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});
