/* eslint-disable react-hooks/exhaustive-deps */

import App, { AppContext, AppInitialProps, AppProps } from "next/app";
import Layout from "@/components/layout/Layout";
import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const OceanApp = ({ pageProps, Component }: AppProps) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </QueryClientProvider>
    </>
  );
};

export default OceanApp;
