'use strict';

const _ = require('lodash');
const { createFilePath } = require('gatsby-source-filesystem');
const { fmImagesToRelative } = require('gatsby-remark-relative-images');
const fs = require('fs');
const path = require('path');

const onCreateNode = ({ node, actions, getNode }) => {
    const { createNodeField } = actions;

    fmImagesToRelative(node);

    if (node.internal.type === 'MarkdownRemark') {
        if (typeof node.frontmatter.slug !== 'undefined') {
            const dirname = getNode(node.parent).relativeDirectory;
            createNodeField({
                node,
                name: 'slug',
                value: `/${dirname}/${node.frontmatter.slug}`
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

        if (node.frontmatter.tags) {
            const tagSlugs = node.frontmatter.tags.map((tag) => `/tag/${_.kebabCase(tag)}/`);
            createNodeField({ node, name: 'tagSlugs', value: tagSlugs });
        }

        if (node.frontmatter.category) {
            const categorySlug = `/category/${_.kebabCase(node.frontmatter.category)}/`;
            createNodeField({ node, name: 'categorySlug', value: categorySlug });
        }

        if (node.frontmatter.socialImage) {
            if (!fs.existsSync(path.join(process.cwd(), '_posts', node.frontmatter.socialImage))
                && !fs.existsSync(path.join(process.cwd(), 'content/pages', node.frontmatter.socialImage))
                && !fs.existsSync(path.join(process.cwd(), 'content/posts', node.frontmatter.socialImage))
            ) {
                console.log('socialImage not found', node.frontmatter)
            }
        }
    }
};

module.exports = onCreateNode;
