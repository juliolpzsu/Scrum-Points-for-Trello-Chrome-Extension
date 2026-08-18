# Automatización semanal

Este directorio y el workflow `.github/workflows/publish-cws.yml` implementan el ciclo
semanal: leer reseñas de la Chrome Web Store → arreglar lo que se pueda → informarte por
email → publicar la nueva versión cuando fusionas el PR.

## Por qué hay dos piezas (local + nube) y no solo una

El entorno cloud donde corre la rutina programada de Claude **bloquea por política de red**
el acceso a `chromewebstore.google.com` (no hay forma de saltárselo desde ahí: es un límite
de seguridad del sandbox, no un fallo puntual). Google tampoco ofrece una API oficial para
leer reseñas públicas. La única forma de leer la ficha es desde una red normal, así que:

1. **Chequeo local** (`weekly-local-check.ps1`, vía el Programador de tareas de Windows,
   cada lunes por la mañana): entra a la ficha, guarda las reseñas nuevas en
   `automation/reviews-state.json` y las estadísticas en `automation/store-stats.json`, y
   sube ese cambio a `main` directamente (son solo datos, no código de la extensión).
   Desde el 2026-08-18, `run-local-check.sh` lee la ficha con **Chrome real** (vía la skill
   `how-to-chrome`) en vez de con `WebFetch`: la ficha es una SPA que carga las reseñas por
   JavaScript, y `WebFetch` a veces la leía vacía de forma ambigua. Esto abre brevemente una
   ventana de Chrome cada lunes por la mañana, en una carpeta de perfil (`Claude-ScrumPointsTrello-Profile`)
   **exclusiva de este proyecto** — nunca se usa ni se toca el Chrome normal de Julio. Se
   probó primero reutilizando el perfil dedicado genérico de la skill (`CDP-Profile`), pero
   resultó ser en la práctica la ventana de Chrome que Julio usa a diario, y cerrar/relanzar
   ese proceso le interrumpió dos veces (le cerró una serie que estaba viendo). No hace falta
   ninguna sesión iniciada en ese perfil: la ficha de la Chrome Web Store es pública.
2. **Rutina en la nube** (una hora después, mismo lunes): lee esos dos archivos, decide si
   alguna reseña describe un fallo concreto arreglable, intenta el arreglo, y si lo consigue
   abre un Pull Request (nunca sube código directo a `main`: lo revisas y fusionas tú).
   También busca mejoras por su cuenta y te manda el informe semanal por email a
   julio.lopez.suarez.03@gmail.com, pase lo que pase esa semana (aunque no haya nada nuevo).

Si el PC está apagado un lunes, simplemente no hay datos frescos de reseñas esa semana —
la rutina en la nube te lo dice en el informe y sigue con el resto (mejoras de código, etc.)
con normalidad.

## Publicación automática en la Chrome Web Store

Cuando fusionas uno de esos PRs y el cambio incluye una subida de versión en
`manifest.json`, se dispara `.github/workflows/publish-cws.yml`, que empaqueta la extensión
y la publica con la API oficial de la Chrome Web Store (via `chrome-webstore-upload-cli`).
No hace falta que compartas tu contraseña de Google con nadie: el workflow usa un token
OAuth guardado como *secret* del repositorio en GitHub, que solo tú puedes ver o cambiar.

### Configuración única (la tienes que hacer tú, una sola vez)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/), crea un proyecto (o usa
   uno que ya tengas) y activa la **Chrome Web Store API** (menú "APIs y servicios" →
   "Biblioteca" → busca "Chrome Web Store API" → "Habilitar").
2. En "APIs y servicios" → "Pantalla de consentimiento de OAuth": tipo "Externa", rellena lo
   básico, y en la sección de usuarios de prueba añade tu propio correo de Google (el mismo
   con el que publicaste la extensión).
3. En "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth" → tipo **Aplicación
   web**. En "URIs de redireccionamiento autorizados" añade:
   `https://developers.google.com/oauthplayground`
   Guarda el **Client ID** y el **Client Secret** que te da (los necesitas en el paso 5).
4. Abre [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/), pulsa
   el icono de engranaje (arriba a la derecha), marca "Use your own OAuth credentials" y
   pega ahí el Client ID y Client Secret del paso 3.
5. En el panel izquierdo, en el campo de scope manual, escribe:
   `https://www.googleapis.com/auth/chromewebstore`
   Pulsa "Authorize APIs", inicia sesión con tu cuenta de Google (la del desarrollador) y
   acepta.
6. Pulsa "Exchange authorization code for tokens". Te da un **Refresh token**: cópialo.
7. Ve al repositorio en GitHub → **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**, y crea estos cuatro, uno por uno:
   - `CWS_EXTENSION_ID` → `kffaimmdpfeleelcjibkcnbmnfdnamce`
   - `CWS_CLIENT_ID` → el Client ID del paso 3
   - `CWS_CLIENT_SECRET` → el Client Secret del paso 3
   - `CWS_REFRESH_TOKEN` → el refresh token del paso 6

**Importante**: no me pegues nunca esos valores a mí en el chat ni en ningún archivo del
repo. Van directos de tu navegador al formulario de GitHub. Yo no necesito verlos para que
esto funcione — el workflow los lee como secrets en el momento de publicar.

Hasta que no hagas esta configuración, los PRs de arreglos se seguirán abriendo y podrás
fusionarlos con normalidad, pero el paso de publicación automática fallará (o no se
disparará si no hay secrets). No pasa nada: mientras tanto puedes seguir subiendo la nueva
versión a mano desde el dashboard de la Chrome Web Store, como has hecho hasta ahora.
