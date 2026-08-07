type Props = {
  message?: string;
  compact?: boolean;
};

export default function SportsLoader({ message = "Preparing your next session…", compact = false }: Props) {
  return (
    <div className={`sports-loader${compact ? " sports-loader-compact" : ""}`} role="status" aria-live="polite">
      <div className="sports-loader-art" aria-hidden="true">
        <span className="sports-loader-orbit" />
        <span className="sports-loader-mark">CC</span>
      </div>
      <p>{message}</p>
      <span className="sports-loader-progress" aria-hidden="true"><i /></span>
    </div>
  );
}
