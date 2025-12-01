const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// MongoDB URI
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
    const interestsCollection = db.collection("interests");

    console.log("MongoDB connected successfully!");

    // ================= GET all crops =================
    app.get("/crops", async (req, res) => {
      try {
        const result = await cropsCollection.find().toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch crops" });
      }
    });

    // ================= GET latest 6 crops =================
    app.get("/latest-crops", async (req, res) => {
      try {
        const result = await cropsCollection
          .find()
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to fetch latest crops" });
      }
    });

    // ================= GET crop by ID =================
    app.get("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const crop = await cropsCollection.findOne({ _id: new ObjectId(id) });
        if (!crop) return res.status(404).send({ message: "Crop not found" });
        res.send(crop);
      } catch (err) {
        res.status(500).send({ message: "Invalid ID or server error" });
      }
    });

    // ================= POST add new crop =================
    app.post("/crops", async (req, res) => {
      try {
        const crop = req.body;
        crop.createdAt = new Date();
        const result = await cropsCollection.insertOne(crop);
        res.status(201).send({ message: "Crop added successfully", id: result.insertedId });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to add crop" });
      }
    });

    // ================= PUT update crop =================
    app.put("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        const result = await cropsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: "Crop not found or no change" });
        }

        res.send({ message: "Crop updated successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to update crop" });
      }
    });

    // ================= DELETE crop =================
    app.delete("/crops/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await cropsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: "Crop not found" });
        }

        res.send({ message: "Crop deleted successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to delete crop" });
      }
    });

    // ================= POST submit interest =================
    app.post("/interest", async (req, res) => {
      try {
        const interest = req.body;
        interest._id = new ObjectId();
        interest.status = "pending";
        interest.createdAt = new Date();

        const result = await interestsCollection.insertOne(interest);

        // Update crop's interests array (optional)
        await cropsCollection.updateOne(
          { _id: new ObjectId(interest.cropId) },
          { $push: { interests: interest } }
        );

        res.send({ message: "Interest submitted", data: result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to submit interest" });
      }
    });

    // ================= GET interests for a crop =================
    app.get("/interest/:cropId", async (req, res) => {
      try {
        const cropId = req.params.cropId;
        const result = await interestsCollection.find({ cropId }).toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error fetching interests" });
      }
    });

    // ================= GET interests for a user =================
    app.get("/interests", async (req, res) => {
      try {
        const userEmail = req.query.userEmail;
        if (!userEmail) return res.status(400).send({ message: "userEmail required" });

        const result = await interestsCollection.find({ userEmail }).toArray();
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error fetching user interests" });
      }
    });

    // ================= PATCH update interest status =================
    app.patch("/interest/:id", async (req, res) => {
      try {
        const interestId = req.params.id;
        const { status } = req.body;

        const result = await interestsCollection.updateOne(
          { _id: new ObjectId(interestId) },
          { $set: { status } }
        );

        res.send({ message: "Status updated", result });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Failed to update status" });
      }
    });

  } finally {
    // keep the connection open
  }
}

run().catch(console.dir);

app.listen(port, () => console.log(`Server running on port ${port}`));
