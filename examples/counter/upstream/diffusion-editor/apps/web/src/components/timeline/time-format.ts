/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export type TimeFormat = 'standard' | 'timecode' | 'frames';

export const TIME_FORMAT_OPTIONS: { value: TimeFormat; label: string; example: string }[] = [
  { value: 'standard', label: 'Standard', example: 'MM:SS:CS' },
  { value: 'timecode', label: 'Timecode', example: 'HH:MM:SS:FF' },
  { value: 'frames', label: 'Frames', example: '30f' },
];

function pad(value: number) {
  return Math.floor(value).toString().padStart(2, '0');
}

/**
 * Formats a frame position into a display string according to the
 * selected {@link TimeFormat}.
 *
 * - `standard`: minutes, seconds and centiseconds (`MM:SS:CS`)
 * - `timecode`: hours, minutes, seconds and frames (`HH:MM:SS:FF`)
 * - `frames`: the raw frame count (e.g. `30f`)
 */
export function formatFrames(frame: number, fps: number, format: TimeFormat) {
  const safeFps = Number.isFinite(fps) && fps > 0 ? fps : 30;
  const safeFrame = Number.isFinite(frame) ? Math.max(0, frame) : 0;

  switch (format) {
    case 'frames':
      return `${Math.round(safeFrame)}f`;
    case 'timecode': {
      const totalSeconds = Math.floor(safeFrame / safeFps);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const frames = Math.floor(safeFrame % safeFps);
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
    }
    case 'standard':
    default: {
      const t = safeFrame / safeFps;
      const minutes = Math.floor(t / 60);
      const seconds = Math.floor(t % 60);
      const centiseconds = Math.floor((t % 1) * 100);
      return `${pad(minutes)}:${pad(seconds)}:${pad(centiseconds)}`;
    }
  }
}
