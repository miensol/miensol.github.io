import CMS from 'netlify-cms-app';
import { PagePreview } from "./preview-templates/page-preview";
import { PostPreview } from "./preview-templates/post-preview";

CMS.registerPreviewTemplate('pages', PagePreview as any);
CMS.registerPreviewTemplate('posts', PostPreview as any);
