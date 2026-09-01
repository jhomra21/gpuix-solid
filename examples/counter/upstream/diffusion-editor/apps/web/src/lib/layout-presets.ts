/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export type LayoutPreset = {
  label: string;
  width: number;
  height: number;
};

export type LayoutPresetCategory = {
  id: string;
  label: string;
  icon: string;
  items: LayoutPreset[];
};

export const PRESET_CATEGORIES: LayoutPresetCategory[] = [
  {
    id: "video",
    label: "Video",
    icon: "video",
    items: [
      { label: "Short-form 9:16", width: 1080, height: 1920 },
      { label: "Long-form 16:9", width: 1920, height: 1080 },
      { label: "Square video 1:1", width: 1080, height: 1080 },
      { label: "Vertical post 4:5", width: 1080, height: 1350 },
    ],
  },
  {
    id: "cinematic",
    label: "Cinematic",
    icon: "film-video-export",
    items: [
      { label: "Ultrawide 21:9", width: 1920, height: 823 },
      { label: "CinemaScope 2.39:1", width: 1920, height: 803 },
      { label: "DCI 4K 17:9", width: 4096, height: 2160 },
      { label: "Anamorphic 2.00:1", width: 1920, height: 960 },
    ],
  },
  {
    id: "social",
    label: "Social",
    icon: "context",
    items: [
      { label: "Instagram post", width: 1080, height: 1350 },
      { label: "Twitter / X post", width: 1200, height: 675 },
      { label: "LinkedIn post", width: 1200, height: 628 },
      { label: "Facebook post", width: 1200, height: 630 },
    ],
  },
  {
    id: "device",
    label: "Device (Preview)",
    icon: "mac-device",
    items: [
      { label: "iPhone 16", width: 393, height: 852 },
      { label: "iPhone 17", width: 402, height: 874 },
      { label: "iPhone 16 Plus / Max", width: 430, height: 932 },
      { label: "iPhone 17 Pro Max", width: 440, height: 956 },
      { label: "Android", width: 412, height: 917 },
      { label: "iPad", width: 834, height: 1194 },
      { label: "Laptop", width: 1440, height: 900 },
      { label: "Desktop", width: 1440, height: 1024 },
    ],
  },
];

/** Flat list of all layout presets for quick lookup. */
export const ALL_PRESETS: LayoutPreset[] = PRESET_CATEGORIES.flatMap((g) => g.items);
