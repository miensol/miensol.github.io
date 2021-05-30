import { CreateNodeArgs, Node } from "gatsby";
import { Directory, MarkdownRemark } from "../src/types/graphql";
import { kebabCase } from "lodash";

const { createFilePath } = require("gatsby-source-filesystem");

function isMarkdownRemarkNode(node: MarkdownRemark | Node): node is MarkdownRemark {
  return node.internal.type === "MarkdownRemark";
}

export const onCreateNode = ({ node, actions, getNode }: CreateNodeArgs<MarkdownRemark | Node>) => {
  const { createNodeField } = actions;

  if (isMarkdownRemarkNode(node)) {
    const frontMatterSlug = node?.frontmatter?.slug;
    if (frontMatterSlug) {
      createNodeField({
        node,
        name: "slug",
        value: frontMatterSlug,
      });
    } else {
      const value = createFilePath({ node, getNode });
      let slug = value;
      const startsWithDate = /^\/(\d\d\d\d)-(\d\d)-(\d\d)-/;

      if (startsWithDate.test(value)) {
        slug = "/" + value.replace(startsWithDate, "");
      }

      createNodeField({
        node,
        name: "slug",
        value: slug,
      });

      const dateMatch = value.match(startsWithDate);
      let redirectFrom = [];
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        const slugWithHtml = slug.replace(/\/+$/, "") + ".html";
        redirectFrom.push(`/${year}/${month}/${day}${slugWithHtml}`);
      }

      createNodeField({
        node,
        name: "redirectFrom",
        value: redirectFrom,
      });
    }

    if (node.frontmatter?.tags) {
      const tagSlugs = node.frontmatter.tags.map((tag) => `/tag/${kebabCase(tag!)}/`);
      createNodeField({ node, name: "tagSlugs", value: tagSlugs });
    }

    if (node.frontmatter?.category) {
      const categorySlug = `/category/${kebabCase(node.frontmatter.category)}/`;
      createNodeField({ node, name: "categorySlug", value: categorySlug });
    }
  }
};
