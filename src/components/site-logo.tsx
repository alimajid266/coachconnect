import Link from "next/link";

type SiteLogoProps = {
  className?: string;
};

export default function SiteLogo({ className = "" }: SiteLogoProps) {
  return (
    <Link
      className={`site-logo${className ? ` ${className}` : ""}`}
      href="/"
      aria-label="CoachConnect home"
    >
      Coach<span>Connect</span>
    </Link>
  );
}
