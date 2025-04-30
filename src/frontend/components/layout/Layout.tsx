/* eslint-disable react-hooks/exhaustive-deps */

import React, { ReactNode } from "react";

import { Inter } from "next/font/google";
import Head from 'next/head';
import { Container } from "react-bootstrap";


const inter = Inter({
  subsets: ["latin"],
  display: "swap"
})

type LayoutProps = {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {

  return (
    <>
      <Head>
        <title>OCEAn</title>
        <link rel="shortcut icon" href="app/ocean-logo-64.png" />
      </Head>
      <main className={inter.className}>
        <Container className="m-10" >
          {children}
        </Container >
      </main>
    </>)
}

export default Layout;
