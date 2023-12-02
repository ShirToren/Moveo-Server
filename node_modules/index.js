const { WebSocketServer } = require("ws");
const http = require("http");
const uuidv4 = require("uuid").v4;
const url = require("url");
const { MongoClient, ServerApiVersion } = require("mongodb");

const port = 8000;
const MONGODB_URI = `mongodb+srv://2karinaoist:OistrachK@bether.ledfzng.mongodb.net/?retryWrites=true&w=majority`;
const connections = {};
const users = {};
var numOfClients = 0;
const client = new MongoClient(MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// http server
const server = http.createServer(async (req, res) => {
  const { pathname } = url.parse(req.url);

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*"); // Replace with your React app's URL
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  //endpoints
  // /codeblocks
  if (pathname === "/codeblocks") {
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log(
        "Pinged your deployment. You successfully connected to MongoDB!"
      );
      // Access my specific collection
      const db = client.db("BeTher");
      const items = await db.collection("CodeBlocks").find({}).toArray();

      //response
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(items)); // Send code blocks as a JSON response
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  } // /numOfClients
  else if (pathname === "/numOfClients") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(numOfClients)); // Send code blocks as a JSON response
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

// webSocket server
const wsServer = new WebSocketServer({ server });

const handleMessage = (bytes, uuid) => {
  const message = JSON.parse(bytes.toString());
  const user = users[uuid];
  user.state = message;
  broadcast();

  console.log(
    `${user.username} updated their updated state: ${JSON.stringify(
      user.state
    )}`
  );
};

const handleClose = (uuid) => {
  console.log(`${users[uuid].username} disconnected`);
  delete connections[uuid];
  delete users[uuid];
  broadcast();
};

const broadcast = () => {
  Object.keys(connections).forEach((uuid) => {
    const connection = connections[uuid];
    const message = JSON.stringify(users);
    connection.send(message);
  });
};

wsServer.on("connection", (connection, request) => {
  const { username } = url.parse(request.url, true).query;
  console.log(`${username} connected`);
  const uuid = uuidv4();
  connections[uuid] = connection;
  numOfClients = numOfClients + 1;
  users[uuid] = {
    username,
    state: {},
  };

  connection.on("message", (message) => handleMessage(message, uuid));
  connection.on("close", () => handleClose(uuid));
});

server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
});
