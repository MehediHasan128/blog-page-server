const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jmtxbp5.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyToken = async(req, res, next) =>{
  const token = req?.cookies?.token;
  console.log('token in mid', token);
  if(!token){
    return res.status(401).send({message: 'unauthorized access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) =>{
    if(err){
      return res.status(401).send({message: 'unauthorized access'})
    }
    req.user = decoded;
    next();
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    app.post('/jwt', async(req, res) =>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: false
      })
      .send({success: true})
    })

    app.post('/logout', async(req, res) =>{
      const user = req.body;
      res
      .clearCookie('token', {maxAge: 0})
      .send({success: true})
    })


    const blogCollection = client.db('blogPage').collection('blogs');
    const wishListCollection = client.db('blogPage').collection('wishLists')
    const commentCollection = client.db('blogPage').collection('comments')


    app.get('/allBlogs', async(req, res) =>{
      const result = await blogCollection.find().toArray();
      res.send(result);
    })

    app.get('/allBlogs/:title', async(req, res) =>{
      const blogTitle = req.params.title;
      const query = {title: blogTitle}
      const result = await blogCollection.findOne(query)
      res.send(result)
    })

    app.get('/recentBlogs', async(req, res) =>{
      const result = await blogCollection.find().sort({time: -1}).toArray();
      res.send(result);
    })

    app.get('/wishLists', verifyToken, async(req, res) =>{
      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'})
      }
      let query = {};
      if(req.query?.email){
        query = {userEmail: req.query.email}
      }
      const result = await wishListCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/comments/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {blogId: id}
      const result = await commentCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/blogs/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await blogCollection.findOne(query);
      res.send(result);
    })

    app.get('/updateBlog/:id', async(req, res) =>{
      const id = req.params.id;
    })

    app.post('/blog', async(req, res) =>{
      const blog = req.body;
      const result = await blogCollection.insertOne(blog);
      res.send(result);
    })

    app.post('/addWishList', async(req, res) =>{
      const blog = req.body;
      const result = await wishListCollection.insertOne(blog);
      res.send(result)
    })

    app.post('/comments', async(req, res) =>{
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    })


    app.delete('/wishList/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await wishListCollection.deleteOne(query);
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



app.get('/', (req, res) =>{
    res.send('Blog page server is running')
});

app.listen(port, () =>{
    console.log(`This server is running on port ${port}`);
})