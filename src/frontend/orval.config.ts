
export default {
  fastapi: {
    input: 'http://127.0.0.1:8000/openapi.json',
    output: {
      mode: 'tags-split',
      target: './api/fastapi-client.ts',
      schemas: './api/fastapi-schemas.ts',
      client: 'react-query',
    },
  },
};

