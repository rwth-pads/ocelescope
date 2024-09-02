/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    // Enables the styled-components SWC transform
    styledComponents: true
  },
  i18n: {
    // Set the default locale
    defaultLocale: 'en',

    // List of supported locales
    locales: ['en'],

    // Set the lang attribute in the HTML tag
    defaultLocale: 'en',
    localeDetection: false,
  }
}

module.exports = nextConfig
