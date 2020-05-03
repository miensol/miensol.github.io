import React, { ReactNode } from "react";
import { NetlifyCmsEntry, NetlifyCmsWidgetFor } from "./netlify-types";

type Props = {
  entry: NetlifyCmsEntry;
  widgetFor: NetlifyCmsWidgetFor;
};

export const PagePreview: React.FC<Props> = ({ entry, widgetFor }) => {
  const body = widgetFor("body");
  const title = entry.getIn(["data", "title"]);

  return (
    <div className="page">
      <h1 className="page__title">{title}</h1>
      <div className="page__body">{body}</div>
    </div>
  );
};
