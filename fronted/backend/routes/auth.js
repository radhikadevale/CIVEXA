const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../database/db");

const router = express.Router();

// Register new citizen
router.post("/register", async (req, res) => {
    try {
        const { full_name, email, phone, password } = req.body;

        // Check required fields
        if (!full_name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required."
            });
        }

        // Check if email already exists
        const [existingUser] = await db.query(
            "SELECT user_id FROM users WHERE email = ?",
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                message: "Email is already registered."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await db.query(
            `INSERT INTO users
            (full_name, email, phone, password)
            VALUES (?, ?, ?, ?)`,
            [full_name, email, phone || null, hashedPassword]
        );

        res.status(201).json({
            message: "Registration successful!",
            user_id: result.insertId
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Registration failed."
        });
    }
});



// Forgot password
router.post("/forgot-password", async (req, res) => {

    try {

        const { email } = req.body;

        // Check required field
        if (!email) {
            return res.status(400).json({
                message: "Email address is required."
            });
        }

        // Check if user exists
        const [users] = await db.query(
            "SELECT user_id FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "No account found with this email."
            });
        }

        // Generate reset token
        const resetToken =
            crypto.randomBytes(32).toString("hex");

        // Token expires after 15 minutes
        const expiry = new Date(
            Date.now() + 15 * 60 * 1000
        );

        // Save token in database
        await db.query(
            `UPDATE users
             SET reset_token = ?,
                 reset_token_expires = ?
             WHERE email = ?`,
            [resetToken, expiry, email]
        );

        console.log("Password reset token:", resetToken);

        res.json({
            message: "Password reset request created successfully.",
            reset_token: resetToken
        });

    } catch (error) {

        console.error("Forgot password error:", error);

        res.status(500).json({
            message: "Forgot password request failed."
        });

    }

});

// Login user
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required."
            });
        }

        // Find user by email
        const [users] = await db.query(
            "SELECT * FROM users WHERE email = ?",
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        const user = users[0];

        // Compare entered password with stored hash
        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        // Successful login
        res.json({
            message: "Login successful!",
            user: {
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Login failed."
        });
    }
});

// Reset password
router.post("/reset-password", async (req, res) => {

    try {

        const { token, password } = req.body;

        // Check required fields
        if (!token || !password) {
            return res.status(400).json({
                message: "Reset token and new password are required."
            });
        }

        // Find user with valid token
        const [users] = await db.query(
            `SELECT user_id
             FROM users
             WHERE reset_token = ?
             AND reset_token_expires > NOW()`,
            [token]
        );

        // Check token
        if (users.length === 0) {
            return res.status(400).json({
                message: "Reset token is invalid or expired."
            });
        }

        const userId = users[0].user_id;

        // Hash new password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // Update password and clear reset token
        await db.query(
            `UPDATE users
             SET password = ?,
                 reset_token = NULL,
                 reset_token_expires = NULL
             WHERE user_id = ?`,
            [hashedPassword, userId]
        );

        res.json({
            message: "Password reset successfully!"
        });

    } catch (error) {

        console.error(
            "Reset password error:",
            error
        );

        res.status(500).json({
            message: "Password reset failed."
        });

    }

});

// Update user profile
router.put("/profile/:userId", async (req, res) => {

    try {

        const userId = req.params.userId;

        const { full_name, email, phone } = req.body;

        // Check required fields
        if (!full_name || !email) {
            return res.status(400).json({
                message: "Name and email are required."
            });
        }

        // Check whether email belongs to another user
        const [existingUser] = await db.query(
            `SELECT user_id
             FROM users
             WHERE email = ?
             AND user_id != ?`,
            [email, userId]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                message: "Email is already registered by another user."
            });
        }

        // Update profile
        await db.query(
            `UPDATE users
             SET full_name = ?,
                 email = ?,
                 phone = ?
             WHERE user_id = ?`,
            [
                full_name,
                email,
                phone || null,
                userId
            ]
        );

        // Get updated user
        const [users] = await db.query(
            `SELECT
                user_id,
                full_name,
                email,
                phone,
                role
             FROM users
             WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.json({
            message: "Profile updated successfully!",
            user: users[0]
        });

    } catch (error) {

        console.error(
            "Profile update error:",
            error
        );

        res.status(500).json({
            message: "Profile update failed."
        });

    }

});

// Change password for logged-in user
router.put("/change-password/:userId", async (req, res) => {

    try {

        const { userId } = req.params;
        const {
            currentPassword,
            newPassword
        } = req.body;

        // Check required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required."
            });
        }

        // Get user's current password
        const [users] = await db.query(
            `SELECT user_id, password
             FROM users
             WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const user = users[0];

        // Verify current password
        const passwordMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Current password is incorrect."
            });
        }

        // Hash new password
        const hashedPassword =
            await bcrypt.hash(newPassword, 10);

        // Update password
        await db.query(
            `UPDATE users
             SET password = ?
             WHERE user_id = ?`,
            [
                hashedPassword,
                userId
            ]
        );

        res.json({
            message: "Password changed successfully!"
        });

    } catch (error) {

        console.error(
            "Change password error:",
            error
        );

        res.status(500).json({
            message: "Password change failed."
        });

    }

});
module.exports = router;