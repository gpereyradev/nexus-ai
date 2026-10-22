# GitHub · primera subida y actualizaciones

## Primera subida

1. Extrae el ZIP. Abre la carpeta `nexus-ai` que contiene `package.json` y este
   proyecto en VS Code. No subas el archivo comprimido como código.
2. En GitHub crea un repositorio **vacío** llamado `nexus-ai`. No marques
   README, licencia ni `.gitignore`, porque aquí ya existen archivos iniciales.
   Puedes empezar con el repositorio privado y decidir su visibilidad después.
3. Abre Git Bash dentro de `nexus-ai`. Ejecuta:

```bash
git init
git branch -M main
git add .
git status
```

En `git status`, comprueba que no estén `.env`, `node_modules`, `dist` ni
`target`. Después:

```bash
git commit -m "chore: initialize NEXUS AI foundation"
git remote add origin https://github.com/TU_USUARIO/nexus-ai.git
git push -u origin main
```

Reemplaza `TU_USUARIO` por tu usuario real. Si Git abre una autorización,
utiliza tu cuenta correcta. No escribas tokens en el código ni en el chat.
Si ya habías iniciado Git o añadido un remoto, revisa `git status` y
`git remote -v` antes de repetir comandos. No uses `push --force` para resolver
un rechazo. Si creaste el repo con README, conserva ambos historiales usando
un clon limpio y copia allí los archivos del proyecto.

## Si pide identidad para el commit

Configura estos valores para este repositorio (sin `--global`):

```bash
git config user.name "Guillermo Pereyra"
git config user.email "TU_CORREO_DE_GITHUB_O_NOREPLY"
```

Después repite el commit. Esta configuración es la identidad del autor;
la autenticación de GitHub se resuelve por separado.

## Cada actualización

Trabajaremos desde el código actual del repo, revisaremos los cambios y
ejecutaremos las pruebas del módulo. Desde una copia limpia actualizada:

```bash
git pull --ff-only
git switch -c feat/f4-analytics
```

Después de implementar y verificar:

```bash
git add .
git diff --cached --stat
git commit -m "feat: add analytics baseline"
git push -u origin feat/f4-analytics
```

La rama se revisa y se integra en `main`. No reemplaces una carpeta que
contenga cambios locales sin confirmar. Antes de pasar a otro módulo,
guarda los cambios y comparte el enlace del repo o un ZIP actualizado.

## Qué compartirme para continuar

- URL del repositorio y rama de trabajo.
- Si pudiste ejecutar frontend y backend.
- Mensaje de error completo, si aparece, con contraseñas y tokens ocultos.

Con eso continuamos desde el estado actual. Acceder a un repo privado exige
una conexión con permiso o que adjuntes su código; un enlace por sí solo no
garantiza acceso. Publicar la app es una tarea independiente de subir código.
