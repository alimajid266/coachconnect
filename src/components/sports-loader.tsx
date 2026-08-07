import Image from "next/image";

type Props = {
  message?: string;
  compact?: boolean;
};

export default function SportsLoader({ message = "Preparing your next session…", compact = false }: Props) {
  return (
    <div className={`sports-loader${compact ? " sports-loader-compact" : ""}`} role="status" aria-live="polite">
      <div className="sports-loader-art" aria-hidden="true">
        <span className="sports-loader-halo" />
        <Image
          className="sports-loader-logo"
          src="/brand/coachconnect-linked-rings.svg"
          width={184}
          height={184}
          alt=""
          priority
          unoptimized
        />
      </div>
      <p>{message}</p>
      <span className="sports-loader-progress" aria-hidden="true"><i /></span>
    </div>
  );
}
