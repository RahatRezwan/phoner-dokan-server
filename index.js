const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { query } = require("express");
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

/* Verify Access Token */
const verifyJWT = (req, res, next) => {
   const authHeader = req.headers.authorization;
   if (!authHeader) {
      return res.status(401).send("Unauthorized Accessed");
   }
   const token = authHeader.split(" ")[1];
   jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
      if (err) {
         return res.status(403).send("Forbidden Access");
      }
      req.decoded = decoded;
      next();
   });
};

const run = async () => {
   try {
      const usersCollection = client.db("phonerDokan").collection("users");
      const categoriesCollection = client.db("phonerDokan").collection("categories");
      const productsCollection = client.db("phonerDokan").collection("products");
      const advertisementsCollection = client.db("phonerDokan").collection("advertisements");

      /* make sure run verify admin after jwt */
      const verifyAdmin = async (req, res, next) => {
         const decodedEmail = req.decoded.email;
         const query = { email: decodedEmail };
         const user = await usersCollection.findOne(query);
         if (user.role !== "Admin") {
            return res.status(403).send({ message: "Forbidden Access" });
         }
         next();
      };

      /* make sure run verify admin after jwt */
      const verifySeller = async (req, res, next) => {
         const decodedEmail = req.decoded.email;
         const query = { email: decodedEmail };
         const user = await usersCollection.findOne(query);
         if (user.role !== "Seller") {
            return res.status(403).send({ message: "Forbidden Access" });
         }
         next();
      };
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
      app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
         const query = {};
         const users = await usersCollection.find(query).toArray();
         res.send(users);
      });

      /* get admin from all users */
      app.get("/users/admin/:email", verifyJWT, async (req, res) => {
         const email = req.params.email;
         const query = { email: email };
         const user = await usersCollection.findOne(query);
         res.send({ isAdmin: user?.role === "Admin" });
      });

      /* get single seller from all users */
      app.get("/users/seller/:email", verifyJWT, async (req, res) => {
         const email = req.params.email;
         const query = { email: email };
         const user = await usersCollection.findOne(query);
         res.send({ isSeller: user?.role === "Seller", seller: user });
      });

      /* get route for get all the buyers */
      app.get("/buyers", verifyJWT, verifyAdmin, async (req, res) => {
         const query = { role: "Buyer" };
         const buyers = await usersCollection.find(query).toArray();
         res.send(buyers);
      });

      /* get route for get all the seller */
      app.get("/sellers", verifyJWT, verifyAdmin, async (req, res) => {
         const query = { role: "Seller" };
         const users = await usersCollection.find(query).toArray();
         res.send(users);
      });

      /* verify seller */
      app.put("/sellers/:id", verifyJWT, verifyAdmin, async (req, res) => {
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
      app.post("/categories", verifyJWT, verifyAdmin, async (req, res) => {
         const category = req.body;
         const result = await categoriesCollection.insertOne(category);
         res.send(result);
      });

      /* display all category route */
      app.get("/categories", async (req, res) => {
         const limit = parseInt(req.query.limit);
         const query = {};
         const categories = await categoriesCollection.find(query).limit(limit).toArray();
         res.send(categories);
      });

      /* route for create products collection */
      app.post("/products", verifyJWT, verifySeller, async (req, res) => {
         const product = req.body;
         const result = await productsCollection.insertOne(product);
         res.send(result);
      });

      /* route to get all the products */
      app.get("/products", async (req, res) => {
         const query = {};
         const result = await productsCollection.find(query).toArray();
         res.send(result);
      });

      /* get products by seller email */
      app.get("/products/:email", verifyJWT, verifySeller, async (req, res) => {
         const email = req.params.email;
         const query = { sellerEmail: email };
         const options = {
            sort: { data: -1 },
         };
         const products = await productsCollection.find(query, options).toArray();
         res.send(products);
      });

      /* advertise product */
      app.put("/products/:id", verifyJWT, verifySeller, async (req, res) => {
         const id = req.params.id;
         const query = { _id: ObjectId(id) };
         const options = { upsert: true };
         const updateDoc = {
            $set: {
               advertise: true,
            },
         };
         const result = await productsCollection.updateOne(query, updateDoc, options);
         res.send(result);
      });

      /* show products by category id */
      app.get("/categories/:id", async (req, res) => {
         const id = req.params.id;
         const filterCategory = { _id: ObjectId(id) };
         const category = await categoriesCollection.findOne(filterCategory);
         const products = await productsCollection.find({}).toArray();
         const matchedProducts = products.filter((product) => product.category === category.name);
         res.send(matchedProducts);
      });
   } finally {
   }
};
run().catch((err) => console.log(err));

app.listen(port, () => {
   console.log(`Phoner dokan server is running on port : ${port}`);
});
