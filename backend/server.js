// ─────────────────────────────────────────────────────────────────────────────
// XERVLINK BACKEND — server.js
// Node.js + Express + PostgreSQL + JWT + bcrypt
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const { Pool }  = require("pg");
const multer    = require("multer");
const path      = require("path");
const fs        = require("fs");

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PORT        = process.env.PORT       || 4000;
const JWT_SECRET  = process.env.JWT_SECRET || "xervlink_jwt_secret_CHANGE_IN_PROD";
const JWT_EXPIRES = "7d";

// ─── ADMIN SEED (you — Brandon) ───────────────────────────────────────────────
const SEED_ADMIN = {
  name:     "Brandon",
  email:    "brand0nkkim100@gmail.com",
  password: "Bkk#2006",
};

// ─── DATABASE POOL ────────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "xervlink",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD || "password",
  max: 10,
  idleTimeoutMillis: 30000,
});
pool.on("error", err => console.error("PG pool error:", err.message));

// ─── UPLOAD DIRECTORIES ───────────────────────────────────────────────────────
const UPLOAD_ROOT    = path.join(__dirname, "uploads");
const AVATAR_DIR     = path.join(UPLOAD_ROOT, "avatars");
const PORTFOLIO_DIR  = path.join(UPLOAD_ROOT, "portfolio");

[UPLOAD_ROOT, AVATAR_DIR, PORTFOLIO_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ─── MULTER ───────────────────────────────────────────────────────────────────
const imageFilter = (_, file, cb) => {
  const ok = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  cb(null, ok.includes(file.mimetype));
};

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (_, f, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(f.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const portfolioUpload = multer({
  storage: multer.diskStorage({
    destination: PORTFOLIO_DIR,
    filename: (_, f, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(f.originalname)}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter,
});

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE INIT
// ─────────────────────────────────────────────────────────────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── USERS ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(120)  NOT NULL,
        email         VARCHAR(200)  UNIQUE NOT NULL,
        password_hash VARCHAR(255)  NOT NULL,
        role          VARCHAR(20)   NOT NULL DEFAULT 'USER'
                        CHECK (role IN ('USER','PROVIDER','ADMIN')),
        phone         VARCHAR(30),
        avatar_url    TEXT,
        location      VARCHAR(200),
        is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      );
    `);

    // ── SERVICES ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id    SERIAL PRIMARY KEY,
        name  VARCHAR(100) UNIQUE NOT NULL,
        slug  VARCHAR(100) UNIQUE NOT NULL,
        icon  VARCHAR(60),
        sub   VARCHAR(200)
      );
    `);

    await client.query(`
      INSERT INTO services (name, slug, icon, sub) VALUES
        ('Barber',     'barber',      'scissors', 'Cuts & grooming'),
        ('Salon',      'salon',       'wand',     'Styling & makeup'),
        ('Nail Tech',  'nail-tech',   'sparkle',  'Manicure & care'),
        ('Car Detail', 'car-detail',  'car',      'Full detailing'),
        ('Tattoo',     'tattoo',      'pen',      'Custom artwork'),
        ('Fitness',    'fitness',     'bolt',     'Personal training'),
        ('Cleaning',   'cleaning',    'home',     'Home & office'),
        ('Handyman',   'handyman',    'tool',     'Repairs & installs'),
        ('Photo',      'photo',       'aperture', 'Professional shoots'),
        ('Tutor',      'tutor',       'book',     '1-on-1 sessions')
      ON CONFLICT (slug) DO UPDATE SET sub = EXCLUDED.sub;
    `);

    // ── PROVIDERS ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS providers (
        id           SERIAL PRIMARY KEY,
        user_id      INT           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_id   INT           NOT NULL REFERENCES services(id),
        bio          TEXT,
        price        NUMERIC(10,2) NOT NULL DEFAULT 0,
        verified     BOOLEAN       NOT NULL DEFAULT FALSE,
        available    BOOLEAN       NOT NULL DEFAULT TRUE,
        rating       NUMERIC(3,2)  NOT NULL DEFAULT 0,
        review_count INT           NOT NULL DEFAULT 0,
        location     VARCHAR(200),
        lat          NUMERIC(10,7),
        lng          NUMERIC(10,7),
        years_exp    INT           NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, service_id)
      );
    `);

    // ── PROVIDER IMAGES (portfolio) ───────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS provider_images (
        id          SERIAL PRIMARY KEY,
        provider_id INT   NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        url         TEXT  NOT NULL,
        caption     VARCHAR(200),
        is_cover    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── BOOKINGS ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id            SERIAL PRIMARY KEY,
        user_id       INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id   INT          NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        service_id    INT          NOT NULL REFERENCES services(id),
        date          DATE         NOT NULL,
        time          TIME         NOT NULL,
        address       TEXT,
        status        VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','completed','cancelled')),
        price         NUMERIC(10,2),
        notes         TEXT,
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // ── CONVERSATIONS ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id            SERIAL PRIMARY KEY,
        user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id   INT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, provider_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id              SERIAL PRIMARY KEY,
        conversation_id INT     NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id       INT     NOT NULL REFERENCES users(id),
        body            TEXT    NOT NULL,
        read            BOOLEAN NOT NULL DEFAULT FALSE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ── REVIEWS ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id           SERIAL PRIMARY KEY,
        booking_id   INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        user_id      INT NOT NULL REFERENCES users(id),
        provider_id  INT NOT NULL REFERENCES providers(id),
        rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment      TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (booking_id)
      );
    `);

    // ── NOTIFICATION PREFS ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_prefs (
        user_id           INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        booking_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
        booking_reminder  BOOLEAN NOT NULL DEFAULT TRUE,
        new_message       BOOLEAN NOT NULL DEFAULT TRUE,
        promotions        BOOLEAN NOT NULL DEFAULT FALSE,
        provider_updates  BOOLEAN NOT NULL DEFAULT TRUE,
        app_updates       BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    // ── PAYMENT PREFS ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_prefs (
        user_id     INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        method      VARCHAR(20) NOT NULL DEFAULT 'cash'
                      CHECK (method IN ('mpesa','cash')),
        mpesa_phone VARCHAR(20)
      );
    `);

    // ── updated_at TRIGGER ───────────────────────────────────────────────────
    await client.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    for (const tbl of ["users", "bookings"]) {
      await client.query(`
        DROP TRIGGER IF EXISTS trg_${tbl}_upd ON ${tbl};
        CREATE TRIGGER trg_${tbl}_upd
          BEFORE UPDATE ON ${tbl}
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
    }

    await client.query("COMMIT");
    console.log("✓ Schema ready");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ initDB error:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED BRANDON AS ADMIN (runs every startup — idempotent)
// ─────────────────────────────────────────────────────────────────────────────
async function seedAdmin() {
  const exists = await pool.query("SELECT id FROM users WHERE email = $1", [SEED_ADMIN.email]);
  if (exists.rows.length) {
    // Ensure always ADMIN even if manually changed
    await pool.query("UPDATE users SET role = 'ADMIN' WHERE email = $1", [SEED_ADMIN.email]);
    console.log("✓ Admin account verified:", SEED_ADMIN.email);
    return;
  }
  const hash = await bcrypt.hash(SEED_ADMIN.password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'ADMIN') RETURNING id`,
    [SEED_ADMIN.name, SEED_ADMIN.email, hash]
  );
  await pool.query("INSERT INTO notification_prefs (user_id) VALUES ($1)", [rows[0].id]);
  await pool.query("INSERT INTO payment_prefs (user_id) VALUES ($1)", [rows[0].id]);
  console.log("✓ Admin account created:", SEED_ADMIN.email);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPRESS APP
// ─────────────────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_ROOT));

// ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const sign = u => jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
const ok   = (res, data, s = 200) => res.status(s).json({ success: true, ...data });
const fail = (res, msg, s = 400) => res.status(s).json({ success: false, error: msg });

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────

app.get("/health", (_, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, role: reqRole = "USER" } = req.body;
  if (!name || !email || !password) return fail(res, "name, email and password are required");
  if (!["USER","PROVIDER"].includes(reqRole)) return fail(res, "Role must be USER or PROVIDER");
  if (password.length < 6) return fail(res, "Password must be at least 6 characters");

  // Nobody can self-register as ADMIN
  const safeRole = reqRole === "ADMIN" ? "USER" : reqRole;

  try {
    const dup = await pool.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (dup.rows.length) return fail(res, "Email already registered", 409);

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.toLowerCase().trim(), hash, safeRole]
    );
    const u = rows[0];
    await pool.query("INSERT INTO notification_prefs (user_id) VALUES ($1)", [u.id]);
    await pool.query("INSERT INTO payment_prefs (user_id) VALUES ($1)", [u.id]);
    return ok(res, { user: u, token: sign(u) }, 201);
  } catch (err) {
    console.error(err);
    return fail(res, "Registration failed", 500);
  }
});

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, "Email and password are required");
  try {
    const { rows } = await pool.query(
      "SELECT id, name, email, role, password_hash, avatar_url, phone, location FROM users WHERE email = $1 AND is_active = TRUE",
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return fail(res, "Invalid credentials", 401);
    const u = rows[0];
    const valid = await bcrypt.compare(password, u.password_hash);
    if (!valid) return fail(res, "Invalid credentials", 401);
    delete u.password_hash;
    return ok(res, { user: u, token: sign(u) });
  } catch (err) {
    return fail(res, "Login failed", 500);
  }
});

// GET /api/auth/me
app.get("/api/auth/me", auth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, phone, avatar_url, location, created_at FROM users WHERE id = $1",
    [req.user.id]
  );
  if (!rows.length) return fail(res, "Not found", 404);
  return ok(res, { user: rows[0] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// USERS / PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

// PUT /api/users/me
app.put("/api/users/me", auth, async (req, res) => {
  const { name, phone, location } = req.body;
  const { rows } = await pool.query(
    `UPDATE users SET
       name     = COALESCE($1, name),
       phone    = COALESCE($2, phone),
       location = COALESCE($3, location)
     WHERE id = $4
     RETURNING id, name, email, role, phone, avatar_url, location`,
    [name, phone, location, req.user.id]
  );
  return ok(res, { user: rows[0] });
});

// POST /api/users/me/avatar
app.post("/api/users/me/avatar", auth, avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) return fail(res, "No image uploaded or invalid file type");
  const url = `/uploads/avatars/${req.file.filename}`;
  await pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [url, req.user.id]);
  return ok(res, { avatar_url: url });
});

// GET/PUT /api/users/me/notifications
app.get("/api/users/me/notifications", auth, async (req, res) => {
  await pool.query("INSERT INTO notification_prefs (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [req.user.id]);
  const { rows } = await pool.query("SELECT * FROM notification_prefs WHERE user_id = $1", [req.user.id]);
  return ok(res, { prefs: rows[0] });
});
app.put("/api/users/me/notifications", auth, async (req, res) => {
  const { booking_confirmed, booking_reminder, new_message, promotions, provider_updates, app_updates } = req.body;
  await pool.query("INSERT INTO notification_prefs (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [req.user.id]);
  const { rows } = await pool.query(
    `UPDATE notification_prefs SET
       booking_confirmed = COALESCE($1, booking_confirmed),
       booking_reminder  = COALESCE($2, booking_reminder),
       new_message       = COALESCE($3, new_message),
       promotions        = COALESCE($4, promotions),
       provider_updates  = COALESCE($5, provider_updates),
       app_updates       = COALESCE($6, app_updates)
     WHERE user_id = $7 RETURNING *`,
    [booking_confirmed, booking_reminder, new_message, promotions, provider_updates, app_updates, req.user.id]
  );
  return ok(res, { prefs: rows[0] });
});

// GET/PUT /api/users/me/payment
app.get("/api/users/me/payment", auth, async (req, res) => {
  await pool.query("INSERT INTO payment_prefs (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [req.user.id]);
  const { rows } = await pool.query("SELECT * FROM payment_prefs WHERE user_id = $1", [req.user.id]);
  return ok(res, { prefs: rows[0] });
});
app.put("/api/users/me/payment", auth, async (req, res) => {
  const { method, mpesa_phone } = req.body;
  if (method && !["mpesa","cash"].includes(method)) return fail(res, "Invalid method");
  await pool.query("INSERT INTO payment_prefs (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [req.user.id]);
  const { rows } = await pool.query(
    `UPDATE payment_prefs SET
       method      = COALESCE($1, method),
       mpesa_phone = COALESCE($2, mpesa_phone)
     WHERE user_id = $3 RETURNING *`,
    [method, mpesa_phone, req.user.id]
  );
  return ok(res, { prefs: rows[0] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/services", async (_, res) => {
  const { rows } = await pool.query("SELECT * FROM services ORDER BY id");
  return ok(res, { services: rows });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/providers?service_id=&sort=
app.get("/api/providers", async (req, res) => {
  const { service_id, sort = "toprated" } = req.query;
  const params = [];
  let where = "WHERE u.is_active = TRUE";
  if (service_id) { params.push(service_id); where += ` AND p.service_id = $${params.length}`; }

  const order = {
    toprated:  "p.rating DESC, p.review_count DESC",
    available: "p.available DESC, p.rating DESC",
    nearest:   "p.rating DESC",
  }[sort] || "p.rating DESC";

  const { rows } = await pool.query(`
    SELECT p.id, p.bio, p.price, p.verified, p.available, p.rating, p.review_count,
           p.location, p.years_exp, p.service_id,
           u.id AS user_id, u.name, u.avatar_url, u.phone,
           s.name AS service_name, s.slug AS service_slug, s.icon,
           (SELECT url FROM provider_images WHERE provider_id = p.id AND is_cover = TRUE LIMIT 1) AS cover_image
    FROM providers p
    JOIN users    u ON u.id = p.user_id
    JOIN services s ON s.id = p.service_id
    ${where}
    ORDER BY ${order}
  `, params);
  return ok(res, { providers: rows });
});

// GET /api/providers/:id
app.get("/api/providers/:id", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.*, u.name, u.avatar_url, u.phone,
           s.name AS service_name, s.id AS service_id,
           (SELECT json_agg(json_build_object('id',pi.id,'url',pi.url,'caption',pi.caption,'is_cover',pi.is_cover) ORDER BY pi.is_cover DESC, pi.created_at)
            FROM provider_images pi WHERE pi.provider_id = p.id) AS images
    FROM providers p
    JOIN users    u ON u.id = p.user_id
    JOIN services s ON s.id = p.service_id
    WHERE p.id = $1
  `, [req.params.id]);
  if (!rows.length) return fail(res, "Not found", 404);
  return ok(res, { provider: rows[0] });
});

// GET /api/providers/:id/reviews
app.get("/api/providers/:id/reviews", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer_name
    FROM reviews r JOIN users u ON u.id = r.user_id
    WHERE r.provider_id = $1 ORDER BY r.created_at DESC LIMIT 50
  `, [req.params.id]);
  return ok(res, { reviews: rows });
});

// POST /api/providers  — register as provider
app.post("/api/providers", auth, role("PROVIDER"), async (req, res) => {
  const { service_id, bio, price, location, lat, lng, years_exp } = req.body;
  if (!service_id || !price) return fail(res, "service_id and price are required");
  try {
    const { rows } = await pool.query(
      `INSERT INTO providers (user_id, service_id, bio, price, location, lat, lng, years_exp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id, service_id) DO UPDATE SET bio=$3, price=$4, location=$5, lat=$6, lng=$7, years_exp=$8
       RETURNING *`,
      [req.user.id, service_id, bio, price, location, lat, lng, years_exp || 0]
    );
    return ok(res, { provider: rows[0] }, 201);
  } catch (err) { return fail(res, "Failed", 500); }
});

// PUT /api/providers/:id
app.put("/api/providers/:id", auth, role("PROVIDER","ADMIN"), async (req, res) => {
  const { bio, price, available, location, years_exp } = req.body;
  const check = await pool.query("SELECT user_id FROM providers WHERE id = $1", [req.params.id]);
  if (!check.rows.length) return fail(res, "Not found", 404);
  if (req.user.role !== "ADMIN" && check.rows[0].user_id !== req.user.id) return fail(res, "Forbidden", 403);
  const { rows } = await pool.query(
    `UPDATE providers SET bio=$1, price=COALESCE($2,price), available=COALESCE($3,available),
     location=COALESCE($4,location), years_exp=COALESCE($5,years_exp)
     WHERE id=$6 RETURNING *`,
    [bio, price, available, location, years_exp, req.params.id]
  );
  return ok(res, { provider: rows[0] });
});

// ── PROVIDER IMAGES ──────────────────────────────────────────────────────────

// POST /api/providers/:id/images  — upload portfolio image
app.post("/api/providers/:id/images", auth, role("PROVIDER","ADMIN"), portfolioUpload.single("image"), async (req, res) => {
  if (!req.file) return fail(res, "No image uploaded");
  const { caption, is_cover } = req.body;

  // Verify ownership
  const check = await pool.query("SELECT user_id FROM providers WHERE id = $1", [req.params.id]);
  if (!check.rows.length) return fail(res, "Provider not found", 404);
  if (req.user.role !== "ADMIN" && check.rows[0].user_id !== req.user.id) return fail(res, "Forbidden", 403);

  const url = `/uploads/portfolio/${req.file.filename}`;
  const setCover = is_cover === "true" || is_cover === true;

  // If setting as cover, unset others first
  if (setCover) {
    await pool.query("UPDATE provider_images SET is_cover = FALSE WHERE provider_id = $1", [req.params.id]);
  }
  const { rows } = await pool.query(
    "INSERT INTO provider_images (provider_id, url, caption, is_cover) VALUES ($1,$2,$3,$4) RETURNING *",
    [req.params.id, url, caption || null, setCover]
  );

  // Also set as cover if it's the first image
  const count = await pool.query("SELECT COUNT(*) FROM provider_images WHERE provider_id = $1", [req.params.id]);
  if (parseInt(count.rows[0].count) === 1) {
    await pool.query("UPDATE provider_images SET is_cover = TRUE WHERE id = $1", [rows[0].id]);
    rows[0].is_cover = true;
  }
  return ok(res, { image: rows[0] }, 201);
});

// DELETE /api/providers/:id/images/:imgId
app.delete("/api/providers/:id/images/:imgId", auth, role("PROVIDER","ADMIN"), async (req, res) => {
  const check = await pool.query("SELECT user_id FROM providers WHERE id = $1", [req.params.id]);
  if (req.user.role !== "ADMIN" && check.rows[0]?.user_id !== req.user.id) return fail(res, "Forbidden", 403);

  const { rows } = await pool.query(
    "DELETE FROM provider_images WHERE id = $1 AND provider_id = $2 RETURNING *",
    [req.params.imgId, req.params.id]
  );
  if (!rows.length) return fail(res, "Image not found", 404);

  // Delete file from disk
  const filePath = path.join(__dirname, rows[0].url);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  return ok(res, { message: "Image deleted" });
});

// PUT /api/providers/:id/avatar  — provider profile picture via avatar upload
app.post("/api/providers/avatar", auth, role("PROVIDER"), avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) return fail(res, "No file");
  const url = `/uploads/avatars/${req.file.filename}`;
  await pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [url, req.user.id]);
  return ok(res, { avatar_url: url });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKINGS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/bookings", auth, async (req, res) => {
  const { status } = req.query;
  const params = [req.user.id];
  let where2 = "";
  if (status) { params.push(status); where2 = ` AND b.status = $${params.length}`; }

  let q;
  if (req.user.role === "PROVIDER") {
    q = `SELECT b.*, u.name AS client_name, u.avatar_url AS client_avatar, s.name AS service_name
         FROM bookings b
         JOIN providers pr ON pr.id = b.provider_id
         JOIN users u ON u.id = b.user_id
         JOIN services s ON s.id = b.service_id
         WHERE pr.user_id = $1${where2} ORDER BY b.date DESC, b.time DESC`;
  } else {
    q = `SELECT b.*, u.name AS provider_name, u.avatar_url AS provider_avatar, s.name AS service_name
         FROM bookings b
         JOIN providers pr ON pr.id = b.provider_id
         JOIN users u ON u.id = pr.user_id
         JOIN services s ON s.id = b.service_id
         WHERE b.user_id = $1${where2} ORDER BY b.date DESC, b.time DESC`;
  }
  const { rows } = await pool.query(q, params);
  return ok(res, { bookings: rows });
});

app.get("/api/bookings/:id", auth, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT b.*, u.name AS provider_name, s.name AS service_name
    FROM bookings b JOIN providers pr ON pr.id=b.provider_id
    JOIN users u ON u.id=pr.user_id JOIN services s ON s.id=b.service_id
    WHERE b.id = $1
  `, [req.params.id]);
  if (!rows.length) return fail(res, "Not found", 404);
  if (req.user.role !== "ADMIN" && rows[0].user_id !== req.user.id) return fail(res, "Forbidden", 403);
  return ok(res, { booking: rows[0] });
});

app.post("/api/bookings", auth, role("USER"), async (req, res) => {
  const { provider_id, service_id, date, time, address, notes } = req.body;
  if (!provider_id || !service_id || !date || !time) return fail(res, "provider_id, service_id, date, time required");
  try {
    const pr = await pool.query("SELECT price FROM providers WHERE id = $1 AND available = TRUE", [provider_id]);
    if (!pr.rows.length) return fail(res, "Provider not found or unavailable", 404);
    const { rows } = await pool.query(
      `INSERT INTO bookings (user_id,provider_id,service_id,date,time,address,notes,price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, provider_id, service_id, date, time, address, notes, pr.rows[0].price]
    );
    return ok(res, { booking: rows[0] }, 201);
  } catch (err) { console.error(err); return fail(res, "Booking failed", 500); }
});

app.patch("/api/bookings/:id/status", auth, async (req, res) => {
  const { status } = req.body;
  if (!["pending","confirmed","completed","cancelled"].includes(status)) return fail(res, "Invalid status");
  const check = await pool.query(`
    SELECT b.user_id, pr.user_id AS prov_uid FROM bookings b
    JOIN providers pr ON pr.id = b.provider_id WHERE b.id = $1
  `, [req.params.id]);
  if (!check.rows.length) return fail(res, "Not found", 404);
  const { user_id, prov_uid } = check.rows[0];
  if (req.user.role !== "ADMIN" && req.user.id !== user_id && req.user.id !== prov_uid) return fail(res, "Forbidden", 403);
  const { rows } = await pool.query("UPDATE bookings SET status=$1 WHERE id=$2 RETURNING *", [status, req.params.id]);
  return ok(res, { booking: rows[0] });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/conversations", auth, async (req, res) => {
  const isProvider = req.user.role === "PROVIDER";
  const q = isProvider
    ? `SELECT c.id, u.id AS other_id, u.name AS other_name, u.avatar_url AS other_avatar,
              (SELECT body FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_at,
              (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id AND sender_id!=$1 AND read=FALSE)::int AS unread
       FROM conversations c JOIN providers pr ON pr.id=c.provider_id JOIN users u ON u.id=c.user_id
       WHERE pr.user_id=$1 ORDER BY last_at DESC NULLS LAST`
    : `SELECT c.id, u.id AS other_id, u.name AS other_name, u.avatar_url AS other_avatar,
              (SELECT body FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) AS last_at,
              (SELECT COUNT(*) FROM messages WHERE conversation_id=c.id AND sender_id!=$1 AND read=FALSE)::int AS unread
       FROM conversations c JOIN providers pr ON pr.id=c.provider_id JOIN users u ON u.id=pr.user_id
       WHERE c.user_id=$1 ORDER BY last_at DESC NULLS LAST`;
  const { rows } = await pool.query(q, [req.user.id]);
  return ok(res, { conversations: rows });
});

app.post("/api/conversations", auth, async (req, res) => {
  const { provider_id } = req.body;
  if (!provider_id) return fail(res, "provider_id required");
  if (req.user.role !== "USER") return fail(res, "Only users can start conversations");
  const { rows } = await pool.query(
    `INSERT INTO conversations (user_id,provider_id) VALUES ($1,$2)
     ON CONFLICT (user_id,provider_id) DO UPDATE SET created_at=conversations.created_at RETURNING *`,
    [req.user.id, provider_id]
  );
  return ok(res, { conversation: rows[0] }, 201);
});

app.get("/api/conversations/:id/messages", auth, async (req, res) => {
  const check = await pool.query(
    `SELECT c.user_id, pr.user_id AS prov_uid FROM conversations c
     JOIN providers pr ON pr.id=c.provider_id WHERE c.id=$1`, [req.params.id]
  );
  if (!check.rows.length) return fail(res, "Not found", 404);
  const { user_id, prov_uid } = check.rows[0];
  if (req.user.id !== user_id && req.user.id !== prov_uid) return fail(res, "Forbidden", 403);
  await pool.query(
    "UPDATE messages SET read=TRUE WHERE conversation_id=$1 AND sender_id!=$2",
    [req.params.id, req.user.id]
  );
  const { rows } = await pool.query(
    `SELECT m.*, u.name AS sender_name FROM messages m
     JOIN users u ON u.id=m.sender_id WHERE m.conversation_id=$1 ORDER BY m.created_at ASC`,
    [req.params.id]
  );
  return ok(res, { messages: rows });
});

app.post("/api/conversations/:id/messages", auth, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return fail(res, "Message required");
  const check = await pool.query(
    `SELECT c.user_id, pr.user_id AS prov_uid FROM conversations c
     JOIN providers pr ON pr.id=c.provider_id WHERE c.id=$1`, [req.params.id]
  );
  if (!check.rows.length) return fail(res, "Not found", 404);
  const { user_id, prov_uid } = check.rows[0];
  if (req.user.id !== user_id && req.user.id !== prov_uid) return fail(res, "Forbidden", 403);
  const { rows } = await pool.query(
    "INSERT INTO messages (conversation_id,sender_id,body) VALUES ($1,$2,$3) RETURNING *",
    [req.params.id, req.user.id, body.trim()]
  );
  return ok(res, { message: rows[0] }, 201);
});

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/reviews", auth, role("USER"), async (req, res) => {
  const { booking_id, rating, comment } = req.body;
  if (!booking_id || !rating) return fail(res, "booking_id and rating required");
  if (rating < 1 || rating > 5) return fail(res, "Rating 1–5");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const bk = await client.query(
      "SELECT * FROM bookings WHERE id=$1 AND user_id=$2 AND status='completed'",
      [booking_id, req.user.id]
    );
    if (!bk.rows.length) return fail(res, "No completed booking found", 404);
    const { rows } = await client.query(
      "INSERT INTO reviews (booking_id,user_id,provider_id,rating,comment) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [booking_id, req.user.id, bk.rows[0].provider_id, rating, comment]
    );
    await client.query(`
      UPDATE providers SET
        rating       = (SELECT ROUND(AVG(rating)::numeric,2) FROM reviews WHERE provider_id=$1),
        review_count = (SELECT COUNT(*) FROM reviews WHERE provider_id=$1)
      WHERE id=$1
    `, [bk.rows[0].provider_id]);
    await client.query("COMMIT");
    return ok(res, { review: rows[0] }, 201);
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") return fail(res, "Already reviewed", 409);
    return fail(res, "Failed", 500);
  } finally { client.release(); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/api/admin/stats", auth, role("ADMIN"), async (req, res) => {
  const [u, p, b, r] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM users WHERE role='USER'"),
    pool.query("SELECT COUNT(*) FROM providers"),
    pool.query("SELECT COUNT(*) FROM bookings"),
    pool.query("SELECT COALESCE(SUM(price),0) FROM bookings WHERE status='completed'"),
  ]);
  return ok(res, { stats: {
    users: parseInt(u.rows[0].count),
    providers: parseInt(p.rows[0].count),
    bookings: parseInt(b.rows[0].count),
    revenue: parseFloat(r.rows[0].coalesce),
  }});
});

app.get("/api/admin/users", auth, role("ADMIN"), async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id,name,email,role,phone,is_active,created_at FROM users ORDER BY created_at DESC LIMIT 200"
  );
  return ok(res, { users: rows });
});

app.patch("/api/admin/users/:id/role", auth, role("ADMIN"), async (req, res) => {
  const { role: newRole } = req.body;
  if (!["USER","PROVIDER","ADMIN"].includes(newRole)) return fail(res, "Invalid role");
  const { rows } = await pool.query("UPDATE users SET role=$1 WHERE id=$2 RETURNING id,name,email,role", [newRole, req.params.id]);
  return ok(res, { user: rows[0] });
});

app.patch("/api/admin/users/:id/deactivate", auth, role("ADMIN"), async (req, res) => {
  await pool.query("UPDATE users SET is_active=FALSE WHERE id=$1", [req.params.id]);
  return ok(res, { message: "User deactivated" });
});

app.patch("/api/admin/providers/:id/verify", auth, role("ADMIN"), async (req, res) => {
  const { rows } = await pool.query("UPDATE providers SET verified=TRUE WHERE id=$1 RETURNING *", [req.params.id]);
  if (!rows.length) return fail(res, "Not found", 404);
  return ok(res, { provider: rows[0] });
});

// ─── 404 & ERROR ─────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: "Internal error" }); });

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✓ PostgreSQL connected  →  xervlink");
    await initDB();
    await seedAdmin();
    app.listen(PORT, () => {
      console.log(`\n🚀  Xervlink API  →  http://localhost:${PORT}`);
      console.log(`    Health check  →  http://localhost:${PORT}/health\n`);
    });
  } catch (err) {
    console.error("✗ Startup failed:", err.message);
    process.exit(1);
  }
})();