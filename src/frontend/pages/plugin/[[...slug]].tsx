// /pages/plugin/[[...slug]].tsx
import dynamic from "next/dynamic";
import { GetStaticPaths, GetStaticProps } from "next";
import { FC } from "react";

import { Container, Nav, Stack } from "react-bootstrap";
import { plugins } from "@/plugins";
import { Plugin } from "@/plugins/types";
import PluginSidebar from "@/components/layout/PluginSidebar";
import { useRouter } from "next/router";

export type PluginPageProps = {
  category: string;
  pluginName: string;
  componentPath: string;
  plugins: Plugin[];
};

export const getStaticPaths: GetStaticPaths = async () => {
  const emptyPath = { params: { slug: [] } };

  const categoriyPaths = Object.keys(plugins).map((category) => ({
    params: { slug: [category] },
  }));

  const pluginPaths = Object.entries(plugins).flatMap(
    ([categoryName, plugins]) =>
      plugins.flatMap(({ name, routes }) => [
        ...routes.map(({ component }) => ({
          params: { slug: [categoryName, name, component] },
        })),
        { params: { slug: [categoryName, name] } },
      ]),
  );

  return {
    paths: [emptyPath, ...categoriyPaths, ...pluginPaths],
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PluginPageProps> = async ({
  params,
}) => {
  if (!params?.slug || !Array.isArray(params.slug)) {
    const first = Object.entries(plugins)[0][1][0];

    return {
      redirect: {
        destination: `/plugin/${first.category}/${first.name}/${first.routes[0].component}`,
        permanent: true,
      },
    };
  }
  const [category, pluginName, routeName] = params.slug;

  if (!pluginName) {
    const first = plugins[category][0];

    return {
      redirect: {
        destination: `/plugin/${category}/${first.name}/${first.routes[0].component}`,
        permanent: true,
      },
    };
  } else if (!routeName) {
    const first = plugins[category][0].routes[0].component;
    return {
      redirect: {
        destination: `/plugin/${category}/${pluginName}/${first}`,
        permanent: true,
      },
    };
  }

  const pluginDef = plugins[category].find((p) => p.name === pluginName);

  if (!pluginDef) return { notFound: true };

  const route = pluginDef.routes.find((r) => r.component === routeName);
  if (!route) return { notFound: true };

  return {
    props: {
      category,
      pluginName,
      componentPath: route.component,
      plugins: plugins[category],
    },
  };
};

const PluginPage: FC<PluginPageProps> = ({
  category,
  pluginName,
  componentPath,
  plugins,
}) => {
  const DynamicComponent = dynamic(
    () => import(`@/plugins/${category}/${pluginName}/pages/${componentPath}`),
    { ssr: true },
  );
  const { push, asPath } = useRouter();

  const navigateToPlugin = ({
    componentPath,
    pluginName,
  }: Omit<PluginPageProps, "plugins" | "category">) =>
    push(`/plugin/${category}/${pluginName}/${componentPath}`);

  return (
    <Container fluid style={{ display: "flex", padding: 0 }}>
      <div
        style={{
          backgroundColor: "#f8f9fa",
          borderRight: "1px solid #ddd",
          padding: "1rem",
          whiteSpace: "nowrap",
          height: "100vh",
        }}
      >
        {plugins.map((plugin) => (
          <div key={plugin.name} className="mb-4">
            <h6 className="text-muted">{plugin.label}</h6>
            <Nav className="flex-column">
              {plugin.routes.map((route) => {
                const routePath = `/plugin/${plugin.category}/${plugin.name}/${route.component}`;
                const isActive = asPath === routePath;

                return (
                  <Nav.Link
                    key={route.component}
                    onClick={() =>
                      navigateToPlugin({
                        pluginName: plugin.name,
                        componentPath: route.component,
                      })
                    }
                    active={isActive}
                    style={{
                      width: "auto",
                      fontWeight: isActive ? "bold" : undefined,
                    }}
                  >
                    {route.label}
                  </Nav.Link>
                );
              })}
            </Nav>
          </div>
        ))}
      </div>
      <DynamicComponent />
    </Container>
  );
};

export default PluginPage;
