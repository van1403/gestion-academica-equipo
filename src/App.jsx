import { useCallback, useEffect, useMemo, useState } from "react";

const blankStudent = { name: "", email: "", code: "", program: "", semester: 1, status: "Activo" };
const blankCourse = { code: "", name: "", instructor: "", schedule: "", credits: 3, capacity: 30 };

async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}

function Icon({ name }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5h6a1.5 1.5 0 0 0-1.5-1.5h-3A1.5 1.5 0 0 0 9 4.5ZM9 11h6M9 15h6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    edit: <><path d="m16 4 4 4L8 20H4v-4L16 4Z" /><path d="m14 6 4 4" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Brand() {
  return <div className="brand"><span className="brand-mark">A</span><span>Aula<span className="brand-dot">.</span></span></div>;
}

function Login({ setupRequired, onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(setupRequired ? "/auth/setup" : "/auth/login", { method: "POST", body: form });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="auth-topbar">
          <Brand />
          <span className="status-chip">{setupRequired ? "Configuración" : "En línea"}</span>
        </div>
        <p className="eyebrow">GESTIÓN ACADÉMICA</p>
        <h1>{setupRequired ? "Comienza con tu institución" : "Qué gusto verte de nuevo"}</h1>
        <p className="auth-subtitle">{setupRequired ? "Crea la cuenta de administrador para configurar tu espacio." : "Ingresa a tu espacio de gestión académica."}</p>
        <form onSubmit={submit} className="form-stack">
          {setupRequired && <label>Nombre completo<input autoComplete="name" required maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Laura Martínez" /></label>}
          <label>Correo electrónico<input type="email" autoComplete="username" required maxLength="254" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nombre@institucion.edu" /></label>
          <label>Contraseña<input type="password" autoComplete={setupRequired ? "new-password" : "current-password"} required minLength={setupRequired ? 12 : 1} maxLength="128" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={setupRequired ? "Al menos 12 caracteres" : "Tu contraseña"} /></label>
          <div className="login-meta">
            <label className="checkbox-row"><input type="checkbox" readOnly checked /> Mantener sesión activa</label>
            <a href="#" className="text-link">¿Olvidaste tu contraseña?</a>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary full" disabled={busy}>{busy ? "Procesando…" : setupRequired ? "Crear cuenta segura" : "Iniciar sesión"}</button>
        </form>
        {setupRequired && <p className="security-note">Tu contraseña se protege con hash criptográfico y nunca se almacena en texto plano.</p>}
      </section>
      <aside className="auth-aside">
        <div className="aside-orb orb-one" />
        <div className="aside-orb orb-two" />
        <div className="auth-hero-panel">
          <span className="aside-label">TODO EN UN SOLO LUGAR</span>
          <h2>Una mejor forma de acompañar el aprendizaje.</h2>
          <p>Organiza tu comunidad académica con herramientas simples, claras y seguras.</p>
          <div className="auth-metrics">
            <div>
              <strong>1.200+</strong>
              <span>estudiantes</span>
            </div>
            <div>
              <strong>94%</strong>
              <span>satisfacción</span>
            </div>
          </div>
        </div>
        <div className="aside-footer">PLATAFORMA DE GESTIÓN ACADÉMICA <span>© 2026</span></div>
      </aside>
    </main>
  );
}

function Modal({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button></div>{children}</section></div>;
}

function StudentForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    try { await onSave(form); } catch (err) { setError(err.message); }
  }
  return <form className="form-stack modal-form" onSubmit={submit}>
    <div className="form-grid">
      <label>Nombre completo<input required maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre del estudiante" /></label>
      <label>Código estudiantil<input required maxLength="30" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EST-2026-001" /></label>
      <label>Correo electrónico<input type="email" required maxLength="254" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="estudiante@correo.edu" /></label>
      <label>Programa académico<input required maxLength="120" value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} placeholder="Ingeniería de sistemas" /></label>
      <label>Semestre<select value={form.semester} onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}° semestre</option>)}</select></label>
      <label>Estado<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Activo</option><option>Inactivo</option></select></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancelar</button><button className="button primary">{initial.id ? "Guardar cambios" : "Registrar estudiante"}</button></div>
  </form>;
}

function CourseForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    try { await onSave(form); } catch (err) { setError(err.message); }
  }
  return <form className="form-stack modal-form" onSubmit={submit}>
    <div className="form-grid">
      <label>Código del curso<input required maxLength="30" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MAT-101" /></label>
      <label>Nombre del curso<input required maxLength="120" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Cálculo diferencial" /></label>
      <label>Docente<input required maxLength="120" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} placeholder="Nombre del docente" /></label>
      <label>Horario<input required maxLength="120" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="Lun y mié · 08:00–10:00" /></label>
      <label>Créditos<input type="number" min="1" max="10" required value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} /></label>
      <label>Cupo máximo<input type="number" min="1" max="500" required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></label>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="modal-actions"><button className="button secondary" type="button" onClick={onCancel}>Cancelar</button><button className="button primary">{initial.id ? "Guardar cambios" : "Crear curso"}</button></div>
  </form>;
}

function App() {
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("overview");
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [enrollForm, setEnrollForm] = useState({ studentId: "", courseId: "" });

  const loadData = useCallback(async () => {
    const [studentData, courseData, enrollmentData] = await Promise.all([
      request("/students"), request("/courses"), request("/enrollments"),
    ]);
    setStudents(studentData);
    setCourses(courseData);
    setEnrollments(enrollmentData);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const status = await request("/auth/status");
      setAuth(status);
      setUser(status.user);
      if (status.user) await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const counts = useMemo(() => ({
    active: students.filter((student) => student.status === "Activo").length,
    enrolled: enrollments.length,
    seats: courses.reduce((total, course) => total + course.capacity, 0),
  }), [students, courses, enrollments]);

  async function saveRecord(type, value) {
    const path = type === "student" ? "/students" : "/courses";
    const existing = value.id;
    await request(existing ? `${path}/${existing}` : path, { method: existing ? "PATCH" : "POST", body: value });
    await loadData();
    setModal(null);
    setNotice(existing ? "Cambios guardados correctamente" : type === "student" ? "Estudiante registrado correctamente" : "Curso creado correctamente");
  }

  async function removeRecord(type, record) {
    const isStudent = type === "student";
    const label = isStudent ? "estudiante" : "curso";
    if (!window.confirm(`¿Eliminar ${label} "${isStudent ? record.name : record.name}"? También se eliminarán sus matrículas asociadas.`)) return;
    try {
      await request(`/${isStudent ? "students" : "courses"}/${record.id}`, { method: "DELETE" });
      await loadData();
      setNotice(`${isStudent ? "Estudiante" : "Curso"} eliminado`);
    } catch (err) { setError(err.message); }
  }

  async function createEnrollment(event) {
    event.preventDefault();
    try {
      await request("/enrollments", { method: "POST", body: enrollForm });
      await loadData();
      setEnrollForm({ studentId: "", courseId: "" });
      setModal(null);
      setNotice("Matrícula registrada correctamente");
    } catch (err) { setError(err.message); }
  }

  async function removeEnrollment(enrollment) {
    if (!window.confirm("¿Retirar esta matrícula?")) return;
    try {
      await request(`/enrollments/${enrollment.id}`, { method: "DELETE" });
      await loadData();
      setNotice("Matrícula retirada");
    } catch (err) { setError(err.message); }
  }

  async function logout() {
    try {
      await request("/auth/logout", { method: "POST" });
      setUser(null);
      setAuth({ setupRequired: false, user: null });
      setPage("overview");
      setStudents([]);
      setCourses([]);
      setEnrollments([]);
    } catch (err) { setError(err.message); }
  }

  if (loading) return <div className="loading-screen"><Brand /><span className="loader" /></div>;
  if (!user) return <Login setupRequired={auth?.setupRequired ?? false} onSuccess={checkAuth} />;

  const navigation = [
    { id: "overview", label: "Resumen", icon: "grid" },
    { id: "students", label: "Estudiantes", icon: "people", count: students.length },
    { id: "courses", label: "Cursos", icon: "book", count: courses.length },
    { id: "enrollments", label: "Matrículas", icon: "clipboard", count: enrollments.length },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredStudents = students.filter((student) => `${student.name} ${student.code} ${student.email} ${student.program}`.toLowerCase().includes(normalizedQuery));
  const filteredCourses = courses.filter((course) => `${course.name} ${course.code} ${course.instructor}`.toLowerCase().includes(normalizedQuery));

  return <div className="app-shell">
    <aside className="sidebar">
      <Brand />
      <div className="workspace-label">INSTITUCIÓN EDUCATIVA</div>
      <div className="workspace"><span className="workspace-avatar">IE</span><span><strong>Instituto Educativo</strong><small>Panel administrativo</small></span><Icon name="chevron" /></div>
      <div className="nav-label">MENÚ PRINCIPAL</div>
      <nav className="nav-list" aria-label="Navegación principal">
        {navigation.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? "selected" : ""}`} onClick={() => { setPage(item.id); setQuery(""); setError(""); }}><Icon name={item.icon} /><span>{item.label}</span>{item.count !== undefined && <small>{item.count}</small>}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-note"><span className="note-icon">✦</span><strong>Un ciclo a la vez</strong><p>El futuro empieza con una buena educación.</p></div>
      <div className="profile"><span className="profile-avatar">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="profile-info"><strong>{user.name}</strong><small>Administrador</small></span><button className="icon-button logout-button" aria-label="Cerrar sesión" onClick={logout}><Icon name="logout" /></button></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs">Gestión académica <Icon name="chevron" /><strong>{navigation.find((item) => item.id === page)?.label}</strong></div>
        <div className="topbar-actions"><label className="search-box"><Icon name="search" /><input aria-label="Buscar" placeholder="Buscar..." value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>⌘ K</kbd></label><span className="term-pill"><span /> Periodo 2026-II</span></div>
      </header>
      <div className="content">
        {error && <div className="alert-error" role="alert">{error}<button aria-label="Cerrar aviso" onClick={() => setError("")}><Icon name="close" /></button></div>}
        {page === "overview" && <Overview name={user.name} counts={counts} students={students} courses={courses} enrollments={enrollments} onNavigate={setPage} onCreateStudent={() => setModal({ type: "student", record: blankStudent })} onCreateCourse={() => setModal({ type: "course", record: blankCourse })} />}
        {page === "students" && <StudentsPage students={filteredStudents} total={students.length} query={normalizedQuery} onAdd={() => setModal({ type: "student", record: blankStudent })} onEdit={(student) => setModal({ type: "student", record: student })} onDelete={(student) => removeRecord("student", student)} />}
        {page === "courses" && <CoursesPage courses={filteredCourses} enrollments={enrollments} total={courses.length} query={normalizedQuery} onAdd={() => setModal({ type: "course", record: blankCourse })} onEdit={(course) => setModal({ type: "course", record: course })} onDelete={(course) => removeRecord("course", course)} />}
        {page === "enrollments" && <EnrollmentsPage enrollments={enrollments} query={normalizedQuery} onAdd={() => { setEnrollForm({ studentId: "", courseId: "" }); setModal({ type: "enrollment" }); }} onDelete={removeEnrollment} />}
      </div>
      <footer className="page-footer">Aula · Gestión académica <span>Construido para acompañar el aprendizaje.</span></footer>
    </main>

    {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    {modal?.type === "student" && <Modal title={modal.record.id ? "Editar estudiante" : "Registrar estudiante"} onClose={() => setModal(null)}><StudentForm initial={{ ...blankStudent, ...modal.record }} onSave={(record) => saveRecord("student", record)} onCancel={() => setModal(null)} /></Modal>}
    {modal?.type === "course" && <Modal title={modal.record.id ? "Editar curso" : "Crear curso"} onClose={() => setModal(null)}><CourseForm initial={{ ...blankCourse, ...modal.record }} onSave={(record) => saveRecord("course", record)} onCancel={() => setModal(null)} /></Modal>}
    {modal?.type === "enrollment" && <Modal title="Nueva matrícula" onClose={() => setModal(null)}><form className="form-stack modal-form" onSubmit={createEnrollment}><label>Estudiante<select required value={enrollForm.studentId} onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}><option value="">Selecciona un estudiante</option>{students.filter((student) => student.status === "Activo").map((student) => <option key={student.id} value={student.id}>{student.name} · {student.code}</option>)}</select></label><label>Curso<select required value={enrollForm.courseId} onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}><option value="">Selecciona un curso</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name} · {course.code}</option>)}</select></label>{error && <p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button className="button secondary" type="button" onClick={() => setModal(null)}>Cancelar</button><button className="button primary" disabled={!students.length || !courses.length}>Matricular estudiante</button></div>{(!students.length || !courses.length) && <p className="security-note">Primero registra estudiantes activos y cursos para crear matrículas.</p>}</form></Modal>}
  </div>;
}

function Overview({ name, counts, students, courses, enrollments, onNavigate, onCreateStudent, onCreateCourse }) {
  const recent = students.slice(-5).reverse();
  const firstName = name.trim().split(/\s+/)[0];
  return <>
    <div className="welcome-row"><div><p className="eyebrow">GESTIÓN ACADÉMICA · PERIODO 2026-II</p><h1>Un nuevo día para aprender, {firstName} <span>✦</span></h1><p className="muted">Aquí tienes el resumen de tu institución.</p></div><button className="button primary" onClick={onCreateStudent}><Icon name="plus" /> Nuevo estudiante</button></div>
    <div className="stats-grid">
      <StatCard label="Estudiantes activos" value={counts.active} caption={`${students.length} registrados en total`} icon="people" tone="blue" trend="Comunidad estudiantil" />
      <StatCard label="Cursos disponibles" value={courses.length} caption={`${counts.seats} cupos en total`} icon="book" tone="purple" trend="Oferta académica" />
      <StatCard label="Matrículas" value={counts.enrolled} caption={courses.length ? `${Math.max(counts.seats - counts.enrolled, 0)} cupos disponibles` : "Crea un curso para comenzar"} icon="clipboard" tone="orange" trend="Periodo 2026-II" />
    </div>
    <div className="dashboard-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">COMUNIDAD</p><h2>Estudiantes recientes</h2></div><button className="text-link" onClick={() => onNavigate("students")}>Ver todos <Icon name="chevron" /></button></div>
        {recent.length ? <div className="recent-list">{recent.map((student, index) => <div className="recent-person" key={student.id}><span className={`person-avatar avatar-${index % 5}`}>{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div className="person-name"><strong>{student.name}</strong><small>{student.program}</small></div><span className="person-code">{student.code}</span><span className={`status-badge ${student.status === "Activo" ? "active" : "inactive"}`}><i />{student.status}</span></div>)}</div> : <EmptyState title="Tu comunidad empieza aquí" text="Registra estudiantes para verlos aparecer en este espacio." action="Registrar estudiante" onClick={onCreateStudent} />}
      </section>
      <section className="panel quick-panel"><div className="panel-heading"><div><p className="eyebrow">ACCESOS RÁPIDOS</p><h2>¿Qué quieres hacer?</h2></div></div><button className="quick-action" onClick={onCreateStudent}><span className="quick-icon quick-blue"><Icon name="people" /></span><span><strong>Registrar estudiante</strong><small>Añade un miembro a tu comunidad</small></span><Icon name="chevron" /></button><button className="quick-action" onClick={onCreateCourse}><span className="quick-icon quick-purple"><Icon name="book" /></span><span><strong>Crear un curso</strong><small>Organiza la oferta académica</small></span><Icon name="chevron" /></button><button className="quick-action" onClick={() => onNavigate("enrollments")}><span className="quick-icon quick-orange"><Icon name="clipboard" /></span><span><strong>Gestionar matrículas</strong><small>{enrollments.length} estudiantes inscritos</small></span><Icon name="chevron" /></button>
      </section>
    </div>
    <section className="bottom-callout"><div className="callout-art"><div className="art-sun" /><div className="art-book">✦</div></div><div><p className="eyebrow">CADA PASO CUENTA</p><h2>Una comunidad que crece, aprende y transforma.</h2><p>Explora los cursos disponibles y acompaña el progreso de cada estudiante.</p></div><button className="button secondary" onClick={() => onNavigate("courses")}>Explorar cursos <Icon name="chevron" /></button></section>
  </>;
}

function StatCard({ label, value, caption, icon, tone, trend }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon name={icon} /></div><span className="stat-trend">{trend}</span><p>{label}</p><div className="stat-value">{value}</div><small>{caption}</small></article>;
}

function PageHeader({ eyebrow, title, description, actionLabel, onAction }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="muted">{description}</p></div><button className="button primary" onClick={onAction}><Icon name="plus" /> {actionLabel}</button></div>;
}

function StudentsPage({ students, total, query, onAdd, onEdit, onDelete }) {
  return <><PageHeader eyebrow="COMUNIDAD ACADÉMICA" title="Estudiantes" description="Administra los registros y la información de tu comunidad." actionLabel="Nuevo estudiante" onAction={onAdd} /><div className="list-summary"><strong>{query ? `${students.length} resultados` : `${total} estudiantes`}</strong><span>Información actualizada en tiempo real</span></div><section className="panel table-panel">{students.length ? <div className="table-wrap"><table><thead><tr><th>ESTUDIANTE</th><th>CÓDIGO</th><th>PROGRAMA</th><th>SEMESTRE</th><th>ESTADO</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{students.map((student, index) => <tr key={student.id}><td><div className="table-person"><span className={`person-avatar avatar-${index % 5}`}>{student.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span><strong>{student.name}</strong><small>{student.email}</small></span></div></td><td><span className="code-chip">{student.code}</span></td><td>{student.program}</td><td>{student.semester}°</td><td><span className={`status-badge ${student.status === "Activo" ? "active" : "inactive"}`}><i />{student.status}</span></td><td><div className="row-actions"><button className="icon-button" title="Editar" aria-label={`Editar ${student.name}`} onClick={() => onEdit(student)}><Icon name="edit" /></button><button className="icon-button danger-hover" title="Eliminar" aria-label={`Eliminar ${student.name}`} onClick={() => onDelete(student)}><Icon name="trash" /></button></div></td></tr>)}</tbody></table></div> : <EmptyState title={query ? "No encontramos coincidencias" : "Todavía no hay estudiantes"} text={query ? "Prueba con otro nombre, código o programa." : "Registra a tu primer estudiante para comenzar."} action={query ? undefined : "Registrar estudiante"} onClick={onAdd} />}</section></>;
}

function CoursesPage({ courses, enrollments, total, query, onAdd, onEdit, onDelete }) {
  const colors = ["course-blue", "course-green", "course-peach", "course-lilac"];
  return <><PageHeader eyebrow="OFERTA ACADÉMICA" title="Cursos" description="Organiza tus cursos, docentes y cupos disponibles." actionLabel="Nuevo curso" onAction={onAdd} /><div className="list-summary"><strong>{query ? `${courses.length} resultados` : `${total} cursos`}</strong><span>Periodo académico 2026-II</span></div>{courses.length ? <div className="course-grid">{courses.map((course, index) => { const enrolled = enrollments.filter((item) => item.courseId === course.id).length; return <article className={`course-card ${colors[index % colors.length]}`} key={course.id}><div className="course-top"><span className="course-code">{course.code}</span><div className="row-actions"><button className="icon-button" aria-label={`Editar ${course.name}`} onClick={() => onEdit(course)}><Icon name="edit" /></button><button className="icon-button danger-hover" aria-label={`Eliminar ${course.name}`} onClick={() => onDelete(course)}><Icon name="trash" /></button></div></div><h2>{course.name}</h2><p className="course-instructor">Con <strong>{course.instructor}</strong></p><div className="course-details"><span><Icon name="clipboard" /> {course.schedule}</span><span><Icon name="book" /> {course.credits} créditos</span></div><div className="capacity-row"><span>{enrolled} de {course.capacity} estudiantes</span><span>{course.capacity ? Math.round(enrolled / course.capacity * 100) : 0}%</span></div><progress className="capacity-track" value={enrolled} max={course.capacity} aria-label={`Ocupación de ${course.name}`} /></article>; })}</div> : <section className="panel"><EmptyState title={query ? "No encontramos coincidencias" : "Tu oferta académica empieza aquí"} text={query ? "Prueba con otro nombre, código o docente." : "Crea el primer curso de tu institución."} action={query ? undefined : "Crear curso"} onClick={onAdd} /></section>}</>;
}

function EnrollmentsPage({ enrollments, query, onAdd, onDelete }) {
  const list = enrollments.filter(({ student, course }) => `${student?.name ?? ""} ${student?.code ?? ""} ${course?.name ?? ""} ${course?.code ?? ""}`.toLowerCase().includes(query));
  return <><PageHeader eyebrow="REGISTRO ACADÉMICO" title="Matrículas" description="Consulta y administra la inscripción de estudiantes en cursos." actionLabel="Nueva matrícula" onAction={onAdd} /><div className="list-summary"><strong>{query ? `${list.length} resultados` : `${enrollments.length} matrículas`}</strong><span>Periodo académico 2026-II</span></div><section className="panel table-panel">{list.length ? <div className="table-wrap"><table><thead><tr><th>ESTUDIANTE</th><th>CURSO</th><th>DOCENTE</th><th>FECHA DE REGISTRO</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{list.map((item, index) => <tr key={item.id}><td><div className="table-person"><span className={`person-avatar avatar-${index % 5}`}>{item.student?.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span><strong>{item.student?.name}</strong><small>{item.student?.code}</small></span></div></td><td><div className="table-course"><strong>{item.course?.name}</strong><small>{item.course?.code}</small></div></td><td>{item.course?.instructor}</td><td>{new Date(item.createdAt).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" })}</td><td><button className="icon-button danger-hover" aria-label={`Retirar a ${item.student?.name} del curso`} onClick={() => onDelete(item)}><Icon name="trash" /></button></td></tr>)}</tbody></table></div> : <EmptyState title={query ? "No encontramos coincidencias" : "Aún no hay matrículas"} text={query ? "Prueba con otro estudiante o curso." : "Inscribe estudiantes a los cursos disponibles."} action={query ? undefined : "Crear matrícula"} onClick={onAdd} />}</section></>;
}

function EmptyState({ title, text, action, onClick }) {
  return <div className="empty-state"><span className="empty-illustration"><Icon name="book" /></span><h3>{title}</h3><p>{text}</p>{action && <button className="button secondary" onClick={onClick}><Icon name="plus" />{action}</button>}</div>;
}

export default App;
