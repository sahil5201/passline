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