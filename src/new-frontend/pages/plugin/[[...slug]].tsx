// /pages/plugin/[[...slug]].tsx
import dynamic from "next/dynamic";
import { GetStaticPaths, GetStaticProps } from "next";
import { FC } from "react";

import { Plugin } from "@/plugins/types";
import { useRouter } from "next/router";
import { plugins } from "@/plugins";

export type PluginPageProps = {
  pluginName: string;
  componentPath: string;
};

export const getStaticPaths: GetStaticPaths = async () => {
  const emptyPath = { params: { slug: [] } };

  const pluginPaths = plugins.flatMap(({ name, routes }) =>
    plugins.flatMap(({ name, routes }) => [
      ...routes.map(({ component }) => ({
        params: { slug: [name, component] },
      })),
      { params: { slug: [name] } },
    ]),
  );

  return {
    paths: [emptyPath, ...pluginPaths],
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<PluginPageProps> = async ({
  params,
}) => {
  const slugs = params?.slug ?? [];
  const plugin = plugins.find(({ name }) => name === slugs[0]) ?? plugins[0];
  const pluginRoute =
    plugin.routes.find(({ component }) => component === slugs[1]) ??
    plugin.routes[0];

  if (!params?.slug || slugs.length < 2 || !Array.isArray(params.slug)) {
    return {
      redirect: {
        destination: `/plugin/${plugin.name}/${pluginRoute.component}`,
        permanent: true,
      },
    };
  }

  return {
    props: {
      pluginName: plugin.name,
      componentPath: pluginRoute.component,
    },
  };
};

const PluginPage: FC<PluginPageProps> = ({ pluginName, componentPath }) => {
  const DynamicComponent = dynamic(
    () => import(`@/plugins/${pluginName}/pages/${componentPath}`),
    { ssr: true },
  );

  return <DynamicComponent />;
};

export default PluginPage;
