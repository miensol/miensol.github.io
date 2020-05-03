import React from "react";
import moment from "moment";
import { Link } from "gatsby";
import { MarkdownRemarkConnection } from "../../types/graphql";
import styles from "./Feed.module.scss";

type Props = {
  edges: MarkdownRemarkConnection["edges"];
};

const Feed = ({ edges }: Props) => (
  <div className={styles["feed"]}>
    {edges.map(edge => {
      const { frontmatter, excerpt, fields } = edge.node;
      const description = frontmatter?.description
        ? frontmatter.description
        : excerpt;
      return (
        <div className={styles["feed__item"]} key={fields!.slug!}>
          <div className={styles["feed__item-meta"]}>
            <time
              className={styles["feed__item-meta-time"]}
              dateTime={moment(frontmatter!.date!).format("MMMM D, YYYY")}
            >
              {moment(frontmatter!.date!).format("MMMM YYYY")}
            </time>
            <span className={styles["feed__item-meta-divider"]} />
            <span className={styles["feed__item-meta-category"]}>
              <Link
                to={fields!.categorySlug!}
                className={styles["feed__item-meta-category-link"]}
              >
                {frontmatter!.category}
              </Link>
            </span>
          </div>
          <h2 className={styles["feed__item-title"]}>
            <Link className={styles["feed__item-title-link"]} to={fields!.slug!}>
              {frontmatter!.title}
            </Link>
          </h2>
          <p className={styles["feed__item-description"]}>{description}</p>
          <Link className={styles["feed__item-readmore"]} to={fields!.slug!}>
            Read
          </Link>
        </div>
      );
    })}
  </div>
);

export default Feed;
