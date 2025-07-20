import { defineConfig } from "orval";
export default defineConfig({
  fastapi: {
    input: "http://localhost:8000/openapi.json",
    output: {
      mode: "tags-split",
      target: "./src/api/fastapi",
      schemas: "./src/api/fastapi-schemas",
      client: "react-query",
      httpClient: "fetch",
      baseUrl: "http://localhost:8000",
      clean: true,
      override: {
        mutator: {
          path: "./src/api/fetcher.ts",
          name: "customFetch",
        },
        query: {
          options: {
            staleTime: 1000 * 60 * 5,
          },
        },
        fetch: {
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
