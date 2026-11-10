require("dotenv").config();
const path = require("path");
const http = require("http");
const express = require("express");
const session = require("express-session");
const pg = require("pg");
const PgSession = require("connect-pg-simple")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const crypto = require("crypto");
const { promisify } = require("util");

const { Pool } = pg;
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Create a PostgreSQL database and add its connection URL to your environment variables.");
}
if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error("Set SESSION_SECRET to a random value of at least 32 characters in production.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username VARCHAR(24) NOT NULL UNIQUE,
      display_name VARCHAR(40) NOT NULL,
      password_hash TEXT NOT NULL,
      bio VARCHAR(300) NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS posts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body VARCHAR(1200) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS likes (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      PRIMARY KEY(user_id, post_id)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id BIGSERIAL PRIMARY KEY,
      post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body VARCHAR(500) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body VARCHAR(2000) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reports (
      id BIGSERIAL PRIMARY KEY,
      reporter_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type VARCHAR(20) NOT NULL,
      target_id BIGINT NOT NULL,
      reason VARCHAR(300) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id, id);
    CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
  `);
}

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.socket.io"],
    styleSrc: ["'self'"],
    connectSrc: ["'self'", "ws:", "wss:"],
    imgSrc: ["'self'", "data:", "https:"]
  }
}}));
app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const sessionMiddleware = session({
  store: new PgSession({ pool, tableName: "user_sessions", createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: isProduction, maxAge: 7 * 24 * 60 * 60 * 1000 }
});
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const postLimiter = rateLimit({ windowMs: 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });
const clean = (v, max = 1000) => String(v ?? "").trim().slice(0, max);
const publicUser = u => ({ id: Number(u.id), username: u.username, displayName: u.display_name, bio: u.bio || "" });
async function currentUser(req) {
  if (!req.session.userId) return null;
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [req.session.userId]);
  return result.rows[0] || null;
}
async function requireAuth(req, res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Please sign in first." });
    req.user = user;
    next();
  } catch { res.status(500).json({ error: "Could not verify your session." }); }
}
const hashPassword = async password => {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await promisify(crypto.scrypt)(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
};
const verifyPassword = async (password, stored) => {
  const [salt, hex] = stored.split(":");
  const key = await promisify(crypto.scrypt)(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
};

app.get("/api/health", async (_req, res) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});
app.get("/api/me", async (req, res) => {
  try { const user = await currentUser(req); res.json({ user: user ? publicUser(user) : null }); }
  catch { res.status(500).json({ error: "Could not load account." }); }
});

app.post("/api/register", authLimiter, async (req, res) => {
  const username = clean(req.body.username, 24).toLowerCase();
  const displayName = clean(req.body.displayName, 40);
  const password = String(req.body.password || "");
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return res.status(400).json({ error: "Username must be 3–24 letters, numbers or underscores." });
  if (displayName.length < 2) return res.status(400).json({ error: "Display name must be at least 2 characters." });
  if (password.length < 10 || password.length > 200) return res.status(400).json({ error: "Use a password between 10 and 200 characters." });
  try {
    const result = await pool.query("INSERT INTO users (username, display_name, password_hash) VALUES ($1,$2,$3) RETURNING *", [username, displayName, await hashPassword(password)]);
    req.session.userId = result.rows[0].id;
    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "That username is already taken." });
    res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  const username = clean(req.body.username, 24);
  const password = String(req.body.password || "");
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username.toLowerCase()]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) return res.status(401).json({ error: "Username or password is incorrect." });
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ error: "Could not start session." });
      req.session.userId = user.id;
      res.json({ user: publicUser(user) });
    });
  } catch { res.status(500).json({ error: "Could not sign in." }); }
});
app.post("/api/logout", requireAuth, (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const q = clean(req.query.q, 30);
    const result = await pool.query(`SELECT id, username, display_name, bio FROM users
      WHERE id <> $1 AND (username ILIKE $2 OR display_name ILIKE $2) ORDER BY username LIMIT 30`, [req.user.id, `%${q}%`]);
    res.json({ users: result.rows.map(publicUser) });
  } catch { res.status(500).json({ error: "Could not find members." }); }
});
app.get("/api/feed", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT p.id, p.body, p.created_at, u.id AS author_id, u.username, u.display_name,
      (SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) AS likes,
      EXISTS(SELECT 1 FROM likes l WHERE l.post_id=p.id AND l.user_id=$1) AS liked,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) AS comments
      FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 100`, [req.user.id]);
    res.json({ posts: result.rows });
  } catch { res.status(500).json({ error: "Could not load the feed." }); }
});
app.post("/api/posts", requireAuth, postLimiter, async (req, res) => {
  const body = clean(req.body.body, 1200);
  if (!body) return res.status(400).json({ error: "Write something before posting." });
  try { const result = await pool.query("INSERT INTO posts (user_id,body) VALUES ($1,$2) RETURNING id", [req.user.id, body]); io.emit("feed:changed"); res.json({ id: Number(result.rows[0].id) }); }
  catch { res.status(500).json({ error: "Could not publish post." }); }
});
app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid post." });
  try {
    if (!(await pool.query("SELECT id FROM posts WHERE id=$1", [id])).rowCount) return res.status(404).json({ error: "Post not found." });
    const existing = await pool.query("SELECT 1 FROM likes WHERE user_id=$1 AND post_id=$2", [req.user.id, id]);
    if (existing.rowCount) await pool.query("DELETE FROM likes WHERE user_id=$1 AND post_id=$2", [req.user.id, id]);
    else await pool.query("INSERT INTO likes (user_id,post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING", [req.user.id, id]);
    io.emit("feed:changed"); res.json({ liked: !existing.rowCount });
  } catch { res.status(500).json({ error: "Could not update like." }); }
});
app.get("/api/posts/:id/comments", requireAuth, async (req, res) => {
  try { const result = await pool.query(`SELECT c.id,c.body,c.created_at,u.username,u.display_name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.id`, [Number(req.params.id)]); res.json({ comments: result.rows }); }
  catch { res.status(500).json({ error: "Could not load comments." }); }
});
app.post("/api/posts/:id/comments", requireAuth, postLimiter, async (req, res) => {
  const body = clean(req.body.body, 500); const id = Number(req.params.id);
  if (!body) return res.status(400).json({ error: "Comment cannot be empty." });
  try {
    if (!(await pool.query("SELECT id FROM posts WHERE id=$1", [id])).rowCount) return res.status(404).json({ error: "Post not found." });
    await pool.query("INSERT INTO comments (post_id,user_id,body) VALUES ($1,$2,$3)", [id, req.user.id, body]);
    io.emit("feed:changed"); res.json({ ok: true });
  } catch { res.status(500).json({ error: "Could not add comment." }); }
});

app.get("/api/messages/:userId", requireAuth, async (req, res) => {
  const other = Number(req.params.userId);
  if (!Number.isSafeInteger(other) || other < 1) return res.status(400).json({ error: "Invalid member." });
  try {
    if (!(await pool.query("SELECT id FROM users WHERE id=$1", [other])).rowCount) return res.status(404).json({ error: "User not found." });
    const result = await pool.query(`SELECT m.id,m.sender_id,m.receiver_id,m.body,m.created_at,s.username AS sender_name
      FROM messages m JOIN users s ON s.id=m.sender_id
      WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1)
      ORDER BY m.id DESC LIMIT 100`, [req.user.id, other]);
    res.json({ messages: result.rows.reverse() });
  } catch { res.status(500).json({ error: "Could not load messages." }); }
});
app.post("/api/messages/:userId", requireAuth, postLimiter, async (req, res) => {
  const receiver = Number(req.params.userId); const body = clean(req.body.body, 2000);
  if (!body) return res.status(400).json({ error: "Message cannot be empty." });
  if (!Number.isSafeInteger(receiver) || receiver < 1 || receiver === Number(req.user.id)) return res.status(404).json({ error: "Recipient not found." });
  try {
    if (!(await pool.query("SELECT id FROM users WHERE id=$1", [receiver])).rowCount) return res.status(404).json({ error: "Recipient not found." });
    const result = await pool.query("INSERT INTO messages (sender_id,receiver_id,body) VALUES ($1,$2,$3) RETURNING id,sender_id,receiver_id,body,created_at", [req.user.id, receiver, body]);
    const message = result.rows[0];
    io.to(`user:${receiver}`).emit("message:new", message);
    io.to(`user:${req.user.id}`).emit("message:new", message);
    res.json({ message });
  } catch { res.status(500).json({ error: "Could not send message." }); }
});
app.post("/api/report", requireAuth, async (req, res) => {
  const targetType = clean(req.body.targetType, 20); const targetId = Number(req.body.targetId); const reason = clean(req.body.reason, 300);
  if (!["user", "post"].includes(targetType) || !Number.isSafeInteger(targetId) || targetId < 1 || !reason) return res.status(400).json({ error: "Please provide a valid report." });
  try { await pool.query("INSERT INTO reports (reporter_id,target_type,target_id,reason) VALUES ($1,$2,$3,$4)", [req.user.id, targetType, targetId, reason]); res.json({ ok: true }); }
  catch { res.status(500).json({ error: "Could not submit report." }); }
});

app.post("/api/ai/assist", requireAuth, postLimiter, async (req, res) => {
  const prompt = clean(req.body.text, 1000); const task = clean(req.body.task, 30);
  if (!prompt) return res.status(400).json({ error: "Add some text first." });
  if (!process.env.OPENAI_API_KEY) {
    const local = task === "kind"
      ? `A kinder way to say it: "${prompt.replace(/\b(stupid|idiot|hate)\b/gi, "unhelpful")}" Consider whether this message is respectful before sending.`
      : `Writing tip: make your main point clear, keep it respectful, and break long sentences into shorter ones.\n\nYour draft: ${prompt}`;
    return res.json({ result: local, mode: "basic" });
  }
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4.1-mini", instructions: "You are Orbit's safe writing helper. Help users express themselves clearly and kindly. Do not generate harassment, threats, sexual content involving minors, or instructions for dangerous acts. Keep the response concise. Do not send messages or publish anything.", input: `${task === "kind" ? "Rewrite this more kindly:" : "Improve the clarity of this draft:"}\n${prompt}` })
    });
    if (!response.ok) throw new Error("AI provider request failed");
    const data = await response.json();
    const result = (data.output || []).flatMap(item => item.content || []).filter(x => x.type === "output_text").map(x => x.text).join("\n");
    res.json({ result: result || "I couldn't create a suggestion. Please try again.", mode: "ai" });
  } catch { res.status(502).json({ error: "The writing assistant is temporarily unavailable." }); }
});

io.use((socket, next) => {
  const userId = socket.request.session?.userId;
  if (!userId) return next(new Error("Sign in required"));
  socket.userId = userId;
  next();
});
io.on("connection", socket => socket.join(`user:${socket.userId}`));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

initializeDatabase().then(() => {
  server.listen(PORT, () => console.log(`Orbit is running on port ${PORT}`));
}).catch(err => {
  console.error("Database startup failed:", err.message);
  process.exit(1);
});

async function shutdown() {
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
