import { getImage } from "gatsby-plugin-image";
import { IGatsbyImageDataParent } from "gatsby-plugin-image/dist/src/components/hooks";
import React from "react";
import { graphql } from "gatsby";
import Layout from "../components/Layout";
import Sidebar from "../components/Sidebar";
import Page from "../components/Page";
import { useSiteMetadata } from "../hooks";
import { RequiredNotNull } from "../types";
import { MarkdownRemark } from "../types/graphql";

type Props = {
  data: {
    markdownRemark: MarkdownRemark &
      RequiredNotNull<Pick<MarkdownRemark, "frontmatter">> & { frontmatter: { socialImage: IGatsbyImageDataParent } };
  };
};

const PageTemplate = ({ data }: Props) => {
  const { title: siteTitle, subtitle: siteSubtitle } = useSiteMetadata();
  const { html: pageBody } = data.markdownRemark;
  const { frontmatter } = data.markdownRemark;
  const { title: pageTitle, description: pageDescription, socialImage } = frontmatter;
  const metaDescription = pageDescription !== null ? pageDescription : siteSubtitle;

  return (
    <Layout title={`${pageTitle} - ${siteTitle}`} description={metaDescription} socialImage={getImage(socialImage)}>
      <Sidebar />
      <Page title={pageTitle!}>
        <div dangerouslySetInnerHTML={{ __html: pageBody! }} />
      </Page>
    </Layout>
  );
};

export const query = graphql`
  query PageBySlug($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      html
      frontmatter {
        title
        date
        description
        socialImage {
          childImageSharp {
            gatsbyImageData(width: 960)
          }
        }
      }
    }
  }
`;

export default PageTemplate;
