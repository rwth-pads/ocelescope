/* eslint-disable react-hooks/exhaustive-deps */

import React, { HTMLProps, ReactNode, useEffect, useMemo, useState } from "react";

import { Ripple } from "@/components/common/Loading";
import Toast, { ToastProps } from "@/components/common/Toast";
import { useOceanStore } from "@/src/zustand";
import $ from "jquery";
import { Inter } from "next/font/google";
import Head from 'next/head';
import Alert from "react-bootstrap/Alert";
import Container from "react-bootstrap/Container";
import ToastContainer from "react-bootstrap/ToastContainer";
import { createPortal } from "react-dom";
import styled from "styled-components";
import ClimatiqSettingsModal from "../climatiq/ClimatiqConfigModal";
import Navbar from "./Navbar";

export type PageState = {
  errorMessage: JSX.Element | string | null
  hasError: boolean
  toasts: ToastProps[]
  loadingText: string | true | null
}

export const initialPageState = {
  errorMessage: null,
  hasError: false,
  toasts: [],
  loadingText: null,
}

export function useLoadingText() {
  return useOceanStore.use.setLoadingText()
}

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
})

type LayoutProps = {
  pageName: string
  darkMode: boolean
  children: ReactNode
}

const maxNumToasts = 3

function Layout({ pageName, darkMode, children }: LayoutProps) {

  const errorMessage = useOceanStore.use.errorMessage()
  const loadingText = useOceanStore.use.loadingText()
  const displayedLoadingText = useMemo(() => loadingText !== true ? loadingText : "Loading", [loadingText])
  const isLoading = useMemo(() => !!loadingText, [loadingText])
  const toasts = useOceanStore.use.toasts()

  return (<>
    <Head>
      <title>OCEAn</title>
      <link rel="shortcut icon" href="app/ocean-logo-64.png" />
    </Head>

    <header className={inter.className}>
      <div className="header mt-1" style={{ borderBottom: "var(--bs-border-width) solid var(--bs-border-color)" }}>
        <Container>
          <Navbar
            pageName={pageName}
          />
        </Container>
      </div>
    </header>
    <main className={inter.className}>
      <Wrapper>

        <div id="sidebar" className="pt-3">
          {/* Sidebar content gets moved here with a portal */}
        </div>
        <div id="content">

          <Container id="pageContainer" className="pt-3">
            {!!errorMessage && (
              <Alert variant="danger" dismissible>
                {/* string: Split into <p> elements */}
                {typeof errorMessage === "string" && errorMessage.split("\n").map((line, i) => {
                  const indentPrefix = line.match(/^\s+/)?.[0] ?? ""
                  const indent = 4 * (indentPrefix.match(/\t/g) || []).length + (indentPrefix.match(/ /g) || []).length
                  return <p key={i} className="mb-0" style={{ marginLeft: `${.75 * indent}rem` }}>{line.trim()}</p>
                })}
                {/* Any JSX Element */}
                {typeof errorMessage !== "string" && errorMessage}
                {/* <pre className="m-0" style={{ whiteSpace: "pre-wrap" }}>{errorMessage}</pre> */}
              </Alert>
            )}
            {children}
          </Container>

        </div>

      </Wrapper>

      <ClimatiqSettingsModal />

      {!!toasts.length && (
        <ToastContainer
          className="p-3"
          position="bottom-start"
          containerPosition="fixed"
          style={{ zIndex: 1 }}
        >
          {toasts.slice(-maxNumToasts).map((props, i) => (<Toast key={i} {...props} />))}
        </ToastContainer>
      )}

      {!!(isLoading && displayedLoadingText) && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <Ripple size={150} duration={1.2} />
          <p style={{ fontSize: "200%", marginTop: "1rem", color: "#fff", transform: "scale(1)" }}>
            <span>{displayedLoadingText}</span>
            {!displayedLoadingText.endsWith("...") && <span className="ps-1 position-absolute">...</span>}
          </p>
        </div>
      )}
    </main>
  </>)
}

export default Layout;

const Wrapper = styled.div`
  display: flex;
  align-items: stretch;

  & > #sidebar {
    padding: 1rem;
    width: 280px;
    &:not(:has(*)) {
      display: none;
    }
    &:has(*) + #content {
      /* content div when the sidebar is active */
      box-shadow: inset 20px 0 20px -20px rgba(0, 0, 0, .1);
      padding-left: .75rem;
    }

  }
  & > #content {
    width: 100%;
  }
`

export const Sidebar: React.FC<HTMLProps<HTMLDivElement>> = ({ children, ...props }) => {

  const [sidebar, setSidebar] = useState<JQuery<HTMLElement>>()

  useEffect(() => {
    const sb = $("div").filter("#sidebar")
    // if (sb.length && children) {
    //   sb.addClass("active")
    // }
    setSidebar(sb)

  }, [])

  return (<>
    {(children && sidebar?.length) && createPortal(children, sidebar[0])}
  </>)

}

