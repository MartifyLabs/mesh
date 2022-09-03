import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SunIcon, MoonIcon, MenuIcon } from '@heroicons/react/solid';
import useLocalStorage from '../hooks/useLocalStorage';
import SvgGithub from './svgs/github';
import { useRouter } from 'next/router';

const NavigationBar = (props) => {
  const [darkMode, setDarkMode] = useLocalStorage('darkmode', false);
  const [isSSR, setIsSSR] = useState(true);
  const [hideMenu, setHideMenu] = useState(true);

  useEffect(() => {
    setIsSSR(false);
  }, []);

  function setDarkTheme(bool) {
    if (bool) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setDarkMode(bool);
  }

  function toggle() {
    setDarkMode(!darkMode);
  }

  useEffect(() => {
    setDarkTheme(darkMode);
  }, [darkMode]);

  const { events } = useRouter();

  const close = ()=> {
    setHideMenu(true);
  }

  useEffect(() => {
    // subscribe to next/router event
    events.on('routeChangeStart', close);
    return () => {
      // unsubscribe to event on unmount to prevent memory leak
      events.off('routeChangeStart', close); 
    };
  }, [close, events]);

  return (
    <header className="sticky top-0 z-40 flex-none mx-auto w-full border-b border-gray-200 dark:border-gray-600">
      <nav className="px-4 lg:px-6 py-2.5 bg-white/80 backdrop-blur dark:bg-gray-800/80">
        <div className="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl">
          <Link href="/" className="flex items-center">
            <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white cursor-pointer">
              Mesh Playground
            </span>
          </Link>
          <div className="flex items-center lg:order-2">
            <a
              href="https://github.com/MartifyLabs/mesh"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
            >
              <SvgGithub />
            </a>

            {!isSSR && (
              <button
                type="button"
                className="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
                onClick={() => {
                  toggle();
                }}
              >
                {darkMode ? (
                  <MoonIcon className="h-4 w-4 text-gray-500" />
                ) : (
                  <SunIcon className="h-4 w-4 text-gray-500" />
                )}
              </button>
            )}
            <button
              data-collapse-toggle="mobile-menu-2"
              type="button"
              className="inline-flex items-center p-2 ml-1 text-sm text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"
              aria-controls="mobile-menu-2"
              aria-expanded="false"
              onClick={() => setHideMenu(!hideMenu)}
            >
              <span className="sr-only">Open main menu</span>
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
          <div
            className={`${
              hideMenu && 'hidden'
            } justify-between items-center w-full lg:flex lg:w-auto lg:order-1`}
            id="mobile-menu-2"
          >
            <ul className="flex flex-col mt-4 font-medium lg:flex-row lg:space-x-8 lg:mt-0">
              <NavLink href={'/guides'} label={'Guides'} />
              <NavLink href={'/apis/wallet'} label={'Wallet'} />
              <NavLink href={'/apis/transaction'} label={'Transaction'} />
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

function NavLink({ href, label }) {
  return (
    <li className="grid grid-cols-1 content-around">
      <Link href={href}>
        <span className="block py-2 pr-4 pl-3 text-gray-700 border-b border-gray-100 hover:bg-gray-50 lg:hover:bg-transparent lg:border-0 lg:hover:text-primary-700 lg:p-0 dark:text-gray-400 lg:dark:hover:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700 cursor-pointer">
          {label}
        </span>
      </Link>
    </li>
  );
}
export default NavigationBar;
