import React from "react";

import Link from "~/components/link";

export default function SubmenuItem({
  title,
  icon,
  link,
}: {
  title: string;
  icon: any;
  link: string;
}) {
  return (
    <li>
      <Link
        href={link}
        className="hover:text-black dark:hover:text-white flex w-full items-center px-4 py-2"
        target={link.startsWith("http") ? "_blank" : "_self"}
      >
        {icon && React.createElement(icon, { className: "mr-2 w-4 h-4" })}
        {title}
      </Link>
    </li>
  );
}
