import React from "react";
import { Helmet } from "react-helmet";
import { withPrefix } from "gatsby";
import { useSiteMetadata } from "../../hooks";
import { ImageSharp } from "../../types/graphql";
import * as styles from "./Layout.module.scss";

type Props = {
  children: React.ReactNode;
  title: string;
  description?: string;
  socialImage?: { childImageSharp: ImageSharp };
};

const Layout = ({ children, title, description, socialImage }: Props) => {
  const { author, url } = useSiteMetadata();
  const metaImage =
    socialImage != null
      ? socialImage.childImageSharp?.fluid?.src
      : author.photo;
  const metaImageUrl = url + withPrefix(metaImage);

  return (
    <div className={styles.layout}>
      <Helmet>
        <html lang="en" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:site_name" content={title} />
        <meta property="og:image" content={metaImageUrl} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={metaImageUrl} />
      </Helmet>
      {children}
    </div>
  );
};

export default Layout;
