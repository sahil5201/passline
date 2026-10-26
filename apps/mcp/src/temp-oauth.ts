// // 1. Define your OAuth Metadata configuration payload
// const oauthMetadata = {
//   issuer: "https://mcp.jsdevsahil.xyz",
//   authorization_endpoint: "https://mcp.jsdevsahil.xyz/oauth/authorize", // Update to your actual auth route
//   token_endpoint: "https://mcp.jsdevsahil.xyz/oauth/token",             // Update to your actual token route
//   response_types_supported: ["code"],
//   grant_types_supported: ["authorization_code"],
//   // Add any additional standard OAuth metadata fields your setup requires
// }

// // 2. Register all variations ChatGPT is checking based on your logs
// const discoveryPaths = [
//   '/.well-known/oauth-authorization-server/mcp',
//   '/.well-known/oauth-authorization-server',
//   '/mcp/.well-known/oauth-authorization-server',
//   '/.well-known/openid-configuration/mcp',
//   '/.well-known/openid-configuration',
//   '/mcp/.well-known/openid-configuration'
// ]

// // 3. Bind the routes to serve the configuration
// discoveryPaths.forEach(path => {
//   app.get(path, (c) => {
//     return c.json(oauthMetadata)
//   })
// })

// 26-10-26



/**
 * OAuth 2.1 protected resource metadata (MCP clients discover this).
 * Full consent UI lives in the Next.js app later; metadata enables connector discovery.
 */
// v1
// app.get("/.well-known/oauth-protected-resource", (c) => {
//   const base = new URL(PUBLIC_URL)
//   const resource = `${PUBLIC_URL}/mcp`
//   console.log('origin', base.origin)
//   console.log('resource', resource)

//   let supabaseAuth: string | undefined
//   try {
//     supabaseAuth = `${loadEnv().supabaseUrl.replace(/\/$/, "")}/auth/v1`
//   } catch {
//     supabaseAuth = undefined
//   }

//   return c.json({
//     resource: resource,
//     authorization_servers: supabaseAuth ? [supabaseAuth] : [],
//     scopes_supported: ["openid", "profile", "email"],
//     bearer_methods_supported: ["header"],
//     resource_documentation: `${base.origin}/health`,
//   })
// })

// app.get("/.well-known/oauth-protected-resource/mcp", (c) => {
//   const url = new URL(`${PUBLIC_URL}/mcp`)
//   url.pathname = "/.well-known/oauth-protected-resource"
//   return c.redirect(url.toString(), 307)
// })

// v1
// app.get("/.well-known/oauth-protected-resource/mcp", (c) => {
//   // return JSON directly instead of redirecting
//   const supabaseAuth = `${loadEnv().supabaseUrl.replace(/\/$/, "")}/auth/v1`
//   return c.json({
//     resource: `${PUBLIC_URL}/mcp`,
//     authorization_servers: [supabaseAuth],
//     scopes_supported: ["openid", "profile", "email"],
//     bearer_methods_supported: ["header"],
//   })
// })