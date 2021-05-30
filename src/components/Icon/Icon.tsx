import React, { ComponentType } from "react";
import * as styles from "./Icon.module.scss";

type Props = {
  name: string;
  icon: ComponentType<any>;
};

const Icon = ({ name, icon }: Props) => {
  const Icon = icon;
  return <Icon className={styles.icon} />;
};

export default Icon;
