"use client";

import Image from "next/image";
import SignInButton from "./SignInButton";
import { useAuth } from "../contexts/AuthContext";
import logo from "../../public/lia-logo.png";

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__title">
          <Image src={logo} alt="" className="app-header__logo" priority />
          <span className="app-header__site-name">LIA Curriculum</span>
          {user && (
            <span className="app-header__grade-badge">
              {user.role === "admin"
                ? "Administrator"
                : user.role === "editor"
                  ? "Editor"
                  : "Student View"}
            </span>
          )}
        </div>
        <SignInButton />
      </div>
    </header>
  );
}
