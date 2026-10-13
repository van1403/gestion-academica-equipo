# Aula · Prototipo de gestión académica

Aplicación web de ejemplo para registrar estudiantes, organizar cursos y administrar matrículas. El frontend está construido con React y Vite; la API y el servidor de producción usan Node.js y Express. Los datos se guardan en un archivo JSON local para que el prototipo funcione sin configurar una base de datos.

## Funcionalidades

- Alta, consulta, edición y eliminación de estudiantes.
- Alta, consulta, edición y eliminación de cursos, docentes, horarios, créditos y cupos.
- Matrículas de estudiantes en cursos, con controles de duplicados y cupo máximo.
- Búsqueda desde el panel y resumen de actividad.
- Creación de la primera cuenta administrativa y acceso protegido.
- Validación en el servidor, sesión en cookie `HttpOnly`/`SameSite=Strict`, contraseñas con `scrypt`, límites básicos de intentos de inicio de sesión y encabezados de seguridad.

> **Alcance:** el almacenamiento JSON y las sesiones en memoria son apropiados para una demostración local, no para producción ni para uso con datos personales reales. Para desplegarlo se requiere una base de datos, sesiones persistentes, HTTPS y una política de respaldos.

## Requisitos y ejecución

- Node.js 22 o superior y npm.

```bash
npm ci
npm run dev
```

Abre la URL que muestra Vite (normalmente `http://localhost:5173`). En la primera visita, crea la cuenta administradora con una contraseña de al menos 12 caracteres. Los siguientes inicios de sesión usarán esa cuenta.

En desarrollo, Vite sirve React y reenvía `/api` a Express en `http://localhost:3000`. La API también puede iniciarse por separado:

```bash
npm run server:dev
```

El servidor guarda los datos en `.data/academia.json`. Para cambiar la ubicación se puede definir `DATA_FILE`. Para ejecutar la versión de producción:

```bash
npm run build
npm start
```

Define `NODE_ENV=production` al servir el directorio compilado; en ese modo el servidor sirve también el frontend y marca la cookie como `Secure`, por lo que se debe usar HTTPS. No se necesita ni se debe subir un archivo `.env` con secretos para ejecutar el prototipo.

## Pruebas y automatización

```bash
npm test
npm run build
```

Los workflows de GitHub Actions en `.github/workflows/` ejecutan instalación reproducible (`npm ci`), compilación, pruebas y auditoría de dependencias de producción (`npm audit --omit=dev`) en cambios dirigidos a `development` y `main`. Cada ejecución queda disponible en la pestaña **Actions**. El workflow requiere el `package-lock.json`, que debe mantenerse versionado.

## Flujo colaborativo y evidencias en GitHub

El repositorio parte del modelo `main` (versión estable) y `development` (integración). Para cada cambio:

1. Actualiza la rama de integración y crea una rama descriptiva; por ejemplo, `git switch development && git pull --ff-only && git switch -c feature/registro-estudiantes`.
2. Implementa un cambio acotado, ejecuta pruebas y compilación, y crea commits con mensajes claros. Confirma `git status` antes de publicar.
3. Publica la rama con `git push -u origin feature/registro-estudiantes` y abre un Pull Request hacia `development`. Vincula la Issue con `Closes #N`.
4. Solicita una revisión de otra persona. Revisa los cambios y la pestaña **Files changed**, deja observaciones accionables y espera a que CI termine antes de aprobar/mezclar.
5. Integra el PR con **Create a merge commit** para conservar explícitamente la unión de ramas. Si el equipo necesita practicar rebase, usa una rama de práctica y documenta la operación en su PR; no reescribas una rama compartida.
6. Una vez verificado `development`, abre un PR hacia `main` para publicar la versión estable.

### Evidencias que puede presentar el equipo

- **Repositorio, commits y ramas:** captura o enlace a **Code → Commits** y al selector/listado de ramas; el historial permite verificar autoría, mensajes y secuencia.
- **Push y pull:** historial local (`git log --oneline --graph --all`) junto con la rama remota en GitHub; anota en la bitácora qué comando sincronizó cada integrante.
- **Merge o rebase:** evidencia del PR integrado y su commit de merge en el historial. Para rebase, conserva el PR de la rama de práctica y el historial posterior.
- **Pull Request y Code Review:** enlace al PR, conversación, aprobación de otro integrante, comprobaciones de CI y estado de merge.
- **Issues:** Issue creada desde las plantillas incluidas y enlazada al PR con `Closes #N`.
- **`.gitignore`:** muestra `.gitignore` y comprueba que `.data/`, `node_modules/` y `.env` no aparecen como archivos rastreados (`git check-ignore -v .data/academia.json .env`).
- **Autenticación segura:** prueba que la API responde `401` sin sesión; muestra el uso de `scrypt` y los atributos `HttpOnly` y `SameSite` de la cookie. No grabes contraseñas ni datos personales en capturas.
- **GitHub Actions:** enlace a una ejecución exitosa de CI para un PR y a otra en la rama `main`.
- **GitHub Projects:** crea un Project del equipo en GitHub y vincula las Issues; usa columnas `Backlog`, `En progreso`, `En revisión` y `Hecho`, y captura la vista del tablero con tareas asignadas y su progreso. Projects se configura en GitHub, no desde el código de la aplicación.

Las capturas deben corresponder a la actividad real del equipo: el repositorio incluye plantillas y automatización, pero no crea Issues, revisiones, un Project ni evidencia de interacciones remotas automáticamente.
