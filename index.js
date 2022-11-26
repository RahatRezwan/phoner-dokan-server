const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
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
      const categoriesCollection = client.db("phonerDokan").collection("categories");
      const productsCollection = client.db("phonerDokan").collection("products");

      /* get jwt token route */
      app.get("/jwt", async (req, res) => {
         const email = req.query.email;
         const user = await usersCollection.findOne({ email: email });
         if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "2d" });
            return res.send({ accessToken: token });
         }
         res.status(403).send({ message: "Unauthorized Access" });
      });

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

      /* get route for get all the buyers */
      app.get("/buyers", async (req, res) => {
         const query = { role: "Buyer" };
         const buyers = await usersCollection.find(query).toArray();
         res.send(buyers);
      });

      /* get route for get all the seller */
      app.get("/sellers", async (req, res) => {
         const query = { role: "Seller" };
         const users = await usersCollection.find(query).toArray();
         res.send(users);
      });

      /* verify seller */
      app.put("/sellers/:id", async (req, res) => {
         const id = req.params.id;
         const query = { _id: ObjectId(id) };
         const options = { upsert: true };
         const updateDoc = {
            $set: {
               verified: true,
            },
         };
         const result = await usersCollection.updateOne(query, updateDoc, options);
         res.send(result);
      });

      /* Create Category route */
      app.post("/categories", async (req, res) => {
         const category = req.body;
         const result = await categoriesCollection.insertOne(category);
         res.send(result);
      });

      /* display all category route */
      app.get("/categories", async (req, res) => {
         const query = {};
         const categories = await categoriesCollection.find(query).toArray();
         res.send(categories);
      });

      /* route for create products collection */
      app.post("/products", async (req, res) => {
         const product = req.body;
         const result = await productsCollection.insertOne(product);
         res.send(result);
      });
   } finally {
   }
};
run().catch((err) => console.log(err));

app.listen(port, () => {
   console.log(`Phoner dokan server is running on port : ${port}`);
});
