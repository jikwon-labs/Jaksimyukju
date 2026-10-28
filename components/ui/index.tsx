import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import s from "./ui.module.css";
import { TabBar } from "./TabBar";

type Variant = "primary" | "secondary" | "tinted" | "ghost";

function cx(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  block,
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; block?: boolean }) {
  return <button className={cx(s.btn, s[variant], block && s.block, className)} {...rest} />;
}

export function ButtonLink({
  variant = "primary",
  block,
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; block?: boolean }) {
  return <Link className={cx(s.btn, s[variant], block && s.block, className)} {...rest} />;
}

export function Card({ className, ...rest }: ComponentProps<"section">) {
  return <section className={cx(s.card, className)} {...rest} />;
}

export function Chip({
  on,
  className,
  ...rest
}: ComponentProps<"button"> & { on?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cx(s.chip, on && s.chipOn, className)}
      {...rest}
    />
  );
}

export function Pill({ children }: { children: ReactNode }) {
  return <span className={s.pill}>{children}</span>;
}

export function Switch({
  on,
  onChange,
  label,
  sub,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  sub?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={s.switch}
    >
      <span className={s.switchText}>
        <span className={s.switchLabel}>{label}</span>
        {sub && <span className={s.switchSub}>{sub}</span>}
      </span>
      <span aria-hidden="true" className={s.track}>
        <span className={s.knob} />
      </span>
    </button>
  );
}

export function BackHeader({
  href,
  title,
  right,
}: {
  href: string;
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className={s.header}>
      <Link href={href} aria-label="뒤로" className={s.back}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </Link>
      <h1 className={s.headerTitle}>{title}</h1>
      {right}
    </header>
  );
}

export function Page({
  children,
  tabs,
  className,
}: {
  children: ReactNode;
  tabs?: boolean;
  className?: string;
}) {
  return (
    <>
      <main className={cx(s.page, tabs && s.withTabs, className)}>{children}</main>
      {tabs && <TabBar />}
    </>
  );
}

