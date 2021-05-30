import React from 'react';
import moment from 'moment';
import * as styles from './Meta.module.scss';

type Props = {
  date: string
};

export const Meta = ({ date }: Props) => (
  <div>
    <p className={styles['meta__date']}>Published {moment(date).format('D MMM YYYY')}</p>
  </div>
);
