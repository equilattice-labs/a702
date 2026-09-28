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
        <span class="status-dot"></span>
        SOLANA BOUNTY MARKET
        <span class="hero-network-tag">TESTNET PREVIEW</span>
      </div>
      <h2 id="hero-title">Back the work.<br /><span>Track the proof.</span></h2>
      <p>
        Browse focused builder bounties with a public brief, a clear reward pool,
        and creator-led review.
      </p>
      <div class="hero-actions">
        <button class="button primary" aria-label="Explore board" @click="$emit('explore')">
          Browse bounties<UiIcon name="arrow" :size="17" />
        </button>
        <button class="text-button" @click="$emit('create')">
          Create bounty<UiIcon name="plus" :size="16" />
        </button>
      </div>
      <div class="hero-proof-row" aria-label="Bounty workflow">
        <span><i class="status-dot"></i> PUBLIC BRIEF</span>
        <span><i class="status-dot"></i> SOURCE-LINKED WORK</span>
        <span><i class="status-dot"></i> CREATOR REVIEW</span>
      </div>
    </div>
    <div class="research-signal">
      <div class="signal-header">
        <span>FEATURED POOL</span>
        <span>ILLUSTRATIVE</span>
      </div>
      <div class="signal-art" aria-hidden="true">
        <div class="market-stack">
          <div class="market-stack-top"><span>PREVIEW REWARD</span><span>SOL</span></div>
          <strong>{{ mission?.sample ? mission.reward : mission?.availableReward || "0.12" }} <small>SOL</small></strong>
          <div class="market-facts">
            <p><span>NETWORK</span><b>SOLANA TESTNET</b></p>
            <p><span>REVIEW</span><b>CREATOR-LED</b></p>
          </div>
        </div>
      </div>
      <div v-if="loading" class="featured-brief featured-status" role="status">
        <span class="spinner"></span>Loading bounty feed...
      </div>
      <div v-else-if="error" class="featured-brief featured-status">
        <p>The bounty board could not load.</p>
        <button class="text-button" @click="$emit('retry')">
          Retry<UiIcon name="refresh" :size="16" />
        </button>
      </div>
      <button
        v-else-if="mission"
        class="featured-brief"
        aria-label="Open featured bounty"
        @click="$emit('open', mission)"
      >
        <span class="featured-label">{{ mission.sample ? "SAMPLE BOUNTY" : "OPEN BOUNTY" }}</span>
        <span class="featured-title">{{ mission.title }}</span>
        <span class="featured-meta">
          {{ mission.sample ? mission.reward + " SOL pool" : mission.availableReward + " " + (mission.rewardSymbol || "POOL") }}
          <UiIcon name="arrow" :size="18" />
        </span>
      </button>
      <div v-else class="featured-brief featured-status">
        <p>No open bounty yet.</p>
        <button class="text-button" @click="$emit('create')">
          Post the first<UiIcon name="plus" :size="16" />
        </button>
      </div>
    </div>
  </section>
</template>
