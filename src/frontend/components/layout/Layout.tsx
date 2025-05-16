/* eslint-disable react-hooks/exhaustive-deps */

import React, { ReactNode } from "react";

import { Inter } from "next/font/google";
import Head from "next/head";
import { Container } from "react-bootstrap";
import Navbar from "./Navbar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

type LayoutProps = {
  children: ReactNode;
};

function Layout({ children }: LayoutProps) {
  return (
    <>
      <Head>
        <title>OCEAn</title>
        <link rel="shortcut icon" href="app/ocean-logo-64.png" />
      </Head>
      <header className={inter.className}>
        <div
          className="header mt-1"
          style={{
            borderBottom: "var(--bs-border-width) solid var(--bs-border-color)",
          }}
        >
          <Navbar />
        </div>
      </header>
      <main className={inter.className}>{children}</main>
    </>
  );
}

export default Layout;
