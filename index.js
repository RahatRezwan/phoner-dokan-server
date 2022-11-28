const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
      const blogsCollection = client.db("phonerDokan").collection("blogs");
      const categoriesCollection = client.db("phonerDokan").collection("categories");
      const productsCollection = client.db("phonerDokan").collection("products");
      const wishlistsCollection = client.db("phonerDokan").collection("wishlists");
      const bookingsCollection = client.db("phonerDokan").collection("bookings");
      const paymentsCollection = client.db("phonerDokan").collection("payments");

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

      app.post("/create-payment-intent", verifyJWT, async (req, res) => {
         const product = req.body;
         const price = parseFloat(product.productPrice);
         const amount = price * 100;
         const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: "usd",
            payment_method_types: ["card"],
         });
         res.send({
            clientSecret: paymentIntent.client_secret,
         });
      });
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
         const matched = await usersCollection.findOne({ email: user.email });
         if (matched) {
            return res.send({ acknowledged: false });
         }
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

      /* Add to wishlist */
      app.post("/add-to-wishlist", verifyJWT, async (req, res) => {
         const wishlist = req.body;
         const queryCustomer = {
            userEmail: wishlist.userEmail,
            productId: wishlist.productId,
         };
         const customerWishlist = await wishlistsCollection.find(queryCustomer).toArray();
         if (customerWishlist.length) {
            const message = `Sorry! You have already add ${wishlist.productName} to your wishList`;
            return res.send({ acknowledged: false, message });
         }
         const result = await wishlistsCollection.insertOne(wishlist);
         res.send(result);
      });

      /* get wishlist by email */
      app.get("/wishList/:email", verifyJWT, async (req, res) => {
         const email = req.params.email;
         const query = { userEmail: email };
         const result = await wishlistsCollection.find(query).toArray();
         res.send(result);
      });

      /* Route to report product */
      app.put("/report-product/:id", async (req, res) => {
         const id = req.params.id;
         const filter = { _id: ObjectId(id) };
         const options = { upsert: true };
         const updateDoc = {
            $set: {
               reported: true,
            },
         };
         const result = await productsCollection.updateOne(filter, updateDoc, options);
         res.send(result);
      });

      /* get reported items */
      app.get("/reported-items", verifyJWT, verifyAdmin, async (req, res) => {
         const query = { reported: true };
         const result = await productsCollection.find(query).toArray();
         res.send(result);
      });

      /* get advertised products from all products */
      app.get("/advertisedProducts", async (req, res) => {
         const query = { advertise: true, quantity: 1 };
         const options = {
            sort: { data: -1 },
         };
         const result = await productsCollection.find(query, options).toArray();
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

      /* Create Route for booking Products */
      app.post("/bookItem", verifyJWT, async (req, res) => {
         const item = req.body;
         const queryCustomer = {
            customerEmail: item.customerEmail,
            productId: item.productId,
         };
         const customerBookings = await bookingsCollection.find(queryCustomer).toArray();
         if (customerBookings.length) {
            const message = `You have already booked ${item.productName}`;
            return res.send({ acknowledged: false, message });
         }
         const result = await bookingsCollection.insertOne(item);
         res.send(result);
      });

      /* get booked item by user email */
      app.get("/bookItems/:email", async (req, res) => {
         const email = req.params.email;
         const query = { customerEmail: email };
         const items = await bookingsCollection.find(query).toArray();
         res.send(items);
      });

      /* store payment data */
      app.post("/payments", async (req, res) => {
         const payment = req.body;
         const filterProduct = { _id: ObjectId(payment.productId) };
         const booking = { _id: ObjectId(payment.bookingId) };
         const productInBooking = { productId: payment.productId };
         const updateProduct = {
            $set: {
               quantity: 0,
            },
         };
         const updateBooking = {
            $set: {
               paymentStatus: "Paid",
               transactionId: payment.transactionId,
            },
         };
         const updateProductInBooking = {
            $set: {
               productQuantity: 0,
            },
         };
         await productsCollection.updateOne(filterProduct, updateProduct);
         await bookingsCollection.updateOne(booking, updateBooking);
         await bookingsCollection.updateMany(productInBooking, updateProductInBooking);
         const result = await paymentsCollection.insertOne(payment);
         res.send(result);
      });

      /* create blog */
      app.post("/blogs", verifyJWT, verifyAdmin, async (req, res) => {
         const blog = req.body;
         const result = await blogsCollection.insertOne(blog);
         res.send(result);
      });

      app.get("/blogs", async (req, res) => {
         const limit = parseInt(req.query.limit);
         const query = {};
         const result = await blogsCollection.find(query).limit(limit).toArray();
         res.send(result);
      });

      /* user delete function */
      app.delete("/deleteUser/:id", verifyJWT, verifyAdmin, async (req, res) => {
         const id = req.params.id;
         const filterUser = { _id: ObjectId(id) };
         const result = await usersCollection.deleteOne(filterUser);
         res.send(result);
      });

      /* delete reported product */
      app.delete("/deleteproduct/:id", verifyJWT, verifyAdmin, async (req, res) => {
         const id = req.params.id;
         const query = { _id: ObjectId(id) };
         const result = await productsCollection.deleteOne(query);
         res.send(result);
      });
   } finally {
   }
};
run().catch((err) => console.log(err));

app.listen(port, () => {
   console.log(`Phoner dokan server is running on port : ${port}`);
});
