import React from "react";
import { NetlifyCmsEntry, NetlifyCmsWidgetFor } from "./netlify-types";

type Props = {
  entry: NetlifyCmsEntry;
  widgetFor: NetlifyCmsWidgetFor;
};

export const PostPreview: React.FC<Props> = ({ entry, widgetFor }) => {
  const body = widgetFor("body");
  const title = entry.getIn(["data", "title"]);

  return (
    <div className="post">
      <h1 className="post__title">{title}</h1>
      <div className="post__body">{body}</div>
    </div>
  );
};
