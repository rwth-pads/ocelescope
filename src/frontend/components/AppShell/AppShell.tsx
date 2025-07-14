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
  Stack,
  Divider,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/router";
import classes from "@/components/AppShell/AppShell.module.css";
import { useState } from "react";
import {
  ChevronRightIcon,
  HomeIcon,
  LogOutIcon,
  PuzzleIcon,
} from "lucide-react";
import Link from "next/link";
import { useLogout } from "@/api/fastapi/session/session";
import { useQueryClient } from "@tanstack/react-query";
import { TaskModalProvider } from "../TaskModal/TaskModal";
import pluginMap from "@/lib/plugins/plugin-map";
import { getPluginRoute } from "@/lib/plugins";
import { PluginName, RouteName } from "@/types/plugin";
import CurrentOcelMenu from "../CurrentOcelMenu/CurrentOcelMenu";
import usePluginPath from "@/hooks/usePluginPath";

const LogoutButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { push } = useRouter();
  const { mutate: logout } = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setIsModalOpen(false);
        push("/");
      },
    },
  });
  return (
    <>
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Are you sure?"
      >
        <Text>
          If you leave now, all your data and progress will be{" "}
          <strong>deleted permanently</strong>. This action cannot be undone.
        </Text>

        <Button
          color="red"
          mt="md"
          onClick={() => {
            logout();
          }}
          fullWidth
        >
          Accept
        </Button>
      </Modal>
      <UnstyledButton
        className={classes.button}
        onClick={() => setIsModalOpen(true)}
      >
        <Group justify={"space-between"} w={"100%"}>
          <Text style={{ lineHeight: 1 }}>Logout</Text>
          <LogOutIcon className={classes.buttonIcon} />
        </Group>
      </UnstyledButton>
    </>
  );
};

type LinksGroupProps = {
  label: string;
  initiallyOpened?: boolean;
  links?: { label: string; link: string }[];
};

const LinksGroup: React.FC<LinksGroupProps> = ({ links, label }) => {
  const hasLinks = Array.isArray(links);
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
      <UnstyledButton component={Link} href={"/"} className={classes.control}>
        <Group justify="space-between" gap={0} align="center">
          <Box>{label}</Box>
          {hasLinks && (
            <ChevronRightIcon className={classes.chevron} size={16} />
          )}
        </Group>
      </UnstyledButton>
      {items}
    </>
  );
};

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(false);

  const pluginRoute = usePluginPath();

  return (
    <MAppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
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
        </Group>
      </MAppShell.Header>
      <MAppShell.Navbar className={classes.navbar}>
        <Stack justify="space-between" h={"100%"} gap={0}>
          <CurrentOcelMenu />
          <Divider />
          <UnstyledButton
            component={Link}
            href={"/"}
            className={classes.control}
          >
            <Group>
              <ThemeIcon variant="transparent" size={30}>
                <HomeIcon size={18} />
              </ThemeIcon>
              Home
            </Group>
          </UnstyledButton>
          <UnstyledButton
            className={classes.control}
            component={Link}
            href={"/plugin"}
          >
            <Group>
              <ThemeIcon variant="transparent" size={30}>
                <PuzzleIcon size={18} />
              </ThemeIcon>
              Plugins
            </Group>
          </UnstyledButton>

          <ScrollArea className={classes.links} px={"md"}></ScrollArea>
          <Divider />
          <LogoutButton />
        </Stack>
      </MAppShell.Navbar>
      <MAppShell.Main h="calc(100dvh - var(--app-shell-header-offset, 0rem) - var(--app-shell-footer-height, 0px) + var(--app-shell-padding, 0))">
        <TaskModalProvider>{children}</TaskModalProvider>
      </MAppShell.Main>
    </MAppShell>
  );
};

export default AppShell;
