import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API IS WORKING!" });
});

app.post("/api/test-insert", async (req, res) => {
  const { email, password_hash } = req.body;

  const { data, error } = await supabase
    .from("users")
    .insert([{ email, password_hash }])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ inserted: data });
});

app.post("/api/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1) Validálás
    if (!email || !password) {
      return res.status(400).json({ error: "Email és jelszó kötelező." });
    }

    // 2) Megnézzük, van-e már ilyen email
    const { data: existing, error: existingError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      return res.status(500).json({ error: existingError.message });
    }

    if (existing) {
      return res
        .status(409)
        .json({ error: "Ez az email már regisztrálva van." });
    }

    // 3) Jelszó hash (soha nem mentünk sima jelszót!)
    const password_hash = await bcrypt.hash(password, 10);

    // 4) Insert DB-be
    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert([{ email, password_hash }])
      .select("id, email, created_at")
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    // 5) Visszaadjuk az új user adatait
    return res.status(201).json({ user: inserted });
  } catch (err) {
    return res.status(500).json({ error: "Ismeretlen hiba történt." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email és jelszó kötelező." });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (userError) {
      return res.status(500).json({ error: userError.message });
    }

    if (!user) {
      return res.status(401).json({ error: "Hibás email vagy jelszó." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: "Hibás email vagy jelszó." });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    return res.status(500).json({ error: "Ismeretlen hiba történt." });
  }
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header." });
  }

  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
