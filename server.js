const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const uuid = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
// app.use(
//   cors({
//     origin: "https://bookstore-website-frontend.vercel.app", // Allow requests from this origin
//     methods: ["GET", "POST"], // Allow specific HTTP methods
//     allowedHeaders: ["Content-Type", "Authorization"],
//     credentials: true, // Allow cookies and authorization headers
//   })
// );
app.use(cors());

app.options("*", cors()); // Enable CORS for all routes

const path = require("path");
app.use(express.json());

const dbPath = path.join(__dirname, "login.db");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3005, () => {
      console.log("server is running on http://localhost:3005");
    });
  } catch (e) {
    console.log(`db error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
// USER DETAILS WHILE PLACING ORDER
app.post("/users", async (request, response) => {
  const { name, address, email, phone } = request.body;

  // Validate the received data
  if (!name || !address || !email || !phone) {
    return response.status(400).json({ error: "All fields are required" });
  }

  const selectUserQuery = `SELECT * FROM users WHERE name = ?`;
  const dbUser = await db.get(selectUserQuery, [name]);

  if (dbUser === undefined) {
    const sql =
      "INSERT INTO users (`name`,`address`,`email`,`phone`) VALUES (?,?,?,?)";
    await db.run(sql, [name, address, email, phone]);
    // // Forward the request to GoRest API
    // const url = "https://gorest.co.in/public-api/users";
    // const options = {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Accept: "application/json",
    //     Authorization:
    //       "Bearer 262a92254071a95568d328b153edf8570d3a6412a382dffee509c7f431839c7d", // Keep the token here in backend
    //   },
    //   body: JSON.stringify({ name, address, email, phone }),
    // };
    // // Send request to GoRest API
    // const apiResponse = await fetch(url, options);
    // const jsonData = await apiResponse.json();
    // response
    //   .status(200)
    //   .json({ message: "User created successfully", jsonData });
      response.status(200).json({ message: "User created successfully" });
  } else {
    return response.status(400).json({ error: "User already exists" });
  }
});

//USER REGISTRATION
app.post("/register", async (request, response) => {
  const { username, password } = request.body;
  
  const selectUserQuery = `SELECT * FROM user_registration WHERE username = ?`;
  const dbUser = await db.get(selectUserQuery, [username]);
  if (dbUser === undefined) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuid.v4();

    const query = `INSERT INTO user_registration (id, username, password) VALUES (?, ?, ?)`;
    await db.run(query, [userId, username, hashedPassword]);
    response.status(200).json({ message: "User created successfully" });
  } else {
    return response.status(400).json({ error: "User already exists" });
  }
});

// USER LOGIN API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const selectUserQuery = `SELECT * FROM user_registration WHERE username = ?`;
  const dbUser = await db.get(selectUserQuery, [username]);

  if (dbUser === undefined) {
    return response.status(400).json({ error_msg: "Invalid username" });
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
      console.log(jwtToken);
      response.status(200).json({ jwtToken });
    } else {
      return response.status(400).json({ error_msg: "Invalid password" });
    }
  }
});
