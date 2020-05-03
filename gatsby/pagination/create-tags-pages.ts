import { CreatePagesArgs } from "gatsby";
import { Query } from "../../src/types/graphql";

const _ = require("lodash");
const path = require("path");
import siteConfig from "../../config";

export default async ({ graphql, actions }: Pick<CreatePagesArgs, 'graphql' | 'actions'>) => {
  const { createPage } = actions;
  const { postsPerPage } = siteConfig;

  const result = await graphql<Query>(`
    {
      allMarkdownRemark(
        filter: {
          frontmatter: { template: { eq: "post" }, draft: { ne: true } }
        }
      ) {
        group(field: frontmatter___tags) {
          fieldValue
          totalCount
        }
      }
    }
  `);

  result.data!.allMarkdownRemark.group.forEach(tag => {
    const numPages = Math.ceil(tag.totalCount / postsPerPage);
    const tagSlug = `/tag/${_.kebabCase(tag.fieldValue)}`;

    for (let i = 0; i < numPages; i += 1) {
      createPage({
        path: i === 0 ? tagSlug : `${tagSlug}/page/${i}`,
        component: path.resolve("./src/templates/tag-template.tsx"),
        context: {
          tag: tag.fieldValue,
          currentPage: i,
          postsLimit: postsPerPage,
          postsOffset: i * postsPerPage,
          prevPagePath: i <= 1 ? tagSlug : `${tagSlug}/page/${i - 1}`,
          nextPagePath: `${tagSlug}/page/${i + 1}`,
          hasPrevPage: i !== 0,
          hasNextPage: i !== numPages - 1
        }
      });
    }
  });
};
