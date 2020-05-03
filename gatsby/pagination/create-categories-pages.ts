const path = require("path");
import { CreatePagesArgs } from "gatsby";
import siteConfig from "../../config";
import { Query } from "../../src/types/graphql";
import { kebabCase } from "lodash";

export default async ({ graphql, actions }: Pick<CreatePagesArgs, 'graphql' | 'actions'>) => {
  const { createPage } = actions;
  const { postsPerPage } = siteConfig;

  const result = await graphql<Pick<Query, "allMarkdownRemark">>(`
    {
      allMarkdownRemark(
        filter: {
          frontmatter: { template: { eq: "post" }, draft: { ne: true } }
        }
      ) {
        group(field: frontmatter___category) {
          fieldValue
          totalCount
        }
      }
    }
  `);

  result.data!.allMarkdownRemark.group.forEach(category => {
    const numPages = Math.ceil(category.totalCount / postsPerPage);
    const categorySlug = `/category/${kebabCase(category.fieldValue!)}`;

    for (let i = 0; i < numPages; i += 1) {
      createPage({
        path: i === 0 ? categorySlug : `${categorySlug}/page/${i}`,
        component: path.resolve("./src/templates/category-template.tsx"),
        context: {
          category: category.fieldValue,
          currentPage: i,
          postsLimit: postsPerPage,
          postsOffset: i * postsPerPage,
          prevPagePath: i <= 1 ? categorySlug : `${categorySlug}/page/${i - 1}`,
          nextPagePath: `${categorySlug}/page/${i + 1}`,
          hasPrevPage: i !== 0,
          hasNextPage: i !== numPages - 1
        }
      });
    }
  });
};
