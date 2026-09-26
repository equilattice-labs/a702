<script setup>
import UiIcon from "./UiIcon.vue";
defineProps({
  mission: { type: Object, default: null },
  loading: Boolean,
  error: { type: String, default: "" },
});
defineEmits(["explore", "create", "open", "retry"]);
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="hero-kicker">
        <span class="status-dot"></span> OPEN BOUNTIES / LIVE POOLS
      </div>
      <h2 id="hero-title">
        Verify the signal.<br /><span>Fund the work.</span>
      </h2>
      <p>
        A Solana bounty market for work that ships.<br
          class="desktop-break"
        />
        Find a pool, add proof, and earn a creator-reviewed allocation.
      </p>
      <div class="hero-actions">
        <button class="button primary" @click="$emit('explore')">
          Explore board<UiIcon name="arrow" :size="17" /></button
        ><button class="text-button" @click="$emit('create')">
          Post bounty<UiIcon name="plus" :size="16" />
        </button>
      </div>
      <div class="hero-caption">
        <span class="small-cross" aria-hidden="true">+</span> OPEN POOLS
        <span>/</span> TRACEABLE ALLOCATIONS
      </div>
    </div>
    <div class="research-signal">
      <div class="signal-header">
        <span><i class="status-dot"></i> LIVE BOUNTY SIGNAL</span
        ><span>01 &mdash; &infin;</span>
      </div>
      <div class="signal-art" aria-hidden="true">
        <svg viewBox="0 0 480 256" fill="none">
          <defs>
            <pattern
              id="signal-grid"
              width="26"
              height="26"
              patternUnits="userSpaceOnUse"
            >
              <path d="M26 0H0V26" stroke="#61A7FF" stroke-opacity=".09" />
            </pattern>
            <linearGradient
              id="signal-fill"
              x1="130"
              y1="50"
              x2="370"
              y2="220"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#61A7FF" stop-opacity=".13" />
              <stop offset="1" stop-color="#61A7FF" stop-opacity="0" />
            </linearGradient>
          </defs>
          <rect
            x="10"
            y="4"
            width="460"
            height="246"
            fill="url(#signal-grid)"
          />
          <path
            d="M22 194H457M78 18V236M404 18V236"
            stroke="#344252"
            stroke-dasharray="3 6"
          />
          <ellipse
            cx="243"
            cy="126"
            rx="150"
            ry="68"
            transform="rotate(-23 243 126)"
            fill="url(#signal-fill)"
            stroke="#61A7FF"
            stroke-opacity=".45"
          />
          <ellipse
            cx="243"
            cy="126"
            rx="150"
            ry="68"
            transform="rotate(23 243 126)"
            stroke="#61A7FF"
            stroke-opacity=".26"
          />
          <ellipse
            cx="243"
            cy="126"
            rx="94"
            ry="108"
            transform="rotate(66 243 126)"
            stroke="#61A7FF"
            stroke-opacity=".12"
          />
          <path
            d="m71 180 86-53 65 29 77-78 106-21"
            stroke="#61A7FF"
            stroke-width="2"
          />
          <path
            d="m157 127 64-50 78 1-2 82-75-4"
            stroke="#61A7FF"
            stroke-opacity=".2"
          />
          <circle
            cx="157"
            cy="127"
            r="6"
            fill="#0E141B"
            stroke="#61A7FF"
            stroke-width="2"
          />
          <circle cx="222" cy="156" r="5" fill="#61A7FF" />
          <circle cx="299" cy="78" r="6" fill="#B8F36B" />
          <circle
            cx="299"
            cy="78"
            r="15"
            stroke="#B8F36B"
            stroke-opacity=".22"
          />
          <circle cx="71" cy="180" r="4" fill="#61A7FF" />
          <circle cx="405" cy="57" r="4" fill="#61A7FF" />
          <path
            d="M232 126h22m-11-11v22"
            stroke="#61A7FF"
            stroke-opacity=".5"
          />
          <g fill="#8E9AA8" font-family="Consolas,monospace" font-size="9">
            <text x="23" y="228">BOUNTY</text>
            <text x="204" y="228">PROOF</text>
            <text x="382" y="228">ALLOCATION</text>
            <text x="313" y="72" fill="#B8F36B">VERIFIED</text>
          </g>
        </svg>
      </div>
      <div v-if="loading" class="featured-brief featured-status" role="status">
        <span class="spinner"></span>Reading the next signal&hellip;
      </div>
      <div v-else-if="error" class="featured-brief featured-status">
        <p>The bounty board couldn&#8217;t load.</p>
        <button class="text-button" @click="$emit('retry')">
          Retry loading<UiIcon name="refresh" :size="16" />
        </button>
      </div>
      <button
        v-else-if="mission"
        class="featured-brief"
        aria-label="Open featured bounty"
        @click="$emit('open', mission)"
      >
        <span class="featured-label">{{
          mission.sample
            ? "IN FOCUS / TESTNET SAMPLE"
            : "IN FOCUS / OPEN BOUNTY"
        }}</span
        ><span class="featured-title">{{ mission.title }}</span
        ><span class="featured-arrow"><UiIcon name="arrow" :size="19" /></span>
      </button>
      <div v-else class="featured-brief featured-status">
        <p>Your signal could start the next connection.</p>
        <button class="text-button" @click="$emit('create')">
          Post the first bounty<UiIcon name="plus" :size="16" />
        </button>
      </div>
    </div>
  </section>
</template>
