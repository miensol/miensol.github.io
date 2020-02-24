// @flow strict
import React from 'react';
import { graphql } from 'gatsby';
import Layout from '../components/Layout';
import Post from '../components/Post';
import { useSiteMetadata } from '../hooks';
import type { MarkdownRemark } from '../types';

type Props = {
    data: {
        markdownRemark: MarkdownRemark
    }
};

const PostTemplate = ({ data }: Props) => {
    const { title: siteTitle, subtitle: siteSubtitle } = useSiteMetadata();
    const { frontmatter, excerpt } = data.markdownRemark;
    const { title: postTitle, description: postDescription, socialImage } = frontmatter;
    const metaDescription = postDescription ? postDescription : (excerpt ? excerpt : siteSubtitle);

    return (
        <Layout title={`${postTitle} - ${siteTitle}`} description={metaDescription} socialImage={socialImage}>
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
