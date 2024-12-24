const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const PORT = 3000;

const uri = "mongodb+srv://ankitsingh60687:jWv8LoNnlF1YCJyn@cluster0.pkkvx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());
app.use(express.json());

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
connectDB();

/**
 * Approve User Logic:
 * - Generates random `docPassword` and `pharmaPassword`
 * - Hashes both passwords using bcrypt
 * - Moves the user to the `users` collection
 * - Removes the user from the source collection (`newusers` or `renew_users`)
 */
// app.post("/api/approveUser", async (req, res) => {
//   const { user, dataset } = req.body;

//   try {
//     const db = client.db("users_db");

//     const sourceCollection = dataset === "New Users" ? "newusers" : "renew_users";
//     const targetCollection = "users";

//     // Generate random passwords
//     const docPassword = crypto.randomBytes(8).toString("hex");
//     const pharmaPassword = crypto.randomBytes(8).toString("hex");

//     // Hash the passwords
//     const passwordHashDoc = await bcrypt.hash(docPassword, 12);
//     const passwordHashPharma = await bcrypt.hash(pharmaPassword, 12);

//     // Prepare user object for the `users` collection
//     const userDocument = {
//       username: user.username || user.name.replace(/\s+/g, "").toLowerCase(),
//       name: user.name,
//       mobileOne: user.mobileOne,
//       mobileTwo:user.mobileTwo || "Change your Address",
//       qualifications: user.qualifications || "Add your Qualification",
//       regiNumber: user.regiNumber || "Add your Registeration Number",
//       hospital: user.hospital || "Dynamic Hospital Name",
//       address: user.address || "Default Address",
//       email: user.email,
//       password_hash_doc: passwordHashDoc,
//       password_hash_pharma: passwordHashPharma,
//       otp: null,
//       otp_expiry: null,
//     };

//     // Insert the user into the `users` collection
//     const insertedUser = await db.collection(targetCollection).insertOne(userDocument);

//     // Remove the user from the source collection
//     await db.collection(sourceCollection).deleteOne({ _id: new ObjectId(user._id) });

//     console.log(`Doc Password: ${docPassword}`);
//     console.log(`Pharma Password: ${pharmaPassword}`);

//     res.json({
//       message: "User approved and moved to the users collection.",
//       user_id: insertedUser.insertedId,
//       docPassword,
//       pharmaPassword,
//     });
//   } catch (error) {
//     console.error("Error approving user:", error);
//     res.status(500).send("Server error");
//   }
// });

const transporter = nodemailer.createTransport({
  service: "Gmail", // Use your email provider (e.g., Gmail, Outlook, etc.)
  auth: {
    user: "catonhealthcare@gmail.com", // Replace with your email
    pass: "xdzhaylaefnbnyiw", // Replace with your email password or app-specific password
  },
});

app.post("/api/approveUser", async (req, res) => {
  const { user, dataset } = req.body;

  try {
    const db = client.db("users_db");

    const sourceCollection = dataset === "New Users" ? "newusers" : "renew_users";
    const targetCollection = "users";

    const docPassword = crypto.randomBytes(8).toString("hex");
    const pharmaPassword = crypto.randomBytes(8).toString("hex");

    const passwordHashDoc = await bcrypt.hash(docPassword, 12);
    const passwordHashPharma = await bcrypt.hash(pharmaPassword, 12);

    const userDocument = {
      username: user.username || user.name.replace(/\s+/g, "").toLowerCase(),
      name: user.name,
      mobileOne: user.mobileOne || "Add Mobile One",
      mobileTwo: user.mobileTwo || "Add Mobile Two",
      qualifications: user.qualifications || "Add Qualification",
      regiNumber: user.regiNumber || "Add Registration Number",
      hospital: user.hospital || "Dynamic Hospital Name",
      address: user.address || "Default Address",
      email: user.email,
      password_hash_doc: passwordHashDoc,
      password_hash_pharma: passwordHashPharma,
      otp: null,
      otp_expiry: null,
    };

    const insertedUser = await db.collection(targetCollection).insertOne(userDocument);
    await db.collection(sourceCollection).deleteOne({ _id: new ObjectId(user._id) });

    // Prepare email content
    const mailOptions = {
      from: "catonhealthcare@gmail.com",
      to: user.email,
      subject: "Account Approved",
      text: `
Hello ${user.name},

Your account has been approved. Below are your credentials:

Doctor Password: ${docPassword}
Pharmacy Password: ${pharmaPassword}

Please log in to your account using these credentials.

Thank you,
Admin Team
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log(`Email sent to ${user.email}`);
    res.json({
      message: "User approved and moved to the users collection.",
      user_id: insertedUser.insertedId,
      docPassword,
      pharmaPassword,
    });
  } catch (error) {
    console.error("Error approving user:", error);
    res.status(500).send("Server error");
  }
});

app.get("/api/newusers", async (req, res) => {
  try {
    const db = client.db("users_db");
    const newUsers = await db
      .collection("new_subscriptions")
      .find()
      .project({ _id: 1, name: 1, username: 1, email: 1, mobile: 1, subscription_date: 1 })
      .toArray();
    res.json(newUsers);
  } catch (error) {
    console.error("Error fetching new users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/renewusers", async (req, res) => {
  try {
    const db = client.db("users_db");
    const renewUsers = await db
      .collection("renew_subscriptions")
      .find()
      .project({ _id: 1, name: 1, email: 1, mobile: 1, applied_on: 1 })
      .toArray();
    res.json(renewUsers);
  } catch (error) {
    console.error("Error fetching renew users:", error);
    res.status(500).json({ error: "Server error" });
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
