import React from 'react';
import { Link } from 'gatsby';
import * as styles from './Tags.module.scss';

type Props = {
  tags: string[],
  tagSlugs: string[]
};

export const Tags = ({ tags, tagSlugs }: Props) => (
  <div className={styles['tags']}>
    <ul className={styles['tags__list']}>
      {tagSlugs && tagSlugs.map((slug, i) => (
        <li className={styles['tags__listItem']} key={tags[i]}>
          <Link to={slug} className={styles['tags__listItemLink']}>
            {tags[i]}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);
