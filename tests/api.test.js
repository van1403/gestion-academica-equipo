import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/index.js";

let directory;
let server;
let baseUrl;
let cookie;

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}/api${path}`, {
    ...options,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json();
  const session = response.headers.get("set-cookie")?.split(";")[0];
  if (session) cookie = session;
  return { response, data };
}

before(async () => {
  directory = mkdtempSync(join(tmpdir(), "aula-test-"));
  server = createApp({ storeFile: join(directory, "db.json") }).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  rmSync(directory, { recursive: true, force: true });
});

test("protects academic data and initializes a secure administrator account", async () => {
  const privateData = await api("/students");
  assert.equal(privateData.response.status, 401);

  const status = await api("/auth/status");
  assert.equal(status.data.setupRequired, true);

  const setup = await api("/auth/setup", {
    method: "POST",
    body: { name: "Admin Aula", email: "admin@colegio.edu", password: "UnaClaveSegura2026!" },
  });
  assert.equal(setup.response.status, 201);
  assert.match(setup.response.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(setup.response.headers.get("set-cookie"), /SameSite=Strict/i);
  assert.match(setup.response.headers.get("x-content-type-options"), /nosniff/i);
  const persisted = readFileSync(join(directory, "db.json"), "utf8");
  assert.doesNotMatch(persisted, /UnaClaveSegura2026!/);
  assert.match(persisted, /passwordHash/);

  const repeatedSetup = await api("/auth/setup", {
    method: "POST",
    body: { name: "Otro admin", email: "otro@colegio.edu", password: "UnaClaveSegura2026!" },
  });
  assert.equal(repeatedSetup.response.status, 409);
});

test("validates students and supports enrollment lifecycle with capacity limits", async () => {
  const badStudent = await api("/students", {
    method: "POST",
    body: { name: "Estudiante", email: "no-es-correo", code: "EST-1", program: "Sistemas", semester: 1 },
  });
  assert.equal(badStudent.response.status, 400);

  const createdStudent = await api("/students", {
    method: "POST",
    body: { name: "Ana Pérez", email: "ana@colegio.edu", code: "EST-1", program: "Ingeniería", semester: 2 },
  });
  assert.equal(createdStudent.response.status, 201);

  const duplicateCode = await api("/students", {
    method: "POST",
    body: { name: "Otro", email: "otro@colegio.edu", code: "est-1", program: "Artes", semester: 1 },
  });
  assert.equal(duplicateCode.response.status, 409);

  const createdCourse = await api("/courses", {
    method: "POST",
    body: { code: "MAT-1", name: "Matemáticas", instructor: "Luis Díaz", schedule: "Lunes 8:00", credits: 3, capacity: 1 },
  });
  assert.equal(createdCourse.response.status, 201);

  const secondStudent = await api("/students", {
    method: "POST",
    body: { name: "Camilo Ruiz", email: "camilo@colegio.edu", code: "EST-2", program: "Ingeniería", semester: 1 },
  });
  assert.equal(secondStudent.response.status, 201);

  const enrollment = await api("/enrollments", {
    method: "POST",
    body: { studentId: createdStudent.data.id, courseId: createdCourse.data.id },
  });
  assert.equal(enrollment.response.status, 201);

  const duplicateEnrollment = await api("/enrollments", {
    method: "POST",
    body: { studentId: createdStudent.data.id, courseId: createdCourse.data.id },
  });
  assert.equal(duplicateEnrollment.response.status, 409);

  const fullCourse = await api("/enrollments", {
    method: "POST",
    body: { studentId: secondStudent.data.id, courseId: createdCourse.data.id },
  });
  assert.equal(fullCourse.response.status, 409);

  const invalidCapacity = await api(`/courses/${createdCourse.data.id}`, {
    method: "PATCH",
    body: { capacity: 0 },
  });
  assert.equal(invalidCapacity.response.status, 400);

  const enrollmentList = await api("/enrollments");
  assert.equal(enrollmentList.data.length, 1);
  assert.equal(enrollmentList.data[0].student.name, "Ana Pérez");

  const deletedStudent = await api(`/students/${createdStudent.data.id}`, { method: "DELETE" });
  assert.equal(deletedStudent.response.status, 204);
  assert.deepEqual((await api("/enrollments")).data, []);
});

test("logs in with the password hash and rejects incorrect credentials", async () => {
  await api("/auth/logout", { method: "POST" });
  cookie = "";
  const incorrect = await api("/auth/login", {
    method: "POST",
    body: { email: "admin@colegio.edu", password: "incorrecta" },
  });
  assert.equal(incorrect.response.status, 401);

  const correct = await api("/auth/login", {
    method: "POST",
    body: { email: "admin@colegio.edu", password: "UnaClaveSegura2026!" },
  });
  assert.equal(correct.response.status, 200);
  assert.equal(correct.data.user.email, "admin@colegio.edu");
  const supersededCookie = cookie;

  const rotated = await api("/auth/login", {
    method: "POST",
    body: { email: "admin@colegio.edu", password: "UnaClaveSegura2026!" },
  });
  assert.equal(rotated.response.status, 200);
  const oldSession = await api("/students", { headers: { Cookie: supersededCookie } });
  assert.equal(oldSession.response.status, 401);

  for (let index = 0; index < 5; index += 1) {
    const failed = await api("/auth/login", {
      method: "POST",
      body: { email: "admin@colegio.edu", password: "incorrecta" },
    });
    assert.equal(failed.response.status, 401);
  }
  const throttled = await api("/auth/login", {
    method: "POST",
    body: { email: "admin@colegio.edu", password: "incorrecta" },
  });
  assert.equal(throttled.response.status, 429);
});
