import { CreatePagesArgs } from "gatsby";
import { Query } from "../../src/types/graphql";

const path = require("path");
import siteConfig from "../../config";

export default async ({ graphql, actions }: Pick<CreatePagesArgs, 'graphql' | 'actions'>) => {
  const { createPage } = actions;

  const result = await graphql<Query>(`
    {
      allMarkdownRemark(
        filter: {
          frontmatter: { template: { eq: "post" }, draft: { ne: true } }
        }
      ) {
        totalCount
      }
    }
  `);

  const { postsPerPage } = siteConfig;
  const numPages = Math.ceil(
    result.data!.allMarkdownRemark.totalCount / postsPerPage
  );

  for (let i = 0; i < numPages; i += 1) {
    createPage({
      path: i === 0 ? "/" : `/page/${i}`,
      component: path.resolve("./src/templates/index-template.tsx"),
      context: {
        currentPage: i,
        postsLimit: postsPerPage,
        postsOffset: i * postsPerPage,
        prevPagePath: i <= 1 ? "/" : `/page/${i - 1}`,
        nextPagePath: `/page/${i + 1}`,
        hasPrevPage: i !== 0,
        hasNextPage: i !== numPages - 1
      }
    });
  }
};
