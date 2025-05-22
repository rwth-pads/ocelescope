import { GetStaticPaths, GetStaticProps, NextPage } from "next";

import {
  pluginComponentMap,
  PluginName,
  ComponentPath,
} from "@/plugins/pluginMap";

type PluginPageProps = {
  pluginName: PluginName;
  componentPath: ComponentPath<PluginName>;
};

export const getStaticPaths: GetStaticPaths = async () => {

  const paths = Object.entries(pluginComponentMap).flatMap(
    ([pluginName, plugin]) =>
      plugin.routes.map(({ path }) => ({
        params: { slug: [pluginName, path] },
      })),
  );

  return {
    paths,
    fallback: false,
  };
};

// Map slug to props — no redirects allowed during static export
export const getStaticProps: GetStaticProps<PluginPageProps> = async ({
  params,
}) => {
  const slugs = params?.slug ?? [];

  if (!Array.isArray(slugs) || slugs.length !== 2) {
    return { notFound: true };
  }

  const [pluginName, componentName] = slugs;

  if (!(pluginName in pluginComponentMap)) {
    return { notFound: true };
  }

  const pluginKey = pluginName as PluginName;
  const plugin = pluginComponentMap[pluginKey];

  if (!plugin.routes.some(({ path }) => path === componentName)) {
    return { notFound: true };
  }

  const componentPath = componentName as ComponentPath<typeof pluginKey>;

  return {
    props: {
      pluginName: pluginKey,
      componentPath,
    },
  };
};

// Actual page component
const PluginPage: NextPage<PluginPageProps> = ({
  pluginName,
  componentPath,
}) => {
  const plugin = pluginComponentMap[pluginName];
  const route = plugin.routes.find(({ path }) => path === componentPath);

  if (!route) {
    return null;
  }

  const Component = route.component;

  return (
    <>





      <Component />
    </>
  );
};

export default PluginPage;
