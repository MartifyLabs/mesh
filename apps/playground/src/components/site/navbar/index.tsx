import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Bars4Icon,
  MoonIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

import Link from "~/components/link";
import SvgMesh from "~/components/svgs/mesh";
import { linksAbout } from "~/data/links-about";
import { linksApi } from "~/data/links-api";
import { linksResources } from "~/data/links-resources";
import { linksSolutions } from "~/data/links-solutions";
import { socials } from "~/data/social";
import { useDarkmode } from "~/hooks/useDarkmode";
import MenuItem from "./menu-item";
import MenuItemDropdown from "./menu-item-dropdown";

export default function Navbar() {
  const isDark = useDarkmode((state) => state.isDark);
  const setDarkMode = useDarkmode((state) => state.setDarkMode);

  const [isSSR, setIsSSR] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsSSR(false);
  }, []);

  function toggle() {
    setDarkMode(!isDark);
  }

  function toggleMobileMenu() {
    setShowMobileMenu(!showMobileMenu);
  }

  useEffect(() => {
    function setDarkTheme(bool: boolean) {
      if (bool) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    setDarkTheme(isDark);
  }, [isDark]);

  useEffect(() => {
    setShowMobileMenu(false);
  }, [router.asPath]);

  return (
    <header>
      <nav className="fixed z-30 w-full border-b border-gray-200 bg-white/80 px-4 py-2.5 backdrop-blur lg:px-6 dark:border-gray-700 dark:bg-gray-800/80">
        <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between">
          {/* left logo start */}
          <Link href="/" className="flex items-center">
            {!isSSR && (
              <>
                <SvgMesh
                  className="mr-3 h-6 sm:h-9"
                  fill={isDark ? "#ffffff" : "#000000"}
                />
              </>
            )}
            <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
              Mesh
            </span>
          </Link>
          {/* left logo end */}

          {/* right icons start */}
          <div className="flex items-center lg:order-2">
            {socials.map((social, i) => {
              return (
                <Link
                  href={social.link}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                  key={i}
                  aria-label={social.link}
                >
                  {React.createElement(social.icon, { className: "w-6 h-6" })}
                </Link>
              );
            })}
            {!isSSR && (
              <button
                type="button"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                onClick={() => {
                  toggle();
                }}
                aria-label="Toggle dark mode"
              >
                {isDark ? (
                  <MoonIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <SunIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            <button
              type="button"
              className="ml-1 inline-flex items-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 lg:hidden dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
              onClick={() => toggleMobileMenu()}
              aria-label="Toggle mobile"
            >
              <span className="sr-only">Open main menu</span>
              <Bars4Icon className={`${showMobileMenu && "hidden"} h-6 w-6`} />
              <XMarkIcon className={`${!showMobileMenu && "hidden"} h-6 w-6`} />
            </button>
          </div>
          {/* right icons end */}

          {/* middle menu start */}
          <div
            className={`${
              !showMobileMenu && "hidden"
            } w-full items-center justify-between lg:order-1 lg:flex lg:w-auto`}
          >
            <ul className="mt-4 flex flex-col font-medium lg:mt-0 lg:flex-row lg:space-x-8">
              <MenuItemDropdown title="SDK" items={linksApi} />
              <MenuItemDropdown title="Resources" items={linksResources} />
              <MenuItemDropdown title="Solutions" items={linksSolutions} />
              <MenuItem title="Docs" link="https://docs.meshjs.dev/" />
              <MenuItemDropdown title="About" items={linksAbout} />
            </ul>
          </div>
          {/* middle menu end */}
        </div>
      </nav>
    </header>
  );
}
