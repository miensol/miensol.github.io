// @flow strict
import { useStaticQuery, graphql } from 'gatsby';
import { Query } from "../types/graphql";

const useTagsList = () => {
  const { allMarkdownRemark } = useStaticQuery<Query>(
    graphql`
      query TagsListQuery {
        allMarkdownRemark(
          filter: { frontmatter: { template: { eq: "post" }, draft: { ne: true } } }
        ) {
          group(field: frontmatter___tags) {
            fieldValue
            totalCount
          }
        }
      }
    `
  );

  return allMarkdownRemark.group;
};

export default useTagsList;
