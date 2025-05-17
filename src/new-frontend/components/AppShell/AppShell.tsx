import {
  AppShell as MAppShell,
  Burger,
  Group,
  Text,
  UnstyledButton,
  Collapse,
  Box,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/router";
import classes from "@/components/AppShell/AppShell.module.css";
import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";
import { plugins } from "@/plugins";
import Link from "next/link";

interface LinksGroupProps {
  label: string;
  initiallyOpened?: boolean;
  links?: { label: string; link: string }[];
}

const LinksGroup: React.FC<LinksGroupProps> = ({
  links,
  label,
  initiallyOpened,
}) => {
  const hasLinks = Array.isArray(links);
  const [opened, setOpened] = useState(initiallyOpened || false);
  const items = (hasLinks ? links : []).map((link) => (
    <Text
      component={Link}
      className={classes.link}
      href={link.link}
      key={link.label}
    >
      {link.label}
    </Text>
  ));

  return (
    <>
      <UnstyledButton
        onClick={() => setOpened((o) => !o)}
        className={classes.control}
      >
        <Group justify="space-between" gap={0} align="center">
          <Box>{label}</Box>
          {hasLinks && (
            <ChevronRightIcon
              className={classes.chevron}
              size={16}
              style={{ transform: opened ? "rotate(-90deg)" : "none" }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks && <Collapse in={opened}>{items}</Collapse>}
    </>
  );
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);

  const { pathname } = useRouter();

  return (
    <MAppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
      disabled={pathname === "/"}
    >
      <MAppShell.Header>
        <Group h="100%" px="md">
          <Burger
            opened={mobileOpened}
            onClick={toggleMobile}
            hiddenFrom="sm"
            size="sm"
          />
          <Burger
            opened={desktopOpened}
            onClick={toggleDesktop}
            visibleFrom="sm"
            size="sm"
          />
        </Group>
      </MAppShell.Header>
      <MAppShell.Navbar p="md" className={classes.navbar}>
        <ScrollArea className={classes.links}>
          <div className={classes.linksInner}>
            {plugins.map(({ label, name, routes }) => (
              <LinksGroup
                label={label}
                links={routes.map((route) => ({
                  label: route.label,
                  link: `/plugin/${name}/${route.component}`,
                }))}
                key={name}
              />
            ))}
          </div>
        </ScrollArea>
      </MAppShell.Navbar>
      <MAppShell.Main>{children}</MAppShell.Main>
    </MAppShell>
  );
};

export default AppShell;
