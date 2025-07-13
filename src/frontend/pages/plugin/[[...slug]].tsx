import { GetStaticPaths, GetStaticProps, NextPage } from "next";

import PluginOverview from "@/components/Plugins/PluginOverview";
import PluginsOverview from "@/components/Plugins/PluginsOverview";
import { PluginName, RouteName } from "@/types/plugin";
import pluginMap from "@/lib/plugins/plugin-map";

type PluginPageProps = {
  plugin?: {
    name: PluginName;
    componentPath?: string;
  };
};

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = Object.entries(pluginMap).flatMap(([pluginName, plugin]) => [
    { params: { slug: [pluginName] } },
    ...Object.keys(plugin.routes).map((name) => ({
      params: { slug: [pluginName, name] },
    })),
  ]);

  return {
    paths: [...paths, { params: { slug: [] } }],
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PluginPageProps> = async ({
  params,
}) => {
  const slugs = params?.slug ?? [];

  if (!Array.isArray(slugs)) {
    return { props: {} };
  }

  const pluginName = slugs[0];

  if (!(pluginName in pluginMap)) {
    return { props: {} };
  }

  const pluginKey = pluginName as PluginName;

  const routeName = slugs[1];

  const componentPath =
    routeName in pluginMap[pluginKey].routes
      ? (routeName as RouteName<typeof pluginKey>)
      : undefined;

  return {
    props: {
      plugin: {
        name: pluginKey,
        ...(componentPath ? { componentPath } : undefined),
      },
    },
  };
};

// Actual page component
const PluginPage: NextPage<PluginPageProps> = ({ plugin }) => {
  if (!plugin) {
    return <PluginsOverview />;
  }

  const Component = Object.values(pluginMap[plugin.name].routes).find(
    ({ name }) => {
      return name === plugin.componentPath;
    },
  )?.component;

  return (
    <>
      {Component ? <Component /> : <PluginOverview pluginName={plugin.name} />}
    </>
  );
};

export default PluginPage;
