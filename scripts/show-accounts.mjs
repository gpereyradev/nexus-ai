// Explicit local command: never publish this output or send it to shared logs.
if (process.env.DEMO_ENABLED !== "true") {
  console.log("Las cuentas demo están deshabilitadas en .env.");
} else {
  console.log(
    "Credenciales LOCALES. Se crean en el primer arranque; .env no cambia contraseñas ya almacenadas.",
  );
  for (const role of ["ADMIN", "MANAGER", "ANALYST", "VIEWER"]) {
    console.log(
      `${role.toLowerCase()}@nexus.demo  ${process.env[`DEMO_${role}_PASSWORD`] || "(ejecuta npm run setup)"}`,
    );
  }
}
