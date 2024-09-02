namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL: string

    NEXT_PUBLIC_CLIMATIQ_API_KEY: string | undefined
    NEXT_PUBLIC_CLIMATIQ_DATA_VERSION: number | undefined
    NEXT_PUBLIC_PRIORITY_REGIONS: string | undefined
  }
}
