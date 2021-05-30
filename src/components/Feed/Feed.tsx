import React from "react";
import moment from "moment";
import { Link } from "gatsby";
import { MarkdownRemarkConnection } from "../../types/graphql";
import * as styles from "./Feed.module.scss";

type Props = {
  edges: MarkdownRemarkConnection["edges"];
};

const Feed = ({ edges }: Props) => {
  return (
      <div>
        {edges.map(edge => {
          const { frontmatter, excerpt, fields } = edge.node;
          const description = frontmatter?.description
              ? frontmatter.description
              : excerpt;
          return (
              <div className={styles["feed__item"]} key={fields!.slug!}>
                <div>
                  <time
                      className={styles["feed__itemMetaTime"]}
                      dateTime={moment(frontmatter!.date!).format("MMMM D, YYYY")}
                  >
                    {moment(frontmatter!.date!).format("MMMM YYYY")}
                  </time>
                  <span className={styles["feed__itemMetaDivider"]}/>
                  <span>
                <Link
                    to={fields!.categorySlug!}
                    className={styles["feed__itemMetaCategoryLink"]}
                >
                  {frontmatter!.category}
                </Link>
              </span>
                </div>
                <h2 className={styles["feed__itemTitle"]}>
                  <Link className={styles["feed__itemTitleLink"]} to={fields!.slug!}>
                    {frontmatter!.title}
                  </Link>
                </h2>
                <p className={styles["feed__itemDescription"]}>{description}</p>
                <Link className={styles["feed__itemReadmore"]} to={fields!.slug!}>
                  Read
                </Link>
              </div>
          );
        })}
      </div>
  );
};

export default Feed;
