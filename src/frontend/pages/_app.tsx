import "@mantine/core/styles.css";
import Head from "next/head";
import { MantineProvider } from "@mantine/core";
import { theme } from "../theme";
import { useState } from "react";

import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import "@mantine/dropzone/styles.css";
import AppShell from "@/components/AppShell/AppShell";
import "@mantine/dates/styles.css";

export default function App({ Component, pageProps }: any) {
  const [QueryClienty] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={QueryClienty}>
      <HydrationBoundary>
        <MantineProvider theme={theme}>
          <Head>
            <title>Mantine Template</title>
            <meta
              name="viewport"
              content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
            />
            <link rel="shortcut icon" href="/favicon.svg" />
          </Head>
          <AppShell>
            <Component {...pageProps} />
          </AppShell>
        </MantineProvider>
      </HydrationBoundary>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}
