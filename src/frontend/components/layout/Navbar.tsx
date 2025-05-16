/* eslint-disable react-hooks/exhaustive-deps */
import Image from "next/image";
import React from "react";

import Link from "next/link";
import Button from "react-bootstrap/Button";
import Nav from "react-bootstrap/Nav";
import { NavLinkProps } from "react-bootstrap/NavLink";
import { FaDownload, FaGear, FaXmark } from "react-icons/fa6";
import styled from "styled-components";
import { useRouter } from "next/router";

const Navbar: React.FC = () => {
  const { pathname } = useRouter();

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
          <span
            className="d-none d-sm-inline text-ocean-green"
            style={{ fontSize: "24px", fontWeight: "700" }}
          >
            OCEAn
          </span>
        </div>
      </Link>
    </div>
  );
};

export default Navbar;

const UnstyledNavLink: React.FC<
  NavLinkProps &
    React.PropsWithChildren<{
      href: string;
      pageName: string;
      activePageName: string;
    }>
> = ({ href, children, className, pageName, activePageName, ...props }) => {
  const active = pageName == activePageName;

  return (
    <Link href={href} className={className}>
      <Nav.Link as="div" active={active} {...props}>
        {children}
      </Nav.Link>
    </Link>
  );
};

const NavLink = styled(UnstyledNavLink)`
  text-decoration: none;
  .nav-link {
    --bs-nav-link-padding-x: .8rem;
    &:not(.active):hover {
      background: var(--bs-light-bg-subtle);
    }
  }
`;
