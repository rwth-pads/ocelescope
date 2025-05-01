export default {
  fastapi: {
    input: 'http://localhost:8000/openapi.json',
    output: {
      mode: 'tags-split',
      target: './api/fastapi',
      schemas: './api/fastapi-schemas',
      client: 'react-query', httpClient: 'fetch',
      baseUrl: 'http://localhost:8000'

    },
  },
};
