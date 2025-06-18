import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/notifications/styles.css";
import "@xyflow/react/dist/style.css";
import "@/styles/floating-flow.css";
import { Notifications } from "@mantine/notifications";

import Head from "next/head";
import { MantineProvider, Notification } from "@mantine/core";
import { theme } from "../theme";
import { useState } from "react";

import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import AppShell from "@/components/AppShell/AppShell";

export default function App({ Component, pageProps }: any) {
  const [QueryClienty] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={QueryClienty}>
      <HydrationBoundary>
        <MantineProvider theme={theme}>
          <Notifications />
          <Head>
            <title>Ocelescope</title>
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
