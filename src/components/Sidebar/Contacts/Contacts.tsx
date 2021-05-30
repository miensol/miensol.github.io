// @flow strict
import { OutboundLink } from "gatsby-plugin-google-gtag";
import React from 'react';
import { getContactHref, getIcon } from '../../../utils';
import Icon from '../../Icon';
import * as styles from './Contacts.module.scss';

type Props = {
  contacts: {
    [key: string]: string,
  },
};

const Contacts = ({ contacts }: Props) => (
  <div className={styles['contacts']}>
    Contact me
    <ul className={styles['contacts__list']}>
      {Object.keys(contacts).map((name) => (!contacts[name] ? null : (
        <li className={styles['contacts__listItem']} key={name}>
          <OutboundLink
            className={styles['contacts__listItemLink']}
            href={getContactHref(name, contacts[name])}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Icon name={name} icon={getIcon(name)} />
          </OutboundLink>
        </li>
      )))}
    </ul>
  </div>
);

export default Contacts;
