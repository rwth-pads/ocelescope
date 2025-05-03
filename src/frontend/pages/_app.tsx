/* eslint-disable react-hooks/exhaustive-deps */

import { AppProps } from "next/app";
import Layout from "@/components/layout/Layout";
import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const OceanApp: React.FC<AppProps> = ({ pageProps, Component }) => {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <Layout>
          <Component />
        </Layout>
      </QueryClientProvider>
    </>
  );
};

export default OceanApp;
