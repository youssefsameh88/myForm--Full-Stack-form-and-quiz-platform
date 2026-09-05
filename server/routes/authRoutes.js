import "dotenv/config";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await db.query(
            "SELECT * FROM users WHERE email=$1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).send("Email already exists");
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users
            (username, email, password_hash, role, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id, username, email, role, created_at`,
            [username, email, passwordHash, "user"]
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});


router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await db.query(
            "SELECT * FROM users WHERE email=$1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).send("Invalid email or password");
        }

        const user = result.rows[0];

        const passwordCorrect = await bcrypt.compare(password, user.password_hash);

        if (!passwordCorrect) {
            return res.status(401).send("Invalid email or password");
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 60 * 60 * 1000
        });

        res.status(200).json({
            message: "Logged in successfully",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});

router.get("/me", authMiddleware, async (req, res) => {
    try {

        const result = await db.query(
            `SELECT id, username, email, role
             FROM users
             WHERE id=$1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).send("User not found");
        }

        res.status(200).json(result.rows[0]);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});


router.post("/logout", (req, res) => {

    res.clearCookie("token");

    res.status(200).send("Logged out successfully");
});

export default router;