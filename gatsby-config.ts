import siteConfig from "./config";
import postCssPlugins from "./postcss-config";
import { RequiredNotNull } from "./src/types";
import {
  MarkdownRemarkConnection,
  Query,
  SiteSiteMetadata
} from "./src/types/graphql";

export const siteMetadata = {
  url: siteConfig.url,
  siteUrl: siteConfig.url,
  title: siteConfig.title,
  subtitle: siteConfig.subtitle,
  copyright: siteConfig.copyright,
  disqusShortname: siteConfig.disqusShortname,
  menu: siteConfig.menu,
  author: siteConfig.author
};

export default {
  pathPrefix: siteConfig.pathPrefix,
  siteMetadata,
  plugins: [
    {
      resolve: "gatsby-plugin-typescript",
      options: {
        // isTSX: true, // defaults to false
        // jsxPragma: `jsx`, // defaults to "React"
        // allExtensions: true, // defaults to false
      }
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "assets",
        path: `${__dirname}/static`
      }
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "css",
        path: `${__dirname}/static/css`
      }
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        path: `${__dirname}/content/posts`,
        name: "posts",
        ignore: [`**/node_modules`]
      }
    },
    {
      resolve: "gatsby-source-filesystem",
      options: {
        path: `${__dirname}/content`,
        name: "content"
      }
    },
    {
      resolve: "gatsby-plugin-react-svg"
    },
    {
      resolve: "gatsby-plugin-feed",
      options: {
        query: `
          {
            site {
              siteMetadata {
                site_url: url
                title
                description: subtitle
              }
            }
          }
        `,
        feeds: [
          {
            serialize: ({
              query: { site, allMarkdownRemark }
            }: {
              query: {
                site: { siteMetadata: RequiredNotNull<SiteSiteMetadata> };
                allMarkdownRemark: MarkdownRemarkConnection;
              };
            }) =>
              allMarkdownRemark.edges.map(edge => {
                const frontmatter = edge.node.frontmatter;
                const siteMetadata = site.siteMetadata;
                return {
                  ...frontmatter,
                  description: frontmatter?.description
                    ? frontmatter.description
                    : edge.node.excerpt,
                  date: frontmatter?.date,
                  url: siteMetadata.url! + edge.node!.fields!.slug,
                  guid: siteMetadata.url! + edge.node!.fields!.slug,
                  custom_elements: [{ "content:encoded": edge.node.html }]
                };
              }),
            query: `
              {
                allMarkdownRemark(
                  limit: 1000,
                  sort: { order: DESC, fields: [frontmatter___date] },
                  filter: { frontmatter: { template: { eq: "post" }, draft: { ne: true } } }
                ) {
                  edges {
                    node {
                      html
                      fields {
                        slug
                      }
                      excerpt(pruneLength: 320)
                      frontmatter {
                        title
                        date
                        template
                        draft
                        description
                      }
                    }
                  }
                }
              }
            `,
            output: "/feed.xml",
            title: siteConfig.title
          }
        ]
      }
    },
    {
      resolve: "gatsby-transformer-remark",
      options: {
        plugins: [
          "gatsby-remark-relative-images",
          {
            resolve: "gatsby-remark-katex",
            options: {
              strict: "ignore"
            }
          },
          {
            resolve: "gatsby-remark-images",
            options: {
              maxWidth: siteConfig.maxWidth,
              withWebp: true,
              ignoreFileExtensions: []
            }
          },
          {
            resolve: "gatsby-remark-responsive-iframe",
            options: { wrapperStyle: "margin-bottom: 1.0725rem" }
          },
          "gatsby-remark-autolink-headers",
          {
            resolve: "gatsby-remark-embed-snippet",
            options: {}
          },
          {
            resolve: "gatsby-remark-prismjs",
            options: {
              languageExtensions: [
                {
                  language: "shellscript",
                  extend: "bash",
                  definition: {}
                }
              ]
            }
          },
          "gatsby-remark-copy-linked-files",
          "gatsby-remark-smartypants",
          "gatsby-remark-external-links"
        ]
      }
    },
    "gatsby-transformer-sharp",
    "gatsby-plugin-sharp",
    "gatsby-plugin-netlify",
    {
      resolve: "gatsby-plugin-netlify-cms",
      options: {
        modulePath: `${__dirname}/src/cms/index.ts`
      }
    },
    {
      resolve: "gatsby-plugin-google-gtag",
      options: {
        trackingIds: [siteConfig.googleAnalyticsId],
        pluginConfig: {
          head: true
        }
      }
    },
    {
      resolve: "gatsby-plugin-sitemap",
      options: {
        query: `
          {
            site {
              siteMetadata {
                siteUrl: url
              }
            }
            allSitePage(
              filter: {
                path: { regex: "/^(?!/404/|/404.html|/dev-404-page/)/" }
              }
            ) {
              edges {
                node {
                  path
                }
              }
            }
          }
        `,
        output: "/sitemap.xml",
        serialize: ({ site, allSitePage }: RequiredNotNull<Query>) =>
          allSitePage.edges.map(edge => ({
            url: site.siteMetadata!.siteUrl + edge.node.path,
            changefreq: "daily",
            priority: 0.7
          }))
      }
    },
    {
      resolve: "gatsby-plugin-manifest",
      options: {
        name: siteConfig.title,
        short_name: siteConfig.title,
        start_url: "/",
        background_color: "#FFF",
        theme_color: "#F7A046",
        display: "standalone",
        icon: "static/piotr-bright.png"
      }
    },
    "gatsby-plugin-offline",
    "gatsby-plugin-catch-links",
    "gatsby-plugin-react-helmet",
    {
      resolve: "gatsby-plugin-sass",
      options: {
        postCssPlugins: [...postCssPlugins],
        cssLoaderOptions: {
          camelCase: false
        }
      }
    },
    "gatsby-plugin-optimize-svgs",
    {
      resolve: "gatsby-plugin-page-progress",
      options: {
        color: "#5D93FF",
        includePaths: [{ regex: "^/(.+)" }],
        excludePaths: ["/", {regex: "/page/.*"}]
      }
    }
  ]
};
