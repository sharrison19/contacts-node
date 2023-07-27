const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const auth = require("./middleware/auth");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(publicPath));

const databaseURL = process.env.MONGO_URL
  ? process.env.MONGO_URL
  : process.env.MONGO_LOCAL_URL;
try {
  if (process.env.MONGO_URL) {
    const fixieData = process.env.FIXIE_SOCKS_HOST.split(
      new RegExp("[/(:\\/@/]+")
    );

    mongoose.connect(process.env.MONGO_URL, {
      proxyUsername: fixieData[0],
      proxyPassword: fixieData[1],
      proxyHost: fixieData[2],
      proxyPort: parseInt(fixieData[3]),
    });
  } else {
    mongoose.connect(process.env.MONGO_LOCAL_URL);
  }
} catch (error) {
  console.log(error);
}

const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/contacts");
mongoose.connection.on("connected", () => {
  console.log("connected to MongoDB");
});

const publicPath = path.join(__dirname, "./public");

const bcrypt = require("bcryptjs");

const jwt = require("jsonwebtoken");

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  website: String,
  company: String,
  street: String,
  city: String,
  state: String,
  zipcode: String,
  country: String,
  id: Number,
  userID: mongoose.Schema.ObjectId,
});

const Contact = mongoose.model("Contact", contactSchema);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

app.use(cors({ origin: process.env.FRONT_END_URL }));
app.use(bodyParser.json());
app.get("/contacts", auth, async (req, res) => {
  const contacts = await Contact.find({ userID: req.user.id });
  res.json(contacts);
});
app.post("/contacts", auth, async (req, res) => {
  const {
    name,
    email,
    phone,
    website,
    company,
    street,
    city,
    state,
    zipcode,
    country,
    id,
  } = req.body;
  const userID = req.user.id;
  const newContact = new Contact({
    name,
    email,
    phone,
    website,
    company,
    street,
    city,
    state,
    zipcode,
    country,
    id,
    userID,
  });
  console.log(req.body);
  const saveContact = await newContact.save();
  console.log(newContact);
  res.json(saveContact);
});

app.put("/contacts", auth, async (req, res) => {
  const user = req.user;
  const foundContact = await Contact.findOneAndUpdate(
    { id: req.body.id, userID: user.id },
    req.body,
    {
      new: true,
    }
  );
  if (foundContact) {
    return res.json(foundContact);
  } else {
    const newContact = new Contact(req.body);
    const saveContact = await newContact.save();
    res.json(saveContact);
  }
});

app.delete("/contacts/:id", auth, async (req, res) => {
  console.log(req);
  const deletedContact = await Contact.findOneAndDelete({
    id: req.params.id,
    userID: req.user.id,
  });
  res.json(deletedContact);
});

app.post("/users", async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  }
  const foundUser = await User.findOne({ email });
  if (foundUser) {
    return res.status(400).json({ message: "User already exists" });
  }
  bcrypt.genSalt(12, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      if (err) throw err;
      password = hash;
      const newUser = new User({ email, password });
      const savedUser = await newUser.save();
      jwt.sign(
        { id: newUser._id },
        process.env.myjwtsecret,
        { expiresIn: 3600 },
        (err, token) => {
          if (err) throw err;
          res.json({ token, user: newUser });
        }
      );
    });
  });
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  }

  const foundUser = await User.findOne({ email });
  if (!foundUser) {
    return res.status(400).json({
      message: "Could not find an account matching the email and password",
    });
  }
  bcrypt.compare(password, foundUser.password, (err, result) => {
    const { password, ...returnUser } = foundUser;
    if (result) {
      jwt.sign(
        { id: foundUser._id },
        process.env.myjwtsecret,
        { expiresIn: 3600 },
        (err, token) => {
          if (err) throw err;
          res.json({ token, user: returnUser });
        }
      );
    } else {
      return res.status(400).json({
        message: "Could not find an account matching the email and password",
      });
    }
  });
});

app.get("/users", auth, async (req, res) => {
  const foundUser = await User.findOne({ _id: req.user.id });
  console.log("test");
  res.json(foundUser);
});

var server = app.listen(5000, () => {
  console.log("Node server is running on localhost:5000");
});
