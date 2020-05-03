import { useStaticQuery, graphql } from 'gatsby';
import { Query } from "../types/graphql";

const useCategoriesList = () => {
  const { allMarkdownRemark } = useStaticQuery<Query>(
    graphql`
      query CategoriesListQuery {
        allMarkdownRemark(
          filter: { frontmatter: { template: { eq: "post" }, draft: { ne: true } } }
        ) {
          group(field: frontmatter___category) {
            fieldValue
            totalCount
          }
        }
      }
    `
  );

  return allMarkdownRemark.group;
};

export default useCategoriesList;
