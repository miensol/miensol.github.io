const React = require("react");
import { GatsbyConfig, GatsbySSR, RenderBodyArgs } from "gatsby";
import siteConfig from "../config";

// eslint-disable-next-line import/no-webpack-loader-syntax, import/no-unresolved
const katexStylesheet = require("!css-loader!../static/css/katex/katex.min.css");

export const onRenderBody: GatsbySSR["onRenderBody"] = async ({ setHeadComponents }: RenderBodyArgs) => {
  const { useKatex } = siteConfig;

  if (useKatex) {
    setHeadComponents([
      React.createElement("style", {
        key: "katex-inline-stylesheet",
        dangerouslySetInnerHTML: { __html: katexStylesheet.toString() }
      })
    ]);
  }
};

