import * as React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-radius-pill bg-brand-primary/20 font-semibold text-brand-primary",
  {
    variants: {
      size: {
        sm: "size-8 text-xs",
        md: "size-10 text-sm",
        lg: "size-14 text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

export interface AvatarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  name?: string;
  ringColorClassName?: string;
}

function getInitials(name?: string): string {
  if (!name) {
    return "?";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  const firstPart = parts[0];
  if (!firstPart) {
    return "?";
  }

  if (parts.length === 1) {
    return firstPart.slice(0, 2).toUpperCase();
  }

  const secondPart = parts[1];
  if (!secondPart) {
    return firstPart.slice(0, 2).toUpperCase();
  }

  return `${firstPart[0] ?? ""}${secondPart[0] ?? ""}`.toUpperCase();
}

export function Avatar({
  src,
  alt,
  name,
  size,
  ringColorClassName,
  className,
  ...props
}: AvatarProps): React.JSX.Element {
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        avatarVariants({ size }),
        "relative overflow-hidden border border-border-subtle",
        ringColorClassName ? `ring-2 ring-offset-2 ring-offset-bg-base ${ringColorClassName}` : "",
        className,
      )}
      {...props}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? name ?? "Avatar"}
          fill
          unoptimized
          loader={({ src: imageSource }) => imageSource}
          className="h-full w-full object-cover"
          sizes="56px"
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </div>
  );
}
