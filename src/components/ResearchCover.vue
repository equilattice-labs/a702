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
        <span class="status-dot"></span> OPEN BOUNTIES. SHARED PROOF.
      </div>
      <h2 id="hero-title">
        Funded signals.<br /><span>Verifiable proof.</span>
      </h2>
      <p>
        A crypto-native bounty board for proof that holds up.<br
          class="desktop-break"
        />
        Find a bounty, trace the sources, contribute what matters.
      </p>
      <div class="hero-actions">
        <button class="button primary" @click="$emit('explore')">
          Explore bounties<UiIcon name="arrow" :size="17" /></button
        ><button class="text-button" @click="$emit('create')">
          Post a bounty<UiIcon name="plus" :size="16" />
        </button>
      </div>
      <div class="hero-caption">
        <span class="small-cross" aria-hidden="true">+</span> OPEN BOUNTIES
        <span>/</span> TRACEABLE PROOF
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
              <path d="M26 0H0V26" stroke="#8BE9E0" stroke-opacity=".09" />
            </pattern>
            <linearGradient
              id="signal-fill"
              x1="130"
              y1="50"
              x2="370"
              y2="220"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#8BE9E0" stop-opacity=".13" />
              <stop offset="1" stop-color="#8BE9E0" stop-opacity="0" />
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
            stroke="#42566B"
            stroke-dasharray="3 6"
          />
          <ellipse
            cx="243"
            cy="126"
            rx="150"
            ry="68"
            transform="rotate(-23 243 126)"
            fill="url(#signal-fill)"
            stroke="#8BE9E0"
            stroke-opacity=".45"
          />
          <ellipse
            cx="243"
            cy="126"
            rx="150"
            ry="68"
            transform="rotate(23 243 126)"
            stroke="#8BE9E0"
            stroke-opacity=".26"
          />
          <ellipse
            cx="243"
            cy="126"
            rx="94"
            ry="108"
            transform="rotate(66 243 126)"
            stroke="#8BE9E0"
            stroke-opacity=".12"
          />
          <path
            d="m71 180 86-53 65 29 77-78 106-21"
            stroke="#8BE9E0"
            stroke-width="2"
          />
          <path
            d="m157 127 64-50 78 1-2 82-75-4"
            stroke="#8BE9E0"
            stroke-opacity=".2"
          />
          <circle
            cx="157"
            cy="127"
            r="6"
            fill="#0E1928"
            stroke="#8BE9E0"
            stroke-width="2"
          />
          <circle cx="222" cy="156" r="5" fill="#8BE9E0" />
          <circle cx="299" cy="78" r="6" fill="#C7F36B" />
          <circle
            cx="299"
            cy="78"
            r="15"
            stroke="#C7F36B"
            stroke-opacity=".22"
          />
          <circle cx="71" cy="180" r="4" fill="#8BE9E0" />
          <circle cx="405" cy="57" r="4" fill="#8BE9E0" />
          <path
            d="M232 126h22m-11-11v22"
            stroke="#8BE9E0"
            stroke-opacity=".5"
          />
          <g fill="#95A7BB" font-family="Consolas,monospace" font-size="9">
            <text x="23" y="228">BOUNTY</text>
            <text x="204" y="228">PROOF</text>
            <text x="382" y="228">ALLOCATION</text>
            <text x="313" y="72" fill="#C7F36B">VERIFIED</text>
          </g>
        </svg>
      </div>
      <div v-if="loading" class="featured-brief featured-status" role="status">
        <span class="spinner"></span>Reading the next signal&hellip;
      </div>
      <div v-else-if="error" class="featured-brief featured-status">
        <p>The mission board couldn&#8217;t load.</p>
        <button class="text-button" @click="$emit('retry')">
          Retry loading<UiIcon name="refresh" :size="16" />
        </button>
      </div>
      <button
        v-else-if="mission"
        class="featured-brief"
        aria-label="Open featured mission"
        @click="$emit('open', mission)"
      >
        <span class="featured-label">{{
          mission.sample
            ? "IN FOCUS / SAMPLE MISSION"
            : "IN FOCUS / BOUNTY MISSION"
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
