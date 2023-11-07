const express = require('express');
const cors = require("cors");
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kc6dmnx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const allAssignment = client.db("friendsCommunication").collection("assignments");
    const allTakenAssignment = client.db("friendsCommunication").collection("takeAssignments");

    app.get("/assignments", async (req, res) => {
      const cursor = allAssignment.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get("/assignments/my-assignments/:email", async (req, res) => {
      const email =req.params.email;
      const query = {email: email};
      const result = await allAssignment.find(query).toArray();
      res.send(result)
    })

    app.get("/assignments/manage-assignments/:email", async (req, res) => {
      const email =req.params.email;
      const query = {email: email, marks: "pending"};
      const result = await allAssignment.find(query).toArray();
      res.send(result)
    })

    app.get("/assignments/update-assignments", async (req, res) => {
      const query = { marks: { $ne: "pending" } };
      const result = await allAssignment.find(query).toArray();
      res.send(result);
    });

    app.post("/assignments", async (req, res) => {
      const assignments = req.body;
      const result = await allAssignment.insertOne(assignments);
      console.log(result) 
      res.send(result)
    })
    
    app.get("/assignments/:id", async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) };
      const result = await allAssignment.findOne(query);
      res.send(result)
    })

    app.patch('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedAssignment = req.body;
      const assignment = {
        $set: {
          title: updatedAssignment.title,
          date: updatedAssignment.date,
          level: updatedAssignment.level,
          marks: updatedAssignment.marks,
          pdf: updatedAssignment.pdf,
          email: updatedAssignment.email,
          photo: updatedAssignment.photo,
          description: updatedAssignment.description
        }
      }

      const result = await allAssignment.updateOne(filter, assignment, options);
      res.send(result);
    })

    app.delete('/assignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await allAssignment.deleteOne(query);
      res.send(result);
  })

  app.post("/takeAssignments", async (req, res) => {
    const takeAssignments = req.body;
    const result = await allTakenAssignment.insertOne(takeAssignments);
    console.log(result) 
    res.send(result)
  })

  app.get("/takeAssignments", async (req, res) => {
    const cursor = allTakenAssignment.find();
    const result = await cursor.toArray();
    res.send(result)
  })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})