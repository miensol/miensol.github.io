'use strict';

import { CreateNodeArgs, Node } from "gatsby";
import { MarkdownRemark } from "../src/types/graphql";

const _ = require('lodash');
const { createFilePath } = require('gatsby-source-filesystem');
const { fmImagesToRelative } = require('gatsby-remark-relative-images');
const fs = require('fs');
const path = require('path');

function isMarkdownRemarkNode(node: MarkdownRemark | Node): node is MarkdownRemark{
    return node.internal.type === 'MarkdownRemark'
}

export const onCreateNode = ({ node, actions, getNode }: CreateNodeArgs<MarkdownRemark | Node>) => {
    const { createNodeField } = actions;

    fmImagesToRelative(node);

    if (isMarkdownRemarkNode(node)) {
        const frontMatterSlug = (node?.frontmatter as any).slug;
        if (frontMatterSlug) {
            const dirname = getNode(node.parent).relativeDirectory;
            createNodeField({
                node,
                name: 'slug',
                value: `/${dirname}/${frontMatterSlug}`
            });
        } else {
            const value = createFilePath({ node, getNode });
            let slug = value;
            const startsWithDate = /^\/(\d\d\d\d)-(\d\d)-(\d\d)-/;

            if (startsWithDate.test(value)) {
                slug = "/" + value.replace(startsWithDate, '');
            }

            createNodeField({
                node,
                name: 'slug',
                value: slug
            });

            const dateMatch = value.match(startsWithDate);
            let redirectFrom = [];
            if (dateMatch) {
                const [,year,month,day] = dateMatch;
                const slugWithHtml = slug.replace(/\/+$/, '') + '.html';
                redirectFrom.push(`/${year}/${month}/${day}${slugWithHtml}`)
            }

            createNodeField({
                node,
                name: 'redirectFrom',
                value: redirectFrom
            });


        }

        if (node.frontmatter?.tags) {
            const tagSlugs = node.frontmatter.tags.map((tag) => `/tag/${_.kebabCase(tag)}/`);
            createNodeField({ node, name: 'tagSlugs', value: tagSlugs });
        }

        if (node.frontmatter?.category) {
            const categorySlug = `/category/${_.kebabCase(node.frontmatter.category)}/`;
            createNodeField({ node, name: 'categorySlug', value: categorySlug });
        }

        if (node.frontmatter?.socialImage) {
            if (!fs.existsSync(path.join(process.cwd(), 'posts', node.frontmatter.socialImage))
                && !fs.existsSync(path.join(process.cwd(), 'content/pages', node.frontmatter.socialImage))
                && !fs.existsSync(path.join(process.cwd(), 'content/posts', node.frontmatter.socialImage))
            ) {
                console.log('socialImage not found', node.frontmatter)
            }
        }
    }
};
