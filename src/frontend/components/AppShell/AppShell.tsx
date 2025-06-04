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
  Modal,
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
  LogOut,
  LogOutIcon,
} from "lucide-react";
import Link from "next/link";
import {
  getPluginUrl,
  pluginComponentMap,
  PluginName,
} from "@/plugins/pluginMap";
import { useLogout } from "@/api/fastapi/session/session";
import { useQueryClient } from "@tanstack/react-query";

const LogoutButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { push } = useRouter()
  const { mutate: logout
  } = useLogout({ mutation: { onSuccess: () => { queryClient.clear(); setIsModalOpen(false); push("/") } } })
  return (
    <>
      <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title="Are you sure?">
        <Text>
          If you leave now, all your data and progress will be <strong>deleted permanently</strong>. This action cannot be undone.
        </Text>

        <Button color="red" mt="md" onClick={() => { logout() }} fullWidth>
          Accept
        </Button>
      </Modal>
      <Button variant="subtle" px={5} disabled={isModalOpen} onClick={() => setIsModalOpen(true)}>
        <LogOut width={20} />
      </Button>
    </>
  );
};

type LinksGroupProps = {
  label: string;
  initiallyOpened?: boolean;
  links?: { label: string; link: string }[];
};

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
            <LogoutButton />
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
