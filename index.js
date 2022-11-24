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

app.listen(port, () => {
   console.log(`Phoner dokan server is running on port : ${port}`);
});
