const express = require("express"); const session = require("express-session"); const bodyParser = require("body-parser"); const bcrypt = require("bcrypt"); const sqlite3 = require("sqlite3").verbose(); const path = require("path"); const cors = require("cors"); const multer = require("multer"); const AWS = require("aws-sdk"); const PDFDocument = require("pdfkit"); const xl = require("excel4node"); const nodemailer = require("nodemailer"); const http = require("http"); const socketio = require("socket.io"); require("dotenv").config();

const app = express(); const server = http.createServer(app); const io = socketio(server);

const db = new sqlite3.Database("./database.sqlite");

app.use(cors()); app.use(bodyParser.json()); app.use(bodyParser.urlencoded({ extended: true })); app.use(express.static("public"));

app.use( session({ secret: process.env.SESSION_SECRET || "defaultSecret123", resave: false, saveUninitialized: true }) );

AWS.config.update({ accessKeyId: process.env.AWS_ACCESS_KEY_ID || "", secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "", region: process.env.AWS_REGION || "ap-south-1" });

const s3 = new AWS.S3(); const storage = multer.memoryStorage(); const upload = multer({ storage: storage });

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    location TEXT,
    commodity TEXT,
    purchase_date TEXT,
    delivery_date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    location TEXT,
    commodity TEXT,
    purchase_date TEXT,
    delivery_date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS potential_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    pitch_details TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee TEXT,
    issue TEXT,
    status TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    date TEXT,
    time TEXT,
    type TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client TEXT,
    amount TEXT,
    status TEXT,
    date TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT,
    message TEXT,
    time TEXT
  )`);
});

const adminPassword = bcrypt.hashSync("Maldon@1234", 10);
db.run(
  `INSERT OR IGNORE INTO employees(username, password, role) VALUES (?, ?, ?)`,
  ["maldonadmin", adminPassword, "admin"]
);

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(
    `SELECT * FROM employees WHERE username = ?`,
    [username],
    (err, user) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      if (!user) return res.json({ success: false });

      if (bcrypt.compareSync(password, user.password)) {
        req.session.user = user.username;
        req.session.role = user.role;
        return res.json({ success: true, role: user.role });
      } else {
        return res.json({ success: false });
      }
    }
  );
});

function auth(req, res, next) {
  if (!req.session.user) return res.redirect("/");
  next();
}

app.post("/api/clients", auth, (req, res) => {
  const { name, location, commodity, purchase_date, delivery_date } = req.body;

  db.run(
    `INSERT INTO clients(name, location, commodity, purchase_date, delivery_date) VALUES (?, ?, ?, ?, ?)`,
    [name, location, commodity, purchase_date, delivery_date],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

app.get("/api/clients", auth, (req, res) => {
  db.all("SELECT * FROM clients", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

app.post("/api/vendors", auth, (req, res) => {
  const { name, location, commodity, purchase_date, delivery_date } = req.body;

  db.run(
    `INSERT INTO vendors(name, location, commodity, purchase_date, delivery_date) VALUES (?, ?, ?, ?, ?)`,
    [name, location, commodity, purchase_date, delivery_date],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

app.get("/api/vendors", auth, (req, res) => {
  db.all("SELECT * FROM vendors", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

app.post("/api/potential-clients", auth, (req, res) => {
  const { name, pitch_details } = req.body;

  db.run(
    `INSERT INTO potential_clients(name, pitch_details) VALUES (?, ?)`,
    [name, pitch_details],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

app.get("/api/potential-clients", auth, (req, res) => {
  db.all("SELECT * FROM potential_clients", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

app.post("/api/tickets", auth, (req, res) => {
  const { issue } = req.body;

  db.run(
    `INSERT INTO tickets(employee, issue, status) VALUES (?, ?, ?)`,
    [req.session.user, issue, "Open"],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

app.post("/api/attendance", auth, (req, res) => {
  const { type } = req.body;
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();

  db.run(
    `INSERT INTO attendance(username, date, time, type) VALUES (?, ?, ?, ?)`,
    [req.session.user, date, time, type],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

app.get("/api/attendance", auth, (req, res) => {
  db.all(
    `SELECT * FROM attendance WHERE username = ?`,
    [req.session.user],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json(rows);
    }
  );
});

app.post("/api/upload", auth, upload.single("file"), (req, res) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${Date.now()}_${req.file.originalname}`,
    Body: req.file.buffer,
  };

  s3.upload(params, (err, data) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, url: data.Location });
  });
});

app.post("/api/payments", auth, (req, res) => {
  const { client, amount, status } = req.body;
  const date = new Date().toLocaleDateString();

  db.run(
    `INSERT INTO payments(client, amount, status, date) VALUES (?, ?, ?, ?)`,
    [client, amount, status, date],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    }
  );
});

app.get("/api/payments", auth, (req, res) => {
  db.all("SELECT * FROM payments", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

app.get("/api/chat", auth, (req, res) => {
  db.all("SELECT * FROM chat_messages", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

app.get("/export/clients/pdf", auth, (req, res) => {
  db.all("SELECT * FROM clients", [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    doc.fontSize(22).text("Maldon Technologies Pvt. Ltd - Clients Report", { underline: true });
    rows.forEach((c) => {
      doc
        .fontSize(12)
        .text(
          `Name: ${c.name}\nLocation: ${c.location}\nCommodity: ${c.commodity}\nPurchase: ${c.purchase_date}\nDelivery: ${c.delivery_date}\n---`
        );
    });
    doc.end();
  });
});

app.get("/export/clients/excel", auth, (req, res) => {
  db.all("SELECT * FROM clients", [], (err, data) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const wb = new xl.Workbook();
    const ws = wb.addWorksheet("Clients");

    let row = 1;
    if (data.length > 0) {
      Object.keys(data[0]).forEach((key, i) => ws.cell(row, i + 1).string(key));
      data.forEach((obj) => {
        row++;
        Object.values(obj).forEach((val, i) => ws.cell(row, i + 1).string(String(val)));
      });
    }

    const filePath = "clients.xlsx";
    wb.write(filePath, (err) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.download(filePath, (downloadErr) => {
        if (downloadErr) return res.status(500).json({ success: false, error: downloadErr.message });
      });
    });
  });
});

app.get("/dashboard", auth, (req, res) => {
  const dashboardPath = path.join(__dirname, "public", "dashboard.html");
  res.sendFile(dashboardPath, (err) => {
    if (err) {
      res.status(500).send("Error loading the dashboard.");
    }
  });
});

server.listen(3000, () => {
  console.log("Server is running at http://localhost:3000");
});



