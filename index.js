const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

/* middleware */
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
   res.send("Phoner Dokan server is running");
});

/* Mongodb client */

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@phonerdokan.daagdyy.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
   useNewUrlParser: true,
   useUnifiedTopology: true,
   serverApi: ServerApiVersion.v1,
});

const run = async () => {
   try {
      const usersCollection = client.db("phonerDokan").collection("users");

      /* post route for save user to database */
      app.post("/users", async (req, res) => {
         const user = req.body;
         const result = await usersCollection.insertOne(user);
         res.send(result);
      });

      /* get route for get all the users */
      app.get("/users", async (req, res) => {
         const query = {};
         const users = await usersCollection.find(query).toArray();
         res.send(users);
      });
   } finally {
   }
};
run().catch((err) => console.log(err));

app.listen(port, () => {
   console.log(`Phoner dokan server is running on port : ${port}`);
});
