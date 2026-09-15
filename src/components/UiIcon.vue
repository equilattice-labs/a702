<script setup>
defineProps({
  name: { type: String, default: "arrow" },
  size: { type: [Number, String], default: 20 },
});
const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  wallet:
    "M20 8V5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16V8H4a2 2 0 0 1 0-4l12-2v3 M20 12h-6v5h6 M16 14.5h.01",
  book: "M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1v15",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  external:
    "M14 3h7v7 M21 3 10 14 M11 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-7",
  plus: "M12 5v14 M5 12h14",
  close: "m6 6 12 12 M18 6 6 18",
  search: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15 M16 16l5 5",
  chevron: "m9 5 7 7-7 7",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  globe:
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M2 12h20 M12 2c-6 5-6 15 0 20 6-5 6-15 0-20",
  layers: "m12 3 10 5-10 5L2 8l10-5Z M2 12l10 5 10-5 M2 16l10 5 10-5",
  network:
    "M8 6h8 M6 8l5 9 M18 8l-5 9 M8 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M22 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M15 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  chart: "M3 3v18h18 M7 15l4-5 4 3 6-8",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z m-4 10 3 3 5-6",
  info: "M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  refresh:
    "M20 7v5h-5 M4 17v-5h5 M5 7a8 8 0 0 1 14-2l1 2 M4 17l1 2a8 8 0 0 0 14-2",
  download: "M12 3v12 m-5-5 5 5 5-5 M3 16v5h18v-5",
  quill: "M4 21 17 8 M7 16C3 6 12 2 22 2c0 10-4 19-14 15 M11 12h7 M14 9V5",
  arrowleft: "M20 12H4 m6-6-6 6 6 6",
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.arrow" />
  </svg>
</template>
