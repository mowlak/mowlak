// The manifest's start_url and scope are both "/app/", with the trailing
// slash: a start_url is only inside its scope if it begins with the scope
// as a string, and "/app" does not begin with "/app/". Neither may be
// normalized away.
//
// This is the other half of that pair. Written with the slash, the
// prerenderer emits app/index.html instead of app.html, which is the file a
// static host answers GET /app/ with — the exact request an installed app
// makes when it is launched.
export const trailingSlash = 'always';
