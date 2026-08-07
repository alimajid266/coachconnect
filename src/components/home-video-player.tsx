"use client";

import { useEffect, useRef, useState } from "react";

const VIDEOS = [
  "/videos/football-training-night.mp4",
  "/videos/football-training-aerial.mp4",
] as const;

export default function HomeVideoPlayer() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      videoRef.current?.pause();
    }
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
        autoPlay
        muted
        playsInline
        preload="metadata"
        poster="/images/football-training-video-poster.jpg"
        aria-label={`Homepage sports training video ${index + 1} of ${VIDEOS.length}`}
        onEnded={() => {
          setPaused(true);
          setIndex((current) => (current + 1) % VIDEOS.length);
        }}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
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
      <span className="hero-video-sequence" aria-live="polite">Video {index + 1} of {VIDEOS.length}</span>
    </>
  );
}
