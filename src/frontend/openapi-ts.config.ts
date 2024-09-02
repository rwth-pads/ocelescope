import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  client: "fetch",
  input: "http://127.0.0.1:8000/openapi.json",
  output: "src/api/generated",
  enums: "typescript",  // discouraged! https://heyapi.vercel.app/openapi-ts/configuration.html#enums
})