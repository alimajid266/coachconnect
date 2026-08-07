"use client";

import { useState } from "react";

type Props = {
  targetId: string;
  label: string;
};

export default function VideoPlaybackToggle({ targetId, label }: Props) {
  const [playing, setPlaying] = useState(true);

  async function togglePlayback() {
    const video = document.getElementById(targetId);
    if (!(video instanceof HTMLVideoElement)) return;
    if (video.paused) {
      try {
        await video.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
      return;
    }
    video.pause();
    setPlaying(false);
  }

  return (
    <button className="video-playback-toggle" type="button" onClick={togglePlayback} aria-label={`${playing ? "Pause" : "Play"} ${label}`}>
      <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
      {playing ? "Pause" : "Play"}
    </button>
  );
}
