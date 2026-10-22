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

## Marca Grafiplot

Interfaz personalizada con cabecera Grafiplot, colores azul petróleo y verde turquesa. Para mostrar el **logotipo original** del propietario, sube el archivo PNG a `public/grafiplot-logo.png` y vuelve a desplegar. Hasta que exista, el encabezado muestra el nombre en texto (sin imagen ficticia). El logo compartido como imagen en el chat no se ha podido materializar directamente en GitHub.

## Activar la IA en producción (pasos)

1. En Supabase Grafiplot → **Edge Functions → Secrets**, guarda `GEMINI_API_KEY` con una clave Gemini nueva, privada y revocando cualquier clave que se haya publicado en un chat.
2. Confirma que está desplegada la función `aula-generar-sesion`. Requiere JWT válido y perfil en `aula_docentes`.
3. En **Authentication → Users**, crea una cuenta de prueba; agrega su UUID a `public.aula_docentes (usuario_id, nombre)` desde SQL Editor, solo para tu propio usuario de prueba.
4. En Vercel crea un proyecto desde este repositorio (Vite, `npm run build`, `dist`) y configura `VITE_SUPABASE_URL=https://intsmwiivbdaversvlky.supabase.co` y `VITE_SUPABASE_PUBLISHABLE_KEY` con la clave publicable del proyecto, no el secreto de Gemini.
5. Configura la URL del sitio en Supabase Auth → URL Configuration y verifica la sesión docente.
6. Genera una sesión de prueba y revisa respuestas, fichas, Word y PDF. En este momento la biblioteca JSON aún requiere importación y el cupo por docente no es transaccional: restringir el acceso a un solo usuario hasta endurecer límites.

La generación de IA se hace **solo en Supabase Edge Functions**; nunca se debe agregar `GEMINI_API_KEY` al navegador, a un `VITE_` ni al repositorio público.
