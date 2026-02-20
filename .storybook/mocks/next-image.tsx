import * as React from "react";

interface NextImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export default function Image({ src, alt, ...props }: NextImageProps): React.JSX.Element {
  return <img src={src} alt={alt} {...props} />;
}
