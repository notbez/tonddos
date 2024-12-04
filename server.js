const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database.db");

app.use(bodyParser.json());
app.use(express.static("public"));

// Создать таблицу пользователей
db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tg_id TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        donated INTEGER DEFAULT 0,
        messages INTEGER DEFAULT 5
    )
`);

// Telegram WebApp вход
app.post("/register", (req, res) => {
    const { tg_id, name } = req.body;

    db.get("SELECT * FROM users WHERE tg_id = ?", [tg_id], (err, user) => {
        if (err) return res.status(500).send({ error: "Database error" });

        if (!user) {
            db.run(
                "INSERT INTO users (tg_id, name, donated, messages) VALUES (?, ?, ?, ?)",
                [tg_id, name, 0, 5],
                (err) => {
                    if (err) return res.status(500).send({ error: "Database insert error" });
                    res.json({ success: true, message: "User registered successfully" });
                }
            );
        } else {
            res.json({ success: true, message: "User already registered" });
        }
    });
});

// Получить количество сообщений
app.get("/get-user-messages", (req, res) => {
    const { tg_id } = req.query;

    db.get("SELECT messages FROM users WHERE tg_id = ?", [tg_id], (err, row) => {
        if (err) {
            res.status(500).send({ error: "Database error" });
        } else {
            res.json({ messages: row ? row.messages : 0 });
        }
    });
});

// Купить сообщения
app.post("/buy-messages", (req, res) => {
    const { tg_id, amount } = req.body;
    const messagesToAdd = amount;

    db.get("SELECT * FROM users WHERE tg_id = ?", [tg_id], (err, user) => {
        if (err) return res.status(500).send({ error: "Database error" });

        if (user) {
            db.run(
                "UPDATE users SET messages = messages + ?, donated = donated + ? WHERE tg_id = ?",
                [messagesToAdd, amount, tg_id],
                (err) => {
                    if (err) return res.status(500).send({ error: "Database update error" });

                    res.json({ success: true, message: `Added ${messagesToAdd} messages` });
                }
            );
        } else {
            res.status(404).send({ error: "User not found" });
        }
    });
});

// Отправить сообщение ИИ
app.post("/send-message", async (req, res) => {
    const { tg_id, message } = req.body;

    db.get("SELECT messages FROM users WHERE tg_id = ?", [tg_id], async (err, user) => {
        if (err) return res.status(500).send({ error: "Database error" });

        if (user && user.messages > 0) {
            db.run(
                "UPDATE users SET messages = messages - 1 WHERE tg_id = ?",
                [tg_id],
                async (err) => {
                    if (err) return res.status(500).send({ error: "Failed to update messages" });

                    try {
                        // Запрос к API ИИ (Hugging Face)
                        const response = await axios.post(
                            "https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill",
                            { inputs: message },
                            { headers: { Authorization: `Bearer YOUR_HUGGING_FACE_API_KEY` } }
                        );
                        const aiResponse = response.data.generated_text || "I couldn't understand that.";

                        res.json({ success: true, reply: aiResponse });
                    } catch (apiError) {
                        res.status(500).send({ error: "Error connecting to AI" });
                    }
                }
            );
        } else {
            res.status(400).send({ error: "No messages left or user not found" });
        }
    });
});

// Получить лидерборд
app.get("/leaderboard", (req, res) => {
    db.all("SELECT name, donated AS stars FROM users ORDER BY donated DESC LIMIT 10", [], (err, rows) => {
        if (err) return res.status(500).send({ error: "Database error" });
        res.json(rows);
    });
});

const TelegramBot = require('node-telegram-bot-api');

// Укажите ваш API ключ для бота
const bot = new TelegramBot('YOUR_BOT_API_KEY', { polling: true });

// При получении команды /start от пользователя, отправляем кнопку для открытия мини-приложения
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: 'Open MiniApp',  // Текст кнопки
                    web_app: { url: 'https://your-app-name.onrender.com' }  // URL вашего мини-приложения
                }]
            ]
        }
    };

    bot.sendMessage(chatId, 'Welcome to the bot! Click below to open the mini app:', options);
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});