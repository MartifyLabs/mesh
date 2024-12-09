import React, { useState } from "react";
import Link from "~/components/link";
import { ChevronRightIcon } from "@heroicons/react/24/solid";

import { MenuItem } from "~/types/menu-item";

export default function SubmenuItemDropdown({
  title,
  icon,
  items,
  link,
}: {
  title: string;
  icon?: any;
  items: MenuItem[];
  link?: string;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <li
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      onClick={() => setShowMenu(!showMenu)}
    >
      <Link href={link ?? "#"}>
        <button
          type="button"
          className="hover:text-black dark:hover:text-white flex w-full items-center justify-between px-4 py-2"
        >
          <span className="flex items-center">
            {icon && React.createElement(icon, { className: "mr-2 w-4 h-4" })}
            {title}
          </span>
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </Link>

      <div
        className={`absolute z-10 w-56 divide-y divide-gray-100 rounded bg-white shadow dark:bg-gray-700 ${
          !showMenu && "hidden"
        }`}
        style={{ transform: "translate3d(210px, -40px, 0px)" }}
      >
        <ul className="py-1 text-sm font-light text-gray-500 dark:text-gray-400">
          {items &&
            items.map((item, i) => (
              <Item
                title={item.title}
                link={item.link}
                icon={item.icon}
                key={i}
              />
            ))}
        </ul>
      </div>
    </li>
  );
}

function Item({
  title,
  link,
  icon,
}: {
  title: string;
  link: string;
  icon?: any;
}) {
  return (
    <li>
      <Link
        href={link}
        className="hover:text-black dark:hover:text-white flex w-full items-center px-4 py-2"
      >
        {icon && React.createElement(icon, { className: "mr-2 w-4 h-4" })}
        {title}
      </Link>
    </li>
  );
}
