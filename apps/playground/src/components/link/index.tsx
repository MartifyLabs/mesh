import React from "react";
import NextLink from "next/link";

export default function Link({
  children,
  href,
  className,
  icon,
  target,
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
  icon?: any;
  target?: string;
}) {
  return (
    <NextLink
      href={href}
      className={`${className} ${typeof children == "string" && "text-black no-underline hover:underline dark:text-white"} `}
      target={target ? target : href.startsWith("http") ? "_blank" : "_self"}
      rel="noreferrer"
    >
      {icon && React.createElement(icon, { className: "mr-2 w-4 h-4" })}
      {children}
    </NextLink>
  );
}
