import React from 'react';
import { graphql } from 'gatsby';
import Layout from '../components/Layout';
import Post from '../components/Post';
import { useSiteMetadata } from '../hooks';
import { RequiredNotNull } from "../types";
import { MarkdownRemark } from "../types/graphql";

type Props = {
    data: {
        markdownRemark: MarkdownRemark & RequiredNotNull<Pick<MarkdownRemark, 'frontmatter'>>
    }
};

const PostTemplate = ({ data }: Props) => {
    const { title: siteTitle, subtitle: siteSubtitle } = useSiteMetadata();
    const { frontmatter, excerpt } = data.markdownRemark;
    const { title: postTitle, description: postDescription, socialImage } = frontmatter;
    const metaDescription = postDescription ? postDescription : (excerpt ? excerpt : siteSubtitle);

    return (
        <Layout title={`${postTitle} - ${siteTitle}`} description={metaDescription} socialImage={socialImage as unknown as string}>
            <Post post={data.markdownRemark}/>
        </Layout>
    );
};

export const query = graphql`
    query PostBySlug($slug: String!) {
        markdownRemark(fields: { slug: { eq: $slug } }) {
            id
            html
            fields {
                slug
                tagSlugs
            }
            excerpt(pruneLength: 320)
            frontmatter {
                date
                description
                tags
                title
                socialImage {
                    childImageSharp {
                        fluid(maxWidth: 960) {
                            ...GatsbyImageSharpFluid
                        }
                    }
                }
            }
        }
    }
`;

export default PostTemplate;
