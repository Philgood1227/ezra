import * as React from "react";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

export default function Link({ href, children, ...props }: LinkProps): React.JSX.Element {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
