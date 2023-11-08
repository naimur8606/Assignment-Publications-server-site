const express = require('express');
const cors = require("cors");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://assignmentcommunication.web.app',
    // 'https://cars-doctor-6c129.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kc6dmnx.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



const logger = (req, res, next) => {
  console.log('log: info', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const allAssignment = client.db("friendsCommunication").collection("assignments");
    const allTakenAssignment = client.db("friendsCommunication").collection("takeAssignments");
    const allUsers = client.db('friendsCommunication').collection('user');

    app.post('/jwt', logger, async (req, res) => {
      const user = req.body;
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      })
        .send({ success: true });
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      console.log('logging out', user);
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })



    app.get("/assignments", async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);

      const result = await allAssignment.find()
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    })

    app.get('/assignmentsCount', async (req, res) => {
      const count = await allAssignment.estimatedDocumentCount();
      res.send({ count });
    })

    app.get("/assignments/my-assignments", logger, verifyToken, async (req, res) => {
      console.log(req.user.email , req.query.email)
      if(req.user.email !== req.query.email){
            return res.status(403).send({message: 'forbidden access'})
        }
      const query = { email: req.query.email };
      const result = await allAssignment.find(query).toArray();
      res.send(result);
    }); 

    app.get('/assignments/my-assignmentsCount', async (req, res) => {
      const query = { email: req.query.email };
      const result = await allAssignment.find(query).toArray();
      const count = result.length;
      res.send({ count });
    })

    app.get("/assignments/manage-assignments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email, marks: "pending" };
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

    app.get('/user', async (req, res) => {
      const result = await allUsers.find().toArray();
      res.send(result);
    })

    app.post('/user', async (req, res) => {
      const user = req.body;
      const email = user?.email;
      const existingUser = await allUsers.findOne({ email });
      if (!existingUser) {
        console.log(user);
        const result = await allUsers.insertOne(user);
        res.send(result);
      }
    });

    app.post("/takeAssignments", async (req, res) => {
      const takeAssignments = req.body;
      const result = await allTakenAssignment.insertOne(takeAssignments);
      console.log(result)
      res.send(result)
    })

    app.get("/allTakeAssignments", async (req, res) => {
      const cursor = allTakenAssignment.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get("/takeAssignments/pending", logger, verifyToken, async (req, res) => {
      console.log(req.user.email , req.query.email)
      if(req.user.email !== req.query.email){
            return res.status(403).send({message: 'forbidden access'})
        }
      const query = { achieveMarks: "pending" };
      const result = await allTakenAssignment.find(query).toArray();
      res.send(result);
    });
    app.get("/takeAssignmentsByUser", logger, verifyToken, async (req, res) => {
      console.log(req.user.email , req.query.email)
      if(req.user.email !== req.query.email){
            return res.status(403).send({message: 'forbidden access'})
        }
      const query = { email: req.query.email };
      const result = await allTakenAssignment.find(query).toArray();
      res.send(result);
    });

    app.get('/takeAssignments', logger, verifyToken, async (req, res) => {
      console.log(req.query.email);
      console.log('token owner info', req.user)
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await allTakenAssignment.find(query).toArray();
      res.send(result);
    })

    app.patch('/takeAssignments/:id', async (req, res) => {
      const id = req.params.id
      const email = req.body.email;
      const filter = { email: email, _id: new ObjectId(id) }
      console.log(email, filter)
      const options = { upsert: true };
      const updatedAssignment = req.body;
      const assignment = {
        $set: {
          title: updatedAssignment.title,
          note: updatedAssignment.note,
          level: updatedAssignment.level,
          marks: updatedAssignment.marks,
          pdf: updatedAssignment.pdf,
          email: updatedAssignment.email,
          photo: updatedAssignment.photo,
          achieveMarks: updatedAssignment.achieveMarks
        }
      }

      const result = await allTakenAssignment.updateOne(filter, assignment, options);
      res.send(result);
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