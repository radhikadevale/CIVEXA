
const express = require("express");
const cors = require("cors");
const db = require("./database/db");
const authRoutes = require("./routes/auth");
const issueRoutes = require("./routes/issues");

const app = express();

const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use(
    "/uploads",
    express.static("uploads")
);

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("CIVEXA Backend is running successfully!");
});

// Database test route
app.get("/test-db", async (req, res) => {
    try {
        const [result] = await db.query(
            "SELECT DATABASE() AS database_name"
        );

        res.json({
            message: "Database connected successfully!",
            database: result[0].database_name
        });

    } catch (error) {
        console.error("Database error:", error);

        res.status(500).json({
            message: "Database connection failed"
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`CIVEXA server running at http://localhost:${PORT}`);
});