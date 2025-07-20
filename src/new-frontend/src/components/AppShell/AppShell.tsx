import {
  AppShell as MAppShell,
  Burger,
  Group,
  Text,
  UnstyledButton,
  Box,
  ScrollArea,
  Button,
  Modal,
  Stack,
  Divider,
  ThemeIcon,
  Collapse,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import classes from "@/components/AppShell/AppShell.module.css";
import { useState } from "react";
import {
  ChevronRightIcon,
  HomeIcon,
  LogOutIcon,
  PackageIcon,
  PuzzleIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";

const LogoutButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

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

        <Button color="red" mt="md" onClick={() => {}} fullWidth>
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
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const LinksGroup: React.FC<LinksGroupProps> = ({
  links,
  label,
  icon: Icon,
  initiallyOpened = false,
}) => {
  const hasLinks = Array.isArray(links);
  const [opened, setOpened] = useState(initiallyOpened || false);
  const items = (hasLinks ? links : []).map((link) => (
    <Text className={classes.link} key={link.label}>
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
          <Box style={{ display: "flex", alignItems: "center" }}>
            <ThemeIcon variant="transparent" size={30}>
              {Icon ? (
                <Icon width={18} height={18} />
              ) : (
                <PackageIcon size={18} />
              )}
            </ThemeIcon>
            <Box ml="md">{label}</Box>
          </Box>
          {hasLinks && (
            <ChevronRightIcon
              className={classes.chevron}
              size={16}
              style={{ transform: opened ? "rotate(90deg)" : "none" }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks ? <Collapse in={opened}>{items}</Collapse> : null}
    </>
  );
};

const AppShell: React.FC = () => {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(false);

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
          <UnstyledButton className={classes.control}>
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
        <Outlet />
      </MAppShell.Main>
    </MAppShell>
  );
};

export default AppShell;
