import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

// Assume these icons are imported from an icon library
import { BoltIcon, ChevronDownIcon, HorizontaLDots, UserIcon, PencilIcon, ListIcon, FolderIcon } from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

type SubItem = {
  name: string;
  path: string;
  icon?: React.ReactNode;
  pro?: boolean;
  new?: boolean;
  roles?: UserRole[];
  permissions?: string[];
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  roles?: UserRole[];
  permissions?: string[];
  subItems?: SubItem[];
  /** Kept in the config but omitted from the sidebar. */
  hidden?: boolean;
};

const navItems: NavItem[] = [
  {
    icon: <BoltIcon />,
    name: "Main Dashboard",
    roles: ["admin"],
  },
  {
    icon: <UserIcon />,
    name: "Buku Tamu",
    roles: ["user", "manager", "admin"],
    // Temporarily hidden from the sidebar. Routes for /list-guest-book and
    // /guest-book still exist in App.tsx; re-enable this block to restore them.
    hidden: true,
    subItems: [
      {
        name: "Daftar Tamu",
        path: "/list-guest-book",
        icon: <ListIcon />,
        roles: ["user", "manager", "admin"],
      },
      {
        name: "Input",
        path: "/guest-book",
        icon: <PencilIcon />,
        roles: ["user", "manager", "admin"],
      }
    ],
  },
  {
    icon: <FolderIcon />,
    name: "Manajemen",
    roles: ["admin"],
    subItems: [
      {
        name: "Manajemen User",
        path: "/user-management",
        icon: <UserIcon />,
        roles: ["admin", "manager"],
      },
      {
        name: "Manajemen Departemen",
        path: "/department-management",
        icon: <FolderIcon />,
        permissions: ["manage:department"],
      },
    ],
  },

];

const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { hasAnyRole, hasAnyPermission } = useAuth();
  const location = useLocation();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItems : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (location.pathname === subItem.path) {
              setOpenSubmenu({
                type: menuType as "main" | "others",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  // Filter items based on user role / permission
  const canAccess = (item: { permissions?: string[]; roles?: UserRole[] }): boolean => {
    if (item.permissions && item.permissions.length > 0) {
      return hasAnyPermission(item.permissions);
    }
    if (item.roles && item.roles.length > 0) {
      return hasAnyRole(item.roles);
    }
    return true;
  };

  const filterByRole = (items: NavItem[]): NavItem[] => {
    return items
      .filter((nav) => !nav.hidden)
      .filter((nav) => canAccess(nav))
      .map((nav) => {
        // Also filter subItems by permission / role
        if (nav.subItems) {
          return {
            ...nav,
            subItems: nav.subItems.filter((sub) => canAccess(sub)),
          };
        }
        return nav;
      })
      .filter((nav) => {
        // Remove items that have subItems but none are visible
        if (nav.subItems && nav.subItems.length === 0) return false;
        return true;
      });
  };

  // render menu item
  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => {
    const filteredItems = filterByRole(items);

    return (
    <ul className="flex flex-col gap-4">
      {filteredItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered
                  ? "lg:justify-center"
                  : "lg:justify-start"
              }`}
            >
              <span
                className={`menu-item-icon-size  ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? "rotate-180 text-brand-500"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                to={nav.path}
                className="menu-item group menu-item-inactive"
              >
                <span className="menu-item-icon-size menu-item-icon-inactive">
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 space-y-1 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      to={subItem.path}
                      className="menu-dropdown-item menu-dropdown-item-inactive"
                    >
                      {subItem.icon && (
                        <span className="mr-2 inline-flex items-center [&>svg]:w-4 [&>svg]:h-4">
                          {subItem.icon}
                        </span>
                      )}
                      {subItem.name}
                      <span className="flex items-center gap-1 ml-auto">
                        {subItem.new && (
                          <span className="ml-auto menu-dropdown-badge menu-dropdown-badge-inactive">
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span className="ml-auto menu-dropdown-badge menu-dropdown-badge-inactive">
                            pro
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
    );
  };

  //return html view aside tag sidebar
  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/" className="inline-flex items-center">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              {/* The logo artwork is square (1878×1878), so it is rendered at a
                  1:1 ratio — a wide box would letterbox and distort it. */}
              <img
                className="h-10 w-10 shrink-0 dark:hidden"
                src="/images/logo/logo-amg.svg"
                alt="Logo"
                width={40}
                height={40}
              />
              <img
                className="hidden h-10 w-10 shrink-0 dark:block"
                src="/images/logo/logo-amg.svg"
                alt="Logo"
                width={40}
                height={40}
              />
            </>
          ) : (
            <img
              className="h-8 w-8 shrink-0"
              src="/images/logo/logo-amg.svg"
              alt="Logo"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>

      {/* main div to show */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
          </div>
        </nav>
        {isExpanded || isHovered || isMobileOpen }
      </div>

      {/* Sidebar footer */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="mt-auto border-t border-gray-200 px-5 py-4 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            © 2026 ITE - Aneka Mitra Gemilang
          </p>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
