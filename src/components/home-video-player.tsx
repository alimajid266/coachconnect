"use client";

import { useEffect, useRef, useState } from "react";

const VIDEOS = [
  "/videos/football-training-night.mp4",
  "/videos/football-training-aerial.mp4",
] as const;

export default function HomeVideoPlayer() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      videoRef.current?.pause();
    }
  }, [index]);

  useEffect(() => {
    const preload = document.createElement("link");
    preload.rel = "prefetch";
    preload.as = "video";
    preload.href = VIDEOS[(index + 1) % VIDEOS.length];
    document.head.append(preload);
    return () => preload.remove();
  }, [index]);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setPaused(true);
      }
    } else {
      video.pause();
    }
  }

  return (
    <>
      <video
        key={VIDEOS[index]}
        ref={videoRef}
        id="homepage-sports-video"
        className={transitioning ? "is-transitioning" : undefined}
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="/images/football-training-video-poster.jpg"
        aria-label="Homepage sports training video"
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          if (Number.isFinite(video.duration) && video.duration - video.currentTime <= 0.55) setTransitioning(true);
        }}
        onEnded={() => {
          setPaused(true);
          setTransitioning(true);
          setIndex((current) => (current + 1) % VIDEOS.length);
        }}
        onLoadedData={() => setTransitioning(false)}
        onPlay={() => setPaused(false)}
        onPause={(event) => {
          setPaused(true);
          if (!event.currentTarget.ended) setTransitioning(false);
        }}
      >
        <source src={VIDEOS[index]} type="video/mp4" />
      </video>
      <button
        type="button"
        className="video-playback-toggle"
        aria-label={`${paused ? "Play" : "Pause"} homepage sports video`}
        aria-controls="homepage-sports-video"
        onClick={togglePlayback}
      >
        <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
      </button>
    </>
  );
}
