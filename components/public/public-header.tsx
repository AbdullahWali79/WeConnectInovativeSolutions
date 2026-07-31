"use client";

import Image from "next/image";
import Link from "next/link";
      >
        <div className="public-bottom-nav-shell">
          {bottomNavItems.map((item) => {
            const isActive = item.path === "/"
              ? currentPath === "/"
              : item.path === "/#portfolio"
                ? false
                : currentPath === item.path;

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => item.path === "/#portfolio" ? setMenuOpen(false) : handleNavigate(item.path)}
                className={`public-bottom-nav-item ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon name={item.icon} className="public-bottom-nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={`public-bottom-nav-item ${menuOpen ? "is-active" : ""}`}
            onClick={() => setMenuOpen((current) => !current)}
            aria-label={menuOpen ? "Close full menu" : "Open full menu"}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
          >
            <Icon name={menuOpen ? "close" : "menu"} className="public-bottom-nav-icon" />
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
