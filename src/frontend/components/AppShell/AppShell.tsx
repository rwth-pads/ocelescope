import {
  AppShell as MAppShell,
  Burger,
  Group,
  Text,
  UnstyledButton,
  Collapse,
  Box,
  ScrollArea,
  Button,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/router";
import classes from "@/components/AppShell/AppShell.module.css";
import { useState } from "react";
import {
  ChevronRightIcon,
  DownloadIcon,
  FunnelIcon,
  HomeIcon,
  LogOutIcon,
} from "lucide-react";
import Link from "next/link";
import {
  getPluginUrl,
  pluginComponentMap,
  PluginName,
} from "@/plugins/pluginMap";

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
      disabled={pathname === "/import"}
    >
      <MAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group align="center">
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
          <Group gap={0}>
            <Button component={Link} px={5} href={"/"} variant="subtle">
              <HomeIcon width={20} />
            </Button>
            <Button component={Link} px={5} href={"/filter"} variant="subtle">
              <FunnelIcon width={20} />
            </Button>
            <Button
              component={"a"}
              px={5}
              href={"http://localhost:8000/download"}
              variant="subtle"
            >
              <DownloadIcon width={20} />
            </Button>
            <Button component={Link} px={5} href={"/import"} variant="subtle">
              <LogOutIcon width={20} />
            </Button>
          </Group>
        </Group>
      </MAppShell.Header>
      <MAppShell.Navbar p="md" className={classes.navbar}>
        <ScrollArea className={classes.links}>
          <div className={classes.linksInner}>
            {Object.entries(pluginComponentMap).map(([pluginName, plugin]) => (
              <LinksGroup
                label={plugin.label}
                links={plugin.routes.map(({ path, name }) => ({
                  label: name,
                  link: getPluginUrl(pluginName as PluginName, path),
                }))}
                key={pluginName}
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
