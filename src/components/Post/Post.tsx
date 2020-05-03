// @flow strict
import React from "react";
import { Link } from "gatsby";
import { RequiredNotNull } from "../../types";
import { MarkdownRemark, MarkdownRemarkFields, MarkdownRemarkFrontmatter } from "../../types/graphql";
import Author from "./Author";
import Comments from "./Comments";
import Content from "./Content";
import Meta from "./Meta";
import Tags from "./Tags";
import styles from "./Post.module.scss";

type Props = {
  post: MarkdownRemark;
};

export const Post = ({ post: { html, fields, frontmatter } }: Props) => {
  const { tagSlugs, slug } = fields as RequiredNotNull<MarkdownRemarkFields>;
  const { tags, title, date } = frontmatter as RequiredNotNull<MarkdownRemarkFrontmatter>;

  return (
    <div className={styles["post"]}>
      <Link className={styles["post__home-button"]} to="/">
        All Articles
      </Link>

      <div className={styles["post__content"]}>
        <Content body={html!} title={title} />
      </div>

      <div className={styles["post__footer"]}>
        <Meta date={date} />
        {tags && tagSlugs && <Tags tags={tags as string[]} tagSlugs={tagSlugs as string[]} />}
        <Author />
      </div>

      <div className={styles["post__comments"]}>
        <Comments postSlug={slug} postTitle={frontmatter!.title!} />
      </div>
    </div>
  );
};

