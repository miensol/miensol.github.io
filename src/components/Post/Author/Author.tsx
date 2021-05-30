import React from 'react';
import { getContactHref } from '../../../utils';
import * as styles from './Author.module.scss';
import { useSiteMetadata } from '../../../hooks';

export const Author = () => {
  const { author } = useSiteMetadata();

  return (
    <div className={styles['author']}>
      <p>
        {author.bio}
        <a
          className={styles['author__bioContact']}
          href={getContactHref('email', author.contacts.email)}
          rel="noopener noreferrer"
          target="_blank"
        >
          <strong>{author.name}</strong>
        </a>
      </p>
    </div>
  );
};

