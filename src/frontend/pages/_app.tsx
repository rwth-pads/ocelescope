/* eslint-disable react-hooks/exhaustive-deps */

import { AppProps } from 'next/app';
// import { appWithTranslation } from 'next-i18next';
import ConfirmationModalProvider from '@/components/common/Confirmation';
import Layout from '@/components/layout/Layout';
import "@/global.css";
import { useImportDefaultOcelImportDefaultGet } from '@/api/default/default';

const OceanApp: React.FC<AppProps> = ({ pageProps, Component }) => {
  const { } = useImportDefaultOcelImportDefaultGet({})
  return (<>
    <Layout
    ><Component />
    </Layout>
  </>)

}

export default OceanApp;
