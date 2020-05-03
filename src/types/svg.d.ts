declare module "*.svg" {
    import { SVGProps } from "react";
    const content: React.FC<SVGProps<SVGSVGElement>>;
    export default content;
}
