/* eslint-disable react-hooks/exhaustive-deps */
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import { AppStateExport } from "@/src/app-state.types";
import { removeLocalStorage } from "@/src/util";
import { useOceanStore } from "@/src/zustand";
import Link from "next/link";
import { Alert, Form, Modal, NavDropdown } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import { NavLinkProps } from "react-bootstrap/NavLink";
import { FaDownload, FaGear, FaXmark } from "react-icons/fa6";
import styled from "styled-components";
import { useConfirmation } from "../common/Confirmation";
import DownloadButton from "../DownloadButton";
import { ButtonToolbar, IconButton } from "../misc";
import saveAs from "file-saver";
import { ClimatiqLogoIcon } from "../climatiq/ClimatiqConfigModal";
import { useLoadingText } from "./Layout";

export type EmissionDownloadMode = "events" | "objects" | false
type DownloadOptions = {
  emissionDownloadMode?: EmissionDownloadMode
}

const Navbar: React.FC<{
  pageName: string
}> = ({ pageName }) => {
  const setLoadingText = useLoadingText()

  const session = useOceanStore.use.session()
  const ocel = useOceanStore.use.ocel()
  const emissions = useOceanStore.use.emissions()
  const objectEmissionResults = useOceanStore.use.objectEmissionResults()
  const apiState = useOceanStore.use.apiState()
  const confirm = useConfirmation()

  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const { setIsClimatiqSettingsOpen } = useOceanStore.useState.isClimatiqSettingsOpen()
  const [emissionDownloadMode, setEmissionDownloadMode] = useState<EmissionDownloadMode>(false)

  const hasEventEmissions = useMemo(() => {
    return !!emissions
  }, [emissions])
  const hasObjectEmissions = useMemo(() => {
    return !!objectEmissionResults
  }, [objectEmissionResults])

  useEffect(() => {
    if (!emissionDownloadMode) {
      if (hasEventEmissions) setEmissionDownloadMode("events")
      if (hasObjectEmissions) setEmissionDownloadMode("objects")
    }
  }, [hasEventEmissions, hasObjectEmissions])

  const triggerDownload = useCallback(({ emissionDownloadMode = false }: DownloadOptions) => {
    async function callback() {
      if (!ocel || !session || !apiState) return false
      setLoadingText("Preparing download")
      const params = emissionDownloadMode ? `?emissions=${emissionDownloadMode}` : ""
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/download${params}`, {
        headers: {
          "Ocean-Session-Id": session,
          "token": apiState
        },
        method: "GET"
      })
      const blob = await res.blob()
      saveAs(blob, ocel.meta.fileName)
      setLoadingText(null)
      setShowDownloadModal(false)
      return true
    }
    callback()
  }, [ocel, session, apiState])

  return (
    <div className="d-flex gap-3">
      <Link href="/" style={{ textDecoration: "none" }}>
        <div className="d-flex align-items-center gap-2">
          <Image
            src="/app/ocean-logo.svg"
            alt="OCEAn Logo"
            width={30}
            height={30}
          />
          <span className="d-none d-sm-inline text-ocean-green" style={{ fontSize: "24px", fontWeight: "700" }}>OCEAn</span>
        </div>
      </Link>
      <Nav variant="tabs" defaultActiveKey="/home" style={{ gap: ".25rem", marginBottom: "calc(-1 * var(--bs-nav-tabs-border-width))" }}>
        <Nav.Item>
          <NavLink href="/" eventKey="0" pageName="StartPage" activePageName={pageName}>Start</NavLink>
        </Nav.Item>
        {!!ocel && (<>
          <Nav.Item>
            <NavLink href="/emissions" eventKey="1" pageName="EmissionsPage" activePageName={pageName}>Emissions</NavLink>
          </Nav.Item>
          {/* <Nav.Item>
            <NavLink href="/climatiq" eventKey="2" pageName="ClimatiqPage" activePageName={pageName}>Climatiq</NavLink>
          </Nav.Item> */}
        </>)}
      </Nav>

      <div className="ms-auto d-flex align-items-center gap-1 text-secondary">
        {(session && ocel && apiState) && (<>
          <Button
            variant="link"
            onClick={() => setShowDownloadModal(true)}
            className="text-secondary"
            title="Download event log"
          >
            <FaDownload />
          </Button>

          <NavDropdown title={<FaGear />} id="navbarScrollingDropdown">
            <NavDropdown.Item onClick={() => setIsClimatiqSettingsOpen(true)} className="d-flex align-items-center gap-2">
              <ClimatiqLogoIcon />
              Climatiq config
            </NavDropdown.Item>
            {/* <NavDropdown.Divider />
            <NavDropdown.Item href="#action5">
              Something else here
            </NavDropdown.Item> */}
          </NavDropdown>

          <Button variant="link" className="text-secondary" title="Leave session" onClick={async () => {
            if (await confirm("Are you sure you want to leave the session?", {
              confirmButtonVariant: "danger",
              confirmText: "Leave session",
            })) {
              removeLocalStorage("session")
              window.location.href = "/"
            }
          }}>
            <FaXmark />
          </Button>
        </>)}
      </div>

      <Modal show={showDownloadModal} size="sm" onHide={() => setShowDownloadModal(false)}>
        {!!(ocel && session && apiState) && (<>
          <Modal.Header closeButton>
            <Modal.Title>Download OCEL</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {(hasEventEmissions && hasObjectEmissions) && (
              <Alert variant="info" className="small">Emissions can be exported on event or object level, <strong>not</strong> both at once. This way, overall process emissions are preserved.</Alert>
            )}
            <Form.Check
              type="switch"
              id="checkDownloadEventEmissions"
              label="Include event emissions"
              disabled={!hasEventEmissions}
              checked={emissionDownloadMode == "events"}
              onChange={e => setEmissionDownloadMode(e.target.checked ? "events" : false)}
            />
            <Form.Check
              type="switch"
              id="checkDownloadObjectEmissions"
              label="Include object emissions"
              disabled={!hasObjectEmissions}
              checked={emissionDownloadMode == "objects"}
              onChange={e => setEmissionDownloadMode(e.target.checked ? "objects" : false)}
            />
          </Modal.Body>
          <Modal.Footer>
            <ButtonToolbar>
              <IconButton
                label="Download"
                onClick={() => triggerDownload({ emissionDownloadMode: emissionDownloadMode })}
                variant="primary"
                title="Download OCEL with user preferences"
                // setLoadingText={setLoadingText}
              >
                <FaDownload />
              </IconButton>
              {/* <IconButton variant="primary" label="New sample" onClick={() => handleSampleObjects()}><FaArrowsRotate /></IconButton> */}
              <Button variant="secondary" onClick={() => setShowDownloadModal(false)}>Close</Button>
            </ButtonToolbar>
          </Modal.Footer>
        </>)}
      </Modal>
    </div>
  )
}

export default Navbar;

const UnstyledNavLink: React.FC<NavLinkProps & React.PropsWithChildren<{
  href: string
  pageName: string
  activePageName: string
}>> = ({ href, children, className, pageName, activePageName, ...props }) => {
  const active = pageName == activePageName

  return (
    <Link href={href} className={className}>
      <Nav.Link as="div" active={active} {...props}>{children}</Nav.Link>
    </Link>
  )
}

const NavLink = styled(UnstyledNavLink)`
  text-decoration: none;
  .nav-link {
    --bs-nav-link-padding-x: .8rem;
    &:not(.active):hover {
      background: var(--bs-light-bg-subtle);
    }
  }
`;
