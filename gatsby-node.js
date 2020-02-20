const path = require(`path`)
const { createFilePath } = require(`gatsby-source-filesystem`)


const startWithSlashAndDate = /^\/\d\d\d\d-\d\d-\d\d-/;

function startsWithDate(fileSlug) {
    return startWithSlashAndDate.test(fileSlug);
}

exports.createPages = async ({ graphql, actions }) => {
    const { createPage } = actions

    const blogPost = path.resolve(`./src/templates/blog-post.js`)
    const result = await graphql(
        `
      {
        allMarkdownRemark(
          sort: { fields: [frontmatter___date], order: DESC }
          limit: 1000
        ) {
          edges {
            node {
              fields {
                slug
              }
              frontmatter {
                title
              }
            }
          }
        }
      }
    `
    );

    if (result.errors) {
        throw result.errors
    }

    // Create blog posts pages.
    const posts = result.data.allMarkdownRemark.edges;

    posts.forEach((post, index) => {
        const previous = index === posts.length - 1 ? null : posts[index + 1].node;
        const next = index === 0 ? null : posts[index - 1].node;

        let slug = post.node.fields.slug;

        createPage({
            path: slug,
            component: blogPost,
            context: {
                slug: slug,
                previous,
                next,
            },
        })
    })
};

exports.onCreateNode = ({ node, actions, getNode }) => {
    const { createNodeField, createRedirect } = actions;

    if (node.internal.type === `MarkdownRemark`) {
        const value = createFilePath({ node, getNode });
        let slug = value;
        if (startsWithDate(value)) {
            slug = value.replace(startWithSlashAndDate, '/')
        }
        createNodeField({
            name: `slug`,
            node: node,
            value: slug,
        });

        createRedirect({
            fromPath: value,
            toPath: slug,
            isPermanent: true,
            redirectInBrowser: true
        });
    }
};
