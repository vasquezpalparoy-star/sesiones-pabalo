# AulaFácil IA — sesiones docentes

Aplicación web Vite conectable al proyecto **Grafiplot** de Supabase. Los docentes inician sesión, rellenan el formulario y solicitan una sesión a la función segura `aula-generar-sesion`. La biblioteca de miles de JSON se administra por separado: **no se piden archivos al docente**.

## Configuración

1. Ejecutar `npm install`.
2. Copiar `.env.example` a `.env.local`.
3. Colocar la **clave publicable** de Supabase en `VITE_SUPABASE_PUBLISHABLE_KEY` (Dashboard → Project Settings → API Keys). No utilizar `service_role` ni ninguna clave privada.
4. Ejecutar `npm run dev`. Para producción, `npm run build`.
5. En Vercel, conectar este repositorio, Framework: Vite, Build command: `npm run build`, Output: `dist` y configurar las dos variables `VITE_`.

## Estado real

- Supabase Auth por email/contraseña: interfaz creada; habilitar proveedor email y URL de redirección en Supabase.
- La Edge Function `aula-generar-sesion` ya existe en Grafiplot, pero la generación real depende de `GEMINI_API_KEY` y del modelo disponible en la cuenta.
- Alta de docentes: un administrador debe crear el usuario en Supabase Auth y agregar su UUID a `aula_docentes`. Hasta entonces la función devolverá 403.
- La tabla `aula_sesiones_biblioteca` está vacía: importar JSON desde la herramienta administrativa, no desde el sitio docente.
- La búsqueda en internet de fichas y la importación de plantillas DOCX de muestra aún no están implementadas; no se anuncian como operativas.
- Exportar PDF usa impresión del navegador; exportar DOCX crea un Word editable con las secciones.
- El límite mensual de 20 generaciones implementado en la función no es transaccional. **No abrir al público ni permitir múltiples solicitudes simultáneas hasta implementar reservas atómicas/rate limits y controles de costo.**

## Seguridad

**Nunca** subir `GEMINI_API_KEY`, clave secreta/service_role de Supabase ni archivos `.env.local` a GitHub. Las variables `VITE_` quedan visibles en el navegador y deben contener exclusivamente datos publicables.
