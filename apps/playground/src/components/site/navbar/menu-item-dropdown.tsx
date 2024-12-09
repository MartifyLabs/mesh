import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

import { MenuItem } from "~/types/menu-item";
import SubmenuItem from "./submenu-item";
import SubmenuItemDropdown from "./submenu-item-dropdown";

export default function MenuItemDropdown({
  title,
  items,
}: {
  title: string;
  items: MenuItem[];
}) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <li
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
      onClick={() => setShowMenu(!showMenu)}
    >
      <button
        type="button"
        className="dark:text-white lg:hover:text-black lg:dark:hover:text-white dark:hover:text-white flex w-full items-center justify-between border-b border-gray-100 py-2 pl-3 pr-4 font-medium text-gray-700 hover:bg-gray-50 lg:w-auto lg:border-0 lg:p-0 lg:hover:bg-transparent dark:border-gray-700 dark:hover:bg-gray-700 lg:dark:hover:bg-transparent"
        aria-label="More"
      >
        {title}
        <ChevronDownIcon className="ml-1 h-5 w-5 lg:h-4 lg:w-4" />
      </button>
      <div
        className={`absolute z-10 w-56 divide-y divide-gray-100 rounded bg-white shadow dark:bg-gray-700 ${
          !showMenu && "hidden"
        }`}
      >
        <ul className="py-1 text-sm font-light text-gray-500 dark:text-gray-400">
          {items.map((item, i) =>
            item.items ? (
              <SubmenuItemDropdown
                title={item.title}
                icon={item.icon}
                items={item.items}
                link={item.link}
                key={i}
              />
            ) : (
              <SubmenuItem
                title={item.title}
                icon={item.icon}
                link={item.link}
                key={i}
              />
            ),
          )}
        </ul>
      </div>
    </li>
  );
}
