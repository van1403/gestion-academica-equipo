import express from "express";
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scrypt = promisify(scryptCallback);
const here = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

function defaultState() {
  return { user: null, students: [], courses: [], enrollments: [] };
}

function validEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function text(value, field, maxLength = 120) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw Object.assign(new Error(`${field} es obligatorio y debe tener máximo ${maxLength} caracteres.`), { status: 400 });
  }
  return value.trim();
}

function numeric(value, field, minimum, maximum) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw Object.assign(new Error(`${field} debe ser un número entre ${minimum} y ${maximum}.`), { status: 400 });
  }
  return number;
}

export function createApp({ storeFile = process.env.DATA_FILE || join(here, "..", ".data", "academia.json") } = {}) {
  const app = express();
  const sessions = new Map();
  const loginAttempts = new Map();
  let setupInProgress = false;

  function load() {
    if (!existsSync(storeFile)) return defaultState();
    const state = JSON.parse(readFileSync(storeFile, "utf8"));
    if (!state || !Array.isArray(state.students) || !Array.isArray(state.courses) || !Array.isArray(state.enrollments)) {
      throw new Error("El archivo de datos académicos no tiene un formato válido.");
    }
    return state;
  }

  function save(state) {
    mkdirSync(dirname(storeFile), { recursive: true });
    const temporaryFile = `${storeFile}.${randomUUID()}.tmp`;
    writeFileSync(temporaryFile, JSON.stringify(state, null, 2), { mode: 0o600 });
    renameSync(temporaryFile, storeFile);
  }

  function readCookie(req, name) {
    const cookie = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
  }

  function requireAuth(req, res, next) {
    const token = readCookie(req, "aula_session");
    const session = token && sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      return res.status(401).json({ error: "Inicia sesión para continuar." });
    }
    req.userId = session.userId;
    next();
  }

  function sendSession(req, res, userId) {
    const previousToken = readCookie(req, "aula_session");
    if (previousToken) sessions.delete(previousToken);
    const token = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
    sessions.set(token, { userId, expiresAt });
    res.cookie("aula_session", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      path: "/",
      expires: new Date(expiresAt),
    });
  }

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    next();
  });
  app.use(express.json({ limit: "32kb", type: "application/json" }));

  app.get("/api/auth/status", (req, res) => {
    const state = load();
    const token = readCookie(req, "aula_session");
    const session = token && sessions.get(token);
    if (session && session.expiresAt <= Date.now()) sessions.delete(token);
    res.json({
      setupRequired: !state.user,
      user: session && session.userId === state.user?.id && session.expiresAt > Date.now()
        ? { id: state.user.id, name: state.user.name, email: state.user.email }
        : null,
    });
  });

  app.post("/api/auth/setup", async (req, res, next) => {
    try {
      const state = load();
      if (state.user) return res.status(409).json({ error: "La cuenta inicial ya fue creada." });
      if (setupInProgress) return res.status(409).json({ error: "La cuenta inicial ya se está configurando." });
      const name = text(req.body?.name, "Nombre");
      const email = text(req.body?.email, "Correo", 254).toLowerCase();
      const password = req.body?.password;
      if (!validEmail(email)) return res.status(400).json({ error: "Ingresa un correo electrónico válido." });
      if (typeof password !== "string" || password.length < 12 || password.length > 128) {
        return res.status(400).json({ error: "La contraseña debe tener entre 12 y 128 caracteres." });
      }
      setupInProgress = true;
      try {
        const salt = randomBytes(16).toString("hex");
        const passwordHash = (await scrypt(password, salt, 64)).toString("hex");
        state.user = { id: randomUUID(), name, email, salt, passwordHash };
        save(state);
        sendSession(req, res, state.user.id);
        res.status(201).json({ user: { id: state.user.id, name, email } });
      } finally {
        setupInProgress = false;
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", async (req, res, next) => {
    try {
      const ip = req.ip;
      const attempt = loginAttempts.get(ip);
      const withinWindow = attempt && Date.now() - attempt.startedAt < 15 * 60 * 1000;
      if (withinWindow && attempt.count >= 5) {
        return res.status(429).json({ error: "Demasiados intentos. Espera 15 minutos antes de intentar de nuevo." });
      }
      const failedLogin = () => {
        loginAttempts.set(ip, {
          count: withinWindow ? attempt.count + 1 : 1,
          startedAt: withinWindow ? attempt.startedAt : Date.now(),
        });
      };
      const state = load();
      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      if (!state.user || !password || password.length > 128) {
        failedLogin();
        return res.status(401).json({ error: "Correo o contraseña incorrectos." });
      }
      const candidate = await scrypt(password, state.user.salt, 64);
      const stored = Buffer.from(state.user.passwordHash, "hex");
      if (email !== state.user.email || stored.length !== candidate.length || !timingSafeEqual(stored, candidate)) {
        failedLogin();
        return res.status(401).json({ error: "Correo o contraseña incorrectos." });
      }
      loginAttempts.delete(ip);
      sendSession(req, res, state.user.id);
      res.json({ user: { id: state.user.id, name: state.user.name, email: state.user.email } });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const token = readCookie(req, "aula_session");
    if (token) sessions.delete(token);
    res.clearCookie("aula_session", { httpOnly: true, secure: isProduction, sameSite: "strict", path: "/" });
    res.status(204).end();
  });

  app.get("/api/students", requireAuth, (_req, res, next) => {
    try {
      res.json(load().students);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/students", requireAuth, (req, res, next) => {
    try {
      const state = load();
      const student = {
        id: randomUUID(),
        name: text(req.body?.name, "Nombre"),
        email: text(req.body?.email, "Correo", 254).toLowerCase(),
        code: text(req.body?.code, "Código", 30),
        program: text(req.body?.program, "Programa"),
        semester: numeric(req.body?.semester, "Semestre", 1, 12),
        status: req.body?.status === "Inactivo" ? "Inactivo" : "Activo",
        createdAt: new Date().toISOString(),
      };
      if (!validEmail(student.email)) return res.status(400).json({ error: "Ingresa un correo electrónico válido." });
      if (state.students.some((item) => item.code.toLowerCase() === student.code.toLowerCase())) {
        return res.status(409).json({ error: "Ya existe un estudiante con ese código." });
      }
      state.students.push(student);
      save(state);
      res.status(201).json(student);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/students/:id", requireAuth, (req, res, next) => {
    try {
      const state = load();
      const student = state.students.find((item) => item.id === req.params.id);
      if (!student) return res.status(404).json({ error: "No se encontró el estudiante." });
      const updated = { ...student };
      for (const field of ["name", "code", "program"]) {
        if (req.body?.[field] !== undefined) updated[field] = text(req.body[field], field);
      }
      if (req.body?.email !== undefined) {
        updated.email = text(req.body.email, "Correo", 254).toLowerCase();
        if (!validEmail(updated.email)) return res.status(400).json({ error: "Ingresa un correo electrónico válido." });
      }
      if (req.body?.semester !== undefined) updated.semester = numeric(req.body.semester, "Semestre", 1, 12);
      if (req.body?.status !== undefined) {
        if (!["Activo", "Inactivo"].includes(req.body.status)) return res.status(400).json({ error: "Estado de estudiante inválido." });
        updated.status = req.body.status;
      }
      if (state.students.some((item) => item.id !== student.id && item.code.toLowerCase() === updated.code.toLowerCase())) {
        return res.status(409).json({ error: "Ya existe un estudiante con ese código." });
      }
      Object.assign(student, updated);
      save(state);
      res.json(student);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/students/:id", requireAuth, (req, res, next) => {
    try {
      const state = load();
      if (!state.students.some((item) => item.id === req.params.id)) return res.status(404).json({ error: "No se encontró el estudiante." });
      state.students = state.students.filter((item) => item.id !== req.params.id);
      state.enrollments = state.enrollments.filter((item) => item.studentId !== req.params.id);
      save(state);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/courses", requireAuth, (_req, res, next) => {
    try {
      res.json(load().courses);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/courses", requireAuth, (req, res, next) => {
    try {
      const state = load();
      const course = {
        id: randomUUID(),
        code: text(req.body?.code, "Código", 30),
        name: text(req.body?.name, "Nombre"),
        instructor: text(req.body?.instructor, "Docente"),
        schedule: text(req.body?.schedule, "Horario"),
        credits: numeric(req.body?.credits, "Créditos", 1, 10),
        capacity: numeric(req.body?.capacity, "Cupo", 1, 500),
        createdAt: new Date().toISOString(),
      };
      if (state.courses.some((item) => item.code.toLowerCase() === course.code.toLowerCase())) {
        return res.status(409).json({ error: "Ya existe un curso con ese código." });
      }
      state.courses.push(course);
      save(state);
      res.status(201).json(course);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/courses/:id", requireAuth, (req, res, next) => {
    try {
      const state = load();
      const course = state.courses.find((item) => item.id === req.params.id);
      if (!course) return res.status(404).json({ error: "No se encontró el curso." });
      const updated = { ...course };
      for (const field of ["code", "name", "instructor", "schedule"]) {
        if (req.body?.[field] !== undefined) updated[field] = text(req.body[field], field, field === "code" ? 30 : 120);
      }
      if (req.body?.credits !== undefined) updated.credits = numeric(req.body.credits, "Créditos", 1, 10);
      if (req.body?.capacity !== undefined) updated.capacity = numeric(req.body.capacity, "Cupo", 1, 500);
      if (state.courses.some((item) => item.id !== course.id && item.code.toLowerCase() === updated.code.toLowerCase())) {
        return res.status(409).json({ error: "Ya existe un curso con ese código." });
      }
      const enrolled = state.enrollments.filter((item) => item.courseId === course.id).length;
      if (updated.capacity < enrolled) return res.status(409).json({ error: "El cupo no puede ser menor a las matrículas actuales." });
      Object.assign(course, updated);
      save(state);
      res.json(course);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/courses/:id", requireAuth, (req, res, next) => {
    try {
      const state = load();
      if (!state.courses.some((item) => item.id === req.params.id)) return res.status(404).json({ error: "No se encontró el curso." });
      state.courses = state.courses.filter((item) => item.id !== req.params.id);
      state.enrollments = state.enrollments.filter((item) => item.courseId !== req.params.id);
      save(state);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/enrollments", requireAuth, (_req, res, next) => {
    try {
      const state = load();
      res.json(state.enrollments.map((item) => ({
        ...item,
        student: state.students.find((student) => student.id === item.studentId) ?? null,
        course: state.courses.find((course) => course.id === item.courseId) ?? null,
      })));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/enrollments", requireAuth, (req, res, next) => {
    try {
      const state = load();
      const studentId = text(req.body?.studentId, "Estudiante", 60);
      const courseId = text(req.body?.courseId, "Curso", 60);
      if (!state.students.some((item) => item.id === studentId)) return res.status(404).json({ error: "No se encontró el estudiante." });
      const course = state.courses.find((item) => item.id === courseId);
      if (!course) return res.status(404).json({ error: "No se encontró el curso." });
      if (state.enrollments.some((item) => item.studentId === studentId && item.courseId === courseId)) {
        return res.status(409).json({ error: "El estudiante ya está matriculado en este curso." });
      }
      if (state.enrollments.filter((item) => item.courseId === courseId).length >= course.capacity) {
        return res.status(409).json({ error: "El curso alcanzó su cupo máximo." });
      }
      const enrollment = { id: randomUUID(), studentId, courseId, createdAt: new Date().toISOString() };
      state.enrollments.push(enrollment);
      save(state);
      res.status(201).json(enrollment);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/enrollments/:id", requireAuth, (req, res, next) => {
    try {
      const state = load();
      if (!state.enrollments.some((item) => item.id === req.params.id)) return res.status(404).json({ error: "No se encontró la matrícula." });
      state.enrollments = state.enrollments.filter((item) => item.id !== req.params.id);
      save(state);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Ruta no encontrada." }));

  if (isProduction) {
    const dist = join(here, "..", "dist");
    app.use(express.static(dist, { index: false }));
    app.get("*", (_req, res) => res.sendFile(join(dist, "index.html")));
  }

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: "El cuerpo de la solicitud no es JSON válido." });
    const status = error.status ?? 500;
    if (status >= 500) console.error(error);
    res.status(status).json({ error: status >= 500 ? "Ocurrió un error interno. Intenta de nuevo." : error.message });
  });

  return app;
}

const app = createApp();
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`API académica disponible en http://localhost:${port}`));
}
