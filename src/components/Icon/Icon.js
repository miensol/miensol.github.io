// @flow strict
import React, { ComponentType } from 'react';
import styles from './Icon.module.scss';

type Props = {
    name: string,
    icon: ComponentType
};

const Icon = ({ name, icon }: Props) => {
    const Icon = icon;
    return (
        <Icon className={styles['icon']}/>
    );
};

export default Icon;
