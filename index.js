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
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

// MongoDB Connection setup outside the main app flow
let db;
let cropsCollection;
let interestsCollection;

async function run() {
  try {
    await client.connect();
    // 1. Collections are initialized here after connection
    db = client.db("krishilink-db-m");
    cropsCollection = db.collection("crops");
    interestsCollection = db.collection("interests");

    console.log("MongoDB connected successfully!");

  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}

// ===============================================
// সমস্ত রুট ডেফিনিশন এখন run() ফাংশনের বাইরে থাকবে,
// কিন্তু collections ভ্যারিয়েবলগুলো ব্যবহার করবে।
// ===============================================

// Basic check route (optional)
app.get("/", (req, res) => {
    res.send("Server is running and ready.");
});

// =================== CROPS ===================
app.get("/crops", async (req, res) => {
  try {
    // Check if collections are ready
    if (!cropsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const crops = await cropsCollection.find().toArray();
    res.send(crops);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch crops" });
  }
});

// Latest crops route
app.get("/latest-crops", async (req, res) => {
  try {
    if (!cropsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const crops = await cropsCollection
      .find()
      .sort({ createdAt: -1 }) // latest first
      .limit(6)
      .toArray();
    res.send(crops);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch latest crops" });
  }
});

app.get("/crops/:id", async (req, res) => {
  try {
    if (!cropsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const crop = await cropsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!crop) return res.status(404).send({ message: "Crop not found" });
    res.send(crop);
  } catch (err) {
    res.status(500).send({ message: "Invalid ID or server error" });
  }
});

app.post("/crops", async (req, res) => {
  try {
    if (!cropsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const crop = { ...req.body, createdAt: new Date() };
    const result = await cropsCollection.insertOne(crop);
    res.status(201).send({ message: "Crop added", id: result.insertedId });
  } catch (err) {
    res.status(500).send({ message: "Failed to add crop" });
  }
});

app.put("/crops/:id", async (req, res) => {
  try {
    if (!cropsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const result = await cropsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );
    if (result.modifiedCount === 0)
      return res.status(404).send({ message: "Crop not found or no change" });
    res.send({ message: "Crop updated successfully" });
  } catch (err) {
    res.status(500).send({ message: "Failed to update crop" });
  }
});

app.delete("/crops/:id", async (req, res) => {
  try {
    if (!cropsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const result = await cropsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).send({ message: "Crop not found" });
    res.send({ message: "Crop deleted successfully" });
  } catch (err) {
    res.status(500).send({ message: "Failed to delete crop" });
  }
});

// =================== INTERESTS ===================
app.post("/interest", async (req, res) => {
  try {
    if (!interestsCollection || !cropsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const interest = { ...req.body, _id: new ObjectId(), status: "pending", createdAt: new Date() };
    await interestsCollection.insertOne(interest);

    // Push to crop's interests array
    await cropsCollection.updateOne(
      { _id: new ObjectId(interest.cropId) },
      { $push: { interests: interest } }
    );

    res.send({ message: "Interest submitted" });
  } catch (err) {
    res.status(500).send({ message: "Failed to submit interest" });
  }
});

app.get("/interest/:cropId", async (req, res) => {
  try {
    if (!interestsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const interests = await interestsCollection.find({ cropId: req.params.cropId }).toArray();
    res.send(interests);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch interests" });
  }
});

app.get("/interests", async (req, res) => {
  try {
    if (!interestsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const userEmail = req.query.userEmail;
    if (!userEmail) return res.status(400).send({ message: "userEmail required" });

    const interests = await interestsCollection.find({ userEmail }).toArray();
    res.send(interests);
  } catch (err) {
    res.status(500).send({ message: "Failed to fetch user interests" });
  }
});

// =================== UPDATE INTEREST STATUS ===================
app.put("/interest/update", async (req, res) => {
  try {
    if (!interestsCollection || !cropsCollection) return res.status(503).send({ message: "Database not connected yet" });
    const { interestId, cropId, status } = req.body;

    if (!interestId || !cropId || !status)
      return res.status(400).send({ message: "Missing required fields" });

    const interest = await interestsCollection.findOneAndUpdate(
      { _id: new ObjectId(interestId) },
      { $set: { status } },
      { returnDocument: "after" }
    );

    if (!interest.value) return res.status(404).send({ message: "Interest not found" });

    // Reduce crop quantity if accepted
    if (status === "accepted") {
      const crop = await cropsCollection.findOne({ _id: new ObjectId(cropId) });
      if (crop) {
        const newQty = Math.max(0, crop.quantity - interest.value.quantity);
        await cropsCollection.updateOne({ _id: new ObjectId(cropId) }, { $set: { quantity: newQty } });
      }
    }

    res.send({ message: "Interest updated successfully", interest: interest.value });
  } catch (err) {
    res.status(500).send({ message: "Failed to update interest" });
  }
});

// Run MongoDB connection and start server
run().then(() => {
  app.listen(port, () => console.log(`Server running on port ${port}`));
}).catch(console.dir);